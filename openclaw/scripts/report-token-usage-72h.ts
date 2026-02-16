import { resolveDefaultAgentId } from "../src/agents/agent-scope.js";
import { isCacheTtlEligibleProvider } from "../src/agents/pi-embedded-runner/cache-ttl.js";
import { loadConfig } from "../src/config/config.js";
import { loadSessionStore, resolveStorePath } from "../src/config/sessions.js";
import {
  discoverAllSessions,
  loadCostUsageSummary,
  loadSessionCostSummary,
} from "../src/infra/session-cost-usage.js";

const WINDOW_HOURS = 72;

type SessionRow = {
  sessionId: string;
  totalTokens: number;
  billableTokens: number;
  input: number;
  output: number;
  cacheRead: number;
  totalCost: number;
};

function fmtInt(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function printSection(title: string): void {
  console.log("");
  console.log(`=== ${title} ===`);
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  const endMs = Date.now();
  const startMs = endMs - WINDOW_HOURS * 60 * 60 * 1000;
  const summary = await loadCostUsageSummary({ startMs, endMs, config: cfg });
  const sessions = await discoverAllSessions({ startMs, endMs });

  const sessionRows: SessionRow[] = [];
  const toolCounts = new Map<string, number>();
  const providerUsage = new Map<
    string,
    { totalTokens: number; billableTokens: number; cacheTtlEligible: boolean }
  >();

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

  const topSessionsByBillable = sessionRows
    .toSorted((a, b) => b.billableTokens - a.billableTokens)
    .slice(0, 10);
  const topTools = Array.from(toolCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .toSorted((a, b) => b.count - a.count)
    .slice(0, 10);
  const providerRows = Array.from(providerUsage.entries())
    .map(([provider, row]) => ({ provider, ...row }))
    .toSorted((a, b) => b.billableTokens - a.billableTokens);

  const defaultStorePath = resolveStorePath(cfg.session?.store, {
    agentId: resolveDefaultAgentId(cfg),
  });
  const defaultStore = loadSessionStore(defaultStorePath);
  const repeatPromptEntries = Object.entries(defaultStore)
    .map(([sessionKey, entry]) => ({
      sessionKey,
      repeats: entry.heartbeatPromptHashRepeats ?? 0,
      overBudgetStreak: entry.heartbeatOverBudgetStreak ?? 0,
      resetReason: entry.heartbeatResetReason,
    }))
    .filter((entry) => entry.repeats >= 3 || entry.overBudgetStreak >= 2)
    .toSorted((a, b) => b.repeats - a.repeats)
    .slice(0, 10);

  console.log(
    `Token usage report window: last ${WINDOW_HOURS}h (${new Date(startMs).toISOString()} -> ${new Date(endMs).toISOString()})`,
  );
  printSection("Totals");
  console.log(`input: ${fmtInt(summary.totals.input)}`);
  console.log(`output: ${fmtInt(summary.totals.output)}`);
  console.log(`cacheRead: ${fmtInt(summary.totals.cacheRead)}`);
  console.log(`totalTokens: ${fmtInt(summary.totals.totalTokens)}`);
  console.log(`billable(input+output): ${fmtInt(summary.totals.input + summary.totals.output)}`);

  printSection("Top Sessions (Billable Tokens)");
  for (const row of topSessionsByBillable) {
    console.log(
      `${row.sessionId}: billable=${fmtInt(row.billableTokens)} total=${fmtInt(row.totalTokens)} input=${fmtInt(row.input)} output=${fmtInt(row.output)} cacheRead=${fmtInt(row.cacheRead)}`,
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
  if (repeatPromptEntries.length === 0) {
    console.log("none");
  } else {
    for (const row of repeatPromptEntries) {
      console.log(
        `${row.sessionKey}: repeats=${row.repeats} overBudgetStreak=${row.overBudgetStreak} resetReason=${row.resetReason ?? "-"}`,
      );
    }
  }
}

await main();
