import crypto from "node:crypto";
import type { OpenClawConfig } from "../../config/config.js";
import type { TemplateContext } from "../templating.js";
import type { VerboseLevel } from "../thinking.js";
import type { GetReplyOptions } from "../types.js";
import type { FollowupRun } from "./queue.js";
import { resolveAgentModelFallbacksOverride } from "../../agents/agent-scope.js";
import { runWithModelFallback } from "../../agents/model-fallback.js";
import { isCliProvider } from "../../agents/model-selection.js";
import { runEmbeddedPiAgent } from "../../agents/pi-embedded.js";
import { resolveSandboxConfigForAgent, resolveSandboxRuntimeStatus } from "../../agents/sandbox.js";
import {
  resolveAgentIdFromSessionKey,
  type SessionEntry,
  updateSessionStoreEntry,
} from "../../config/sessions.js";
import { logVerbose } from "../../globals.js";
import { registerAgentRunContext } from "../../infra/agent-events.js";
import { buildThreadingToolContext, resolveEnforceFinalTag } from "./agent-runner-utils.js";
import { compactEmbeddedPiSession } from "../../agents/pi-embedded-runner/compact.js";
import {
  resolveMemoryFlushContextWindowTokens,
  resolveMemoryFlushSettings,
  shouldRunMemoryFlush,
  shouldRunProactiveCompaction,
} from "./memory-flush.js";
import { incrementCompactionCount } from "./session-updates.js";

export async function runMemoryFlushIfNeeded(params: {
  cfg: OpenClawConfig;
  followupRun: FollowupRun;
  sessionCtx: TemplateContext;
  opts?: GetReplyOptions;
  defaultModel: string;
  agentCfgContextTokens?: number;
  resolvedVerboseLevel: VerboseLevel;
  sessionEntry?: SessionEntry;
  sessionStore?: Record<string, SessionEntry>;
  sessionKey?: string;
  storePath?: string;
  isHeartbeat: boolean;
}): Promise<SessionEntry | undefined> {
  const memoryFlushSettings = resolveMemoryFlushSettings(params.cfg);
  if (!memoryFlushSettings) {
    return params.sessionEntry;
  }

  const memoryFlushWritable = (() => {
    if (!params.sessionKey) {
      return true;
    }
    const runtime = resolveSandboxRuntimeStatus({
      cfg: params.cfg,
      sessionKey: params.sessionKey,
    });
    if (!runtime.sandboxed) {
      return true;
    }
    const sandboxCfg = resolveSandboxConfigForAgent(params.cfg, runtime.agentId);
    return sandboxCfg.workspaceAccess === "rw";
  })();

  // Allow memory flush during heartbeats when context usage is critically high (>= 90%).
  // Normally heartbeats are excluded to save tokens, but at critical levels we must compact
  // proactively to avoid hitting the context limit and causing silent API failures.
  const allowHeartbeatFlush =
    params.isHeartbeat &&
    (() => {
      const entry =
        params.sessionEntry ??
        (params.sessionKey ? params.sessionStore?.[params.sessionKey] : undefined);
      const total = entry?.totalTokens ?? 0;
      const ctx = entry?.contextTokens ?? 0;
      return ctx > 0 && total > 0 && total / ctx >= 0.9;
    })();

  const shouldFlushMemory =
    memoryFlushSettings &&
    memoryFlushWritable &&
    (!params.isHeartbeat || allowHeartbeatFlush) &&
    !isCliProvider(params.followupRun.run.provider, params.cfg) &&
    shouldRunMemoryFlush({
      entry:
        params.sessionEntry ??
        (params.sessionKey ? params.sessionStore?.[params.sessionKey] : undefined),
      contextWindowTokens: resolveMemoryFlushContextWindowTokens({
        modelId: params.followupRun.run.model ?? params.defaultModel,
        agentCfgContextTokens: params.agentCfgContextTokens,
      }),
      reserveTokensFloor: memoryFlushSettings.reserveTokensFloor,
      softThresholdTokens: memoryFlushSettings.softThresholdTokens,
    });

  if (!shouldFlushMemory) {
    return params.sessionEntry;
  }

  let activeSessionEntry = params.sessionEntry;
  const activeSessionStore = params.sessionStore;
  const flushRunId = crypto.randomUUID();
  if (params.sessionKey) {
    registerAgentRunContext(flushRunId, {
      sessionKey: params.sessionKey,
      verboseLevel: params.resolvedVerboseLevel,
    });
  }
  let memoryCompactionCompleted = false;
  const flushSystemPrompt = [
    params.followupRun.run.extraSystemPrompt,
    memoryFlushSettings.systemPrompt,
  ]
    .filter(Boolean)
    .join("\n\n");
  try {
    await runWithModelFallback({
      cfg: params.followupRun.run.config,
      provider: params.followupRun.run.provider,
      model: params.followupRun.run.model,
      agentDir: params.followupRun.run.agentDir,
      fallbacksOverride: resolveAgentModelFallbacksOverride(
        params.followupRun.run.config,
        resolveAgentIdFromSessionKey(params.followupRun.run.sessionKey),
      ),
      run: (provider, model) => {
        const authProfileId =
          provider === params.followupRun.run.provider
            ? params.followupRun.run.authProfileId
            : undefined;
        return runEmbeddedPiAgent({
          sessionId: params.followupRun.run.sessionId,
          sessionKey: params.sessionKey,
          agentId: params.followupRun.run.agentId,
          messageProvider: params.sessionCtx.Provider?.trim().toLowerCase() || undefined,
          agentAccountId: params.sessionCtx.AccountId,
          messageTo: params.sessionCtx.OriginatingTo ?? params.sessionCtx.To,
          messageThreadId: params.sessionCtx.MessageThreadId ?? undefined,
          // Provider threading context for tool auto-injection
          ...buildThreadingToolContext({
            sessionCtx: params.sessionCtx,
            config: params.followupRun.run.config,
            hasRepliedRef: params.opts?.hasRepliedRef,
          }),
          senderId: params.sessionCtx.SenderId?.trim() || undefined,
          senderName: params.sessionCtx.SenderName?.trim() || undefined,
          senderUsername: params.sessionCtx.SenderUsername?.trim() || undefined,
          senderE164: params.sessionCtx.SenderE164?.trim() || undefined,
          sessionFile: params.followupRun.run.sessionFile,
          workspaceDir: params.followupRun.run.workspaceDir,
          agentDir: params.followupRun.run.agentDir,
          config: params.followupRun.run.config,
          skillsSnapshot: params.followupRun.run.skillsSnapshot,
          prompt: memoryFlushSettings.prompt,
          extraSystemPrompt: flushSystemPrompt,
          ownerNumbers: params.followupRun.run.ownerNumbers,
          enforceFinalTag: resolveEnforceFinalTag(params.followupRun.run, provider),
          provider,
          model,
          authProfileId,
          authProfileIdSource: authProfileId
            ? params.followupRun.run.authProfileIdSource
            : undefined,
          thinkLevel: params.followupRun.run.thinkLevel,
          verboseLevel: params.followupRun.run.verboseLevel,
          reasoningLevel: params.followupRun.run.reasoningLevel,
          execOverrides: params.followupRun.run.execOverrides,
          bashElevated: params.followupRun.run.bashElevated,
          timeoutMs: params.followupRun.run.timeoutMs,
          runId: flushRunId,
          onAgentEvent: (evt) => {
            if (evt.stream === "compaction") {
              const phase = typeof evt.data.phase === "string" ? evt.data.phase : "";
              const willRetry = Boolean(evt.data.willRetry);
              if (phase === "end" && !willRetry) {
                memoryCompactionCompleted = true;
              }
            }
          },
        });
      },
    });
    let memoryFlushCompactionCount =
      activeSessionEntry?.compactionCount ??
      (params.sessionKey ? activeSessionStore?.[params.sessionKey]?.compactionCount : 0) ??
      0;
    if (memoryCompactionCompleted) {
      const nextCount = await incrementCompactionCount({
        sessionEntry: activeSessionEntry,
        sessionStore: activeSessionStore,
        sessionKey: params.sessionKey,
        storePath: params.storePath,
      });
      if (typeof nextCount === "number") {
        memoryFlushCompactionCount = nextCount;
      }
    }
    if (params.storePath && params.sessionKey) {
      try {
        const updatedEntry = await updateSessionStoreEntry({
          storePath: params.storePath,
          sessionKey: params.sessionKey,
          update: async () => ({
            memoryFlushAt: Date.now(),
            memoryFlushCompactionCount,
          }),
        });
        if (updatedEntry) {
          activeSessionEntry = updatedEntry;
        }
      } catch (err) {
        logVerbose(`failed to persist memory flush metadata: ${String(err)}`);
      }
    }
  } catch (err) {
    logVerbose(`memory flush run failed: ${String(err)}`);
  }

  return activeSessionEntry;
}

/**
 * Proactive compaction: triggers compaction when context usage exceeds a threshold
 * (default 85%), BEFORE the main LLM call.  This prevents the deadlock where
 * rate-limit errors pre-empt context overflow detection and compaction never fires.
 *
 * Uses the lane-queued `compactEmbeddedPiSession` (safe — we are NOT inside a lane
 * at this call site).  Failure is non-fatal; the main LLM call proceeds regardless.
 */
export async function runProactiveCompactionIfNeeded(params: {
  cfg: OpenClawConfig;
  followupRun: FollowupRun;
  sessionEntry?: SessionEntry;
  sessionStore?: Record<string, SessionEntry>;
  sessionKey?: string;
  storePath?: string;
  defaultModel: string;
  agentCfgContextTokens?: number;
  isHeartbeat: boolean;
}): Promise<SessionEntry | undefined> {
  const entry =
    params.sessionEntry ??
    (params.sessionKey ? params.sessionStore?.[params.sessionKey] : undefined);

  const contextWindowTokens = resolveMemoryFlushContextWindowTokens({
    modelId: params.followupRun.run.model ?? params.defaultModel,
    agentCfgContextTokens: params.agentCfgContextTokens,
  });

  if (
    !shouldRunProactiveCompaction({
      entry,
      contextWindowTokens,
    })
  ) {
    return params.sessionEntry;
  }

  // Skip during heartbeats unless context is critically high (>= 95%).
  if (params.isHeartbeat) {
    const total = entry?.totalTokens ?? 0;
    const ctx = entry?.contextTokens ?? contextWindowTokens;
    if (ctx <= 0 || total / ctx < 0.95) {
      return params.sessionEntry;
    }
  }

  // Skip for CLI providers (they manage their own context).
  if (isCliProvider(params.followupRun.run.provider, params.cfg)) {
    return params.sessionEntry;
  }

  const run = params.followupRun.run;
  logVerbose(
    `proactive compaction: context at ${entry?.totalTokens}/${entry?.contextTokens ?? contextWindowTokens} tokens — attempting compaction`,
  );

  try {
    const compactResult = await compactEmbeddedPiSession({
      sessionId: run.sessionId,
      sessionKey: run.sessionKey,
      messageChannel: run.messageProvider,
      messageProvider: run.messageProvider,
      agentAccountId: run.agentAccountId,
      groupId: run.groupId,
      groupChannel: run.groupChannel,
      groupSpace: run.groupSpace,
      sessionFile: run.sessionFile,
      workspaceDir: run.workspaceDir,
      agentDir: run.agentDir,
      config: run.config,
      skillsSnapshot: run.skillsSnapshot,
      provider: run.provider,
      model: run.model,
      thinkLevel: run.thinkLevel,
      reasoningLevel: run.reasoningLevel,
      bashElevated: run.bashElevated,
      extraSystemPrompt: run.extraSystemPrompt,
      ownerNumbers: run.ownerNumbers,
    });

    if (compactResult.compacted) {
      logVerbose("proactive compaction succeeded");
      const nextCount = await incrementCompactionCount({
        sessionEntry: params.sessionEntry,
        sessionStore: params.sessionStore,
        sessionKey: params.sessionKey,
        storePath: params.storePath,
      });

      // Persist updated token counts from compaction.
      // Reset totalTokens so the downstream hard guard (>= 98% capacity)
      // does not block the next LLM call with stale pre-compaction values.
      if (params.storePath && params.sessionKey) {
        try {
          const updatedEntry = await updateSessionStoreEntry({
            storePath: params.storePath,
            sessionKey: params.sessionKey,
            update: async (existing) => ({
              compactionCount: nextCount ?? (existing.compactionCount ?? 0) + 1,
              totalTokens: compactResult.result?.tokensAfter ?? 0,
            }),
          });
          if (updatedEntry) {
            return updatedEntry;
          }
        } catch (err) {
          logVerbose(`failed to persist proactive compaction metadata: ${String(err)}`);
        }
      }
    } else {
      logVerbose(`proactive compaction skipped: ${compactResult.reason ?? "nothing to compact"}`);
    }
  } catch (err) {
    logVerbose(`proactive compaction failed: ${String(err)}`);
  }

  return params.sessionEntry;
}
