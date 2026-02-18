import fs from "node:fs/promises";
import path from "node:path";
import { listAgentIds, resolveDefaultAgentId } from "../src/agents/agent-scope.js";
import { isCacheTtlEligibleProvider } from "../src/agents/pi-embedded-runner/cache-ttl.js";
import { loadConfig } from "../src/config/config.js";
import { resolveStateDir } from "../src/config/paths.js";
import { loadSessionStore, resolveStorePath } from "../src/config/sessions.js";
import {
  discoverAllSessions,
  loadCostUsageSummary,
  loadSessionCostSummary,
} from "../src/infra/session-cost-usage.js";
import { normalizeAgentId } from "../src/routing/session-key.js";

const WINDOW_HOURS = 72;
const MAX_ROWS = 10;

type SessionRow = {
  agentId: string;
  sessionId: string;
  totalTokens: number;
  billableTokens: number;
  input: number;
  output: number;
  cacheRead: number;
  totalCost: number;
};

type UsageTotals = {
  input: number;
  output: number;
  cacheRead: number;
  totalTokens: number;
};

type CliOptions = {
  allAgents: boolean;
  agentIds: string[];
};

function fmtInt(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function printSection(title: string): void {
  console.log("");
  console.log(`=== ${title} ===`);
}

function usage(): void {
  console.log("Usage: pnpm usage:report:72h [--all-agents] [--agent <id> ...]");
  console.log("");
  console.log("Options:");
  console.log("  --all-agents      Report across every discovered agent (default).");
  console.log("  --agent <id>      Restrict report to one or more specific agent IDs.");
  console.log("  --help            Show this help text.");
}

function parseCliOptions(argv: string[]): CliOptions {
  const requestedAgentIds: string[] = [];
  let allAgents = true;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    if (arg === "--all-agents") {
      allAgents = true;
      continue;
    }
    if (arg === "--agent") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("--agent requires a value");
      }
      allAgents = false;
      requestedAgentIds.push(normalizeAgentId(next));
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return {
    allAgents,
    agentIds: Array.from(new Set(requestedAgentIds)),
  };
}

async function discoverAgentIdsFromState(): Promise<string[]> {
  const root = resolveStateDir();
  const agentsDir = path.join(root, "agents");
  const entries = await fs.readdir(agentsDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => normalizeAgentId(entry.name))
    .filter(Boolean);
}

function resolveTargetAgentIds(params: {
  options: CliOptions;
  configuredAgentIds: string[];
  stateAgentIds: string[];
  defaultAgentId: string;
}): string[] {
  if (!params.options.allAgents) {
    return params.options.agentIds.length > 0 ? params.options.agentIds : [params.defaultAgentId];
  }
  return Array.from(
    new Set([...params.configuredAgentIds, ...params.stateAgentIds, params.defaultAgentId]),
  );
}

function mergeTotals(target: UsageTotals, source: Partial<UsageTotals>): void {
  target.input += source.input ?? 0;
  target.output += source.output ?? 0;
  target.cacheRead += source.cacheRead ?? 0;
  target.totalTokens += source.totalTokens ?? 0;
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const cfg = loadConfig();
  const defaultAgentId = resolveDefaultAgentId(cfg);
  const configuredAgentIds = listAgentIds(cfg);
  const stateAgentIds = await discoverAgentIdsFromState();
  const targetAgentIds = resolveTargetAgentIds({
    options,
    configuredAgentIds,
    stateAgentIds,
    defaultAgentId,
  });

  const endMs = Date.now();
  const startMs = endMs - WINDOW_HOURS * 60 * 60 * 1000;
  const totals: UsageTotals = {
    input: 0,
    output: 0,
    cacheRead: 0,
    totalTokens: 0,
  };

  const sessionRows: SessionRow[] = [];
  const toolCounts = new Map<string, number>();
  const providerUsage = new Map<
    string,
    { totalTokens: number; billableTokens: number; cacheTtlEligible: boolean }
  >();

  const repeatPromptEntries: Array<{
    agentId: string;
    sessionKey: string;
    repeats: number;
    overBudgetStreak: number;
    resetReason?: string;
  }> = [];

  for (const agentId of targetAgentIds) {
    const summary = await loadCostUsageSummary({ startMs, endMs, config: cfg, agentId });
    mergeTotals(totals, summary.totals);

    const sessions = await discoverAllSessions({ startMs, endMs, agentId });
    for (const discovered of sessions) {
      const usage = await loadSessionCostSummary({
        sessionFile: discovered.sessionFile,
        config: cfg,
        startMs,
        endMs,
      });
      if (!usage || usage.totalTokens <= 0) {
        continue;
      }

      const input = usage.input ?? 0;
      const output = usage.output ?? 0;
      const cacheRead = usage.cacheRead ?? 0;
      const billableTokens = input + output;
      sessionRows.push({
        agentId,
        sessionId: discovered.sessionId,
        totalTokens: usage.totalTokens,
        billableTokens,
        input,
        output,
        cacheRead,
        totalCost: usage.totalCost ?? 0,
      });

      for (const tool of usage.toolUsage?.tools ?? []) {
        toolCounts.set(tool.name, (toolCounts.get(tool.name) ?? 0) + tool.count);
      }

      for (const modelUsage of usage.modelUsage ?? []) {
        const provider = modelUsage.provider ?? "unknown";
        const row = providerUsage.get(provider) ?? {
          totalTokens: 0,
          billableTokens: 0,
          cacheTtlEligible: isCacheTtlEligibleProvider(
            provider,
            modelUsage.model ?? "",
            cfg.agents?.defaults?.contextPruning,
          ),
        };
        row.totalTokens += modelUsage.totals.totalTokens;
        row.billableTokens += (modelUsage.totals.input ?? 0) + (modelUsage.totals.output ?? 0);
        row.cacheTtlEligible = row.cacheTtlEligible
          ? isCacheTtlEligibleProvider(
              provider,
              modelUsage.model ?? "",
              cfg.agents?.defaults?.contextPruning,
            )
          : false;
        providerUsage.set(provider, row);
      }
    }

    const storePath = resolveStorePath(cfg.session?.store, { agentId });
    const store = loadSessionStore(storePath);
    repeatPromptEntries.push(
      ...Object.entries(store)
        .map(([sessionKey, entry]) => ({
          agentId,
          sessionKey,
          repeats: entry.heartbeatPromptHashRepeats ?? 0,
          overBudgetStreak: entry.heartbeatOverBudgetStreak ?? 0,
          resetReason: entry.heartbeatResetReason,
        }))
        .filter((entry) => entry.repeats >= 3 || entry.overBudgetStreak >= 2),
    );
  }

  const topSessionsByBillable = sessionRows
    .toSorted((a, b) => b.billableTokens - a.billableTokens)
    .slice(0, MAX_ROWS);
  const topTools = Array.from(toolCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .toSorted((a, b) => b.count - a.count)
    .slice(0, MAX_ROWS);
  const providerRows = Array.from(providerUsage.entries())
    .map(([provider, row]) => ({ provider, ...row }))
    .toSorted((a, b) => b.billableTokens - a.billableTokens);
  const topRepeatPromptEntries = repeatPromptEntries
    .toSorted((a, b) => b.repeats - a.repeats)
    .slice(0, MAX_ROWS);

  console.log(
    `Token usage report window: last ${WINDOW_HOURS}h (${new Date(startMs).toISOString()} -> ${new Date(endMs).toISOString()})`,
  );
  console.log(`Agents: ${targetAgentIds.join(", ")}`);
  printSection("Totals");
  console.log(`input: ${fmtInt(totals.input)}`);
  console.log(`output: ${fmtInt(totals.output)}`);
  console.log(`cacheRead: ${fmtInt(totals.cacheRead)}`);
  console.log(`totalTokens: ${fmtInt(totals.totalTokens)}`);
  console.log(`billable(input+output): ${fmtInt(totals.input + totals.output)}`);

  printSection("Top Sessions (Billable Tokens)");
  for (const row of topSessionsByBillable) {
    console.log(
      `${row.agentId}/${row.sessionId}: billable=${fmtInt(row.billableTokens)} total=${fmtInt(row.totalTokens)} input=${fmtInt(row.input)} output=${fmtInt(row.output)} cacheRead=${fmtInt(row.cacheRead)}`,
    );
  }

  printSection("Top Tools (Associated Calls)");
  for (const row of topTools) {
    console.log(`${row.name}: ${fmtInt(row.count)} calls`);
  }

  printSection("Provider Breakdown");
  for (const row of providerRows) {
    console.log(
      `${row.provider}: billable=${fmtInt(row.billableTokens)} total=${fmtInt(row.totalTokens)} cacheTtlEligible=${row.cacheTtlEligible ? "yes" : "no"}`,
    );
  }

  printSection("Oversized Repeat Signals (Current Session Store)");
  if (topRepeatPromptEntries.length === 0) {
    console.log("none");
  } else {
    for (const row of topRepeatPromptEntries) {
      console.log(
        `${row.agentId}/${row.sessionKey}: repeats=${row.repeats} overBudgetStreak=${row.overBudgetStreak} resetReason=${row.resetReason ?? "-"}`,
      );
    }
  }
}

await main();
