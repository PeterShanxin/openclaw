import { beforeEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import { buildTestCtx } from "./test-ctx.js";
import {
  resetAutomatedMentionGuard,
  shouldSkipAutomatedMentionCascade,
} from "./automated-mention-guard.js";

const defaultConfig = {} as OpenClawConfig;

function buildBotCtx(overrides: Record<string, unknown> = {}) {
  return buildTestCtx({
    Surface: "discord",
    ChatType: "channel",
    To: "channel:c1",
    OriginatingTo: "channel:c1",
    SessionKey: "agent:pm:main",
    SenderId: "nova-bot",
    SenderKind: "bot",
    WasMentioned: true,
    ...overrides,
  });
}

describe("shouldSkipAutomatedMentionCascade", () => {
  beforeEach(() => {
    resetAutomatedMentionGuard();
  });

  it("allows the first bot mention and skips the second within the window", () => {
    expect(
      shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m1" }), defaultConfig, {
        now: 100,
      }),
    ).toBe(false);
    expect(
      shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m2" }), defaultConfig, {
        now: 200,
      }),
    ).toBe(true);
  });

  it("continues skipping repeated bot mentions until the window expires", () => {
    shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m1" }), defaultConfig, {
      now: 100,
    });
    expect(
      shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m2" }), defaultConfig, {
        now: 200,
      }),
    ).toBe(true);
    expect(
      shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m3" }), defaultConfig, {
        now: 300,
      }),
    ).toBe(true);
    expect(
      shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m4" }), defaultConfig, {
        now: 15_400,
      }),
    ).toBe(false);
  });

  it("resets when a human message intervenes", () => {
    shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m1" }), defaultConfig, {
      now: 100,
    });
    expect(
      shouldSkipAutomatedMentionCascade(
        buildTestCtx({
          Surface: "discord",
          ChatType: "channel",
          To: "channel:c1",
          OriginatingTo: "channel:c1",
          SessionKey: "agent:pm:main",
          SenderId: "peter",
          SenderKind: "human",
          WasMentioned: false,
          MessageSid: "human-1",
        }),
        defaultConfig,
        { now: 200 },
      ),
    ).toBe(false);
    expect(
      shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m2" }), defaultConfig, {
        now: 300,
      }),
    ).toBe(false);
  });

  it("does not suppress a different bot sender", () => {
    shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m1" }), defaultConfig, {
      now: 100,
    });
    expect(
      shouldSkipAutomatedMentionCascade(
        buildBotCtx({
          MessageSid: "m2",
          SenderId: "reviewer-bot",
          SenderUsername: "reviewer",
        }),
        defaultConfig,
        { now: 200 },
      ),
    ).toBe(false);
  });

  it("does not arm on non-mentioned bot messages", () => {
    expect(
      shouldSkipAutomatedMentionCascade(
        buildBotCtx({
          MessageSid: "m1",
          WasMentioned: false,
        }),
        defaultConfig,
        { now: 100 },
      ),
    ).toBe(false);
    expect(
      shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m2" }), defaultConfig, {
        now: 200,
      }),
    ).toBe(false);
  });

  it("fails open for direct chats, unknown sender kind, and missing sender keys", () => {
    expect(
      shouldSkipAutomatedMentionCascade(
        buildBotCtx({ ChatType: "direct", MessageSid: "direct-1" }),
        defaultConfig,
        { now: 100 },
      ),
    ).toBe(false);
    expect(
      shouldSkipAutomatedMentionCascade(
        buildBotCtx({
          MessageSid: "unknown-kind",
          SenderKind: undefined,
        }),
        defaultConfig,
        { now: 200 },
      ),
    ).toBe(false);
    expect(
      shouldSkipAutomatedMentionCascade(
        buildBotCtx({
          MessageSid: "missing-sender",
          SenderId: undefined,
          SenderUsername: undefined,
          SenderTag: undefined,
          SenderName: undefined,
        }),
        defaultConfig,
        { now: 300 },
      ),
    ).toBe(false);
  });

  it("does not let system messages reset the bot chain", () => {
    shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m1" }), defaultConfig, {
      now: 100,
    });
    expect(
      shouldSkipAutomatedMentionCascade(
        buildTestCtx({
          Surface: "discord",
          ChatType: "channel",
          To: "channel:c1",
          OriginatingTo: "channel:c1",
          SessionKey: "agent:pm:main",
          SenderId: "discord-system",
          SenderKind: "system",
          WasMentioned: false,
          MessageSid: "system-1",
        }),
        defaultConfig,
        { now: 150 },
      ),
    ).toBe(false);
    expect(
      shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m2" }), defaultConfig, {
        now: 200,
      }),
    ).toBe(true);
  });

  it("respects explicit config disablement", () => {
    const disabledConfig = {
      messages: {
        groupChat: {
          automatedMentionGuard: {
            enabled: false,
          },
        },
      },
    } as OpenClawConfig;

    expect(
      shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m1" }), disabledConfig, {
        now: 100,
      }),
    ).toBe(false);
    expect(
      shouldSkipAutomatedMentionCascade(buildBotCtx({ MessageSid: "m2" }), disabledConfig, {
        now: 200,
      }),
    ).toBe(false);
  });
});
