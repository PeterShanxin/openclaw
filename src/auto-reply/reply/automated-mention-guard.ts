import type { OpenClawConfig } from "../../config/config.js";
import { logVerbose } from "../../globals.js";
import type { MsgContext, SenderKind } from "../templating.js";

const DEFAULT_AUTOMATED_MENTION_GUARD_WINDOW_MS = 15_000;

type AutomatedMentionState = {
  senderKey: string;
  senderKind: SenderKind;
  wasMentioned: boolean;
  timestampMs: number;
};

const automatedMentionState = new Map<string, AutomatedMentionState>();

function resolveAutomatedMentionGuardConfig(cfg: OpenClawConfig): {
  enabled: boolean;
  windowMs: number;
} {
  return {
    enabled: cfg.messages?.groupChat?.automatedMentionGuard?.enabled ?? true,
    windowMs:
      cfg.messages?.groupChat?.automatedMentionGuard?.windowMs ??
      DEFAULT_AUTOMATED_MENTION_GUARD_WINDOW_MS,
  };
}

function resolveConversationKey(ctx: MsgContext): string {
  return (ctx.OriginatingTo ?? ctx.To ?? ctx.From ?? "").trim();
}

function resolveGuardStateKey(ctx: MsgContext): string | null {
  const surface = (ctx.OriginatingChannel ?? ctx.Surface ?? ctx.Provider ?? "").trim().toLowerCase();
  const conversationKey = resolveConversationKey(ctx);
  if (!surface || !conversationKey) {
    return null;
  }
  const accountId = ctx.AccountId?.trim() ?? "";
  const sessionKey = ctx.SessionKey?.trim() ?? "";
  return [surface, accountId, sessionKey, conversationKey].join("|");
}

function resolveSenderKey(ctx: MsgContext): string | null {
  for (const candidate of [ctx.SenderId, ctx.SenderUsername, ctx.SenderTag, ctx.SenderName]) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

export function shouldSkipAutomatedMentionCascade(
  ctx: MsgContext,
  cfg: OpenClawConfig,
  opts?: { now?: number },
): boolean {
  const { enabled, windowMs } = resolveAutomatedMentionGuardConfig(cfg);
  if (!enabled || ctx.ChatType?.trim().toLowerCase() === "direct") {
    return false;
  }

  const senderKind = ctx.SenderKind;
  const stateKey = resolveGuardStateKey(ctx);
  const senderKey = resolveSenderKey(ctx);
  const now = opts?.now ?? Date.now();

  if (senderKind === "human") {
    if (stateKey && senderKey) {
      automatedMentionState.set(stateKey, {
        senderKey,
        senderKind,
        wasMentioned: ctx.WasMentioned === true,
        timestampMs: now,
      });
    }
    return false;
  }

  if (senderKind !== "bot" || !stateKey || !senderKey) {
    return false;
  }

  const wasMentioned = ctx.WasMentioned === true;
  const previous = automatedMentionState.get(stateKey);
  const shouldSkip = Boolean(
    wasMentioned &&
      previous &&
      previous.senderKind === "bot" &&
      previous.wasMentioned &&
      previous.senderKey === senderKey &&
      now - previous.timestampMs < windowMs,
  );

  automatedMentionState.set(stateKey, {
    senderKey,
    senderKind,
    wasMentioned,
    timestampMs: now,
  });

  if (shouldSkip) {
    logVerbose(
      `automated mention guard: skipped surface=${ctx.OriginatingChannel ?? ctx.Surface ?? ctx.Provider ?? "unknown"} account=${ctx.AccountId ?? ""} session=${ctx.SessionKey ?? ""} conversation=${resolveConversationKey(ctx)} sender=${senderKey} kind=${senderKind} message=${ctx.MessageSid ?? ""} windowMs=${windowMs}`,
    );
  }

  return shouldSkip;
}

export function resetAutomatedMentionGuard(): void {
  automatedMentionState.clear();
}
