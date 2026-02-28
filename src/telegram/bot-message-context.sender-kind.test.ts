import { describe, expect, it } from "vitest";
import { buildTelegramMessageContextForTest } from "./bot-message-context.test-harness.js";

describe("buildTelegramMessageContext sender kind", () => {
  it("marks bot-authored inbound messages with SenderKind=bot", async () => {
    const ctx = await buildTelegramMessageContextForTest({
      message: {
        message_id: 1,
        chat: { id: -1001234567890, type: "supergroup", title: "Test Group" },
        date: 1700000000,
        text: "hello bot",
        from: { id: 42, first_name: "Nova", is_bot: true },
      },
      options: { forceWasMentioned: true },
      cfg: {
        agents: { defaults: { model: "anthropic/claude-opus-4-5", workspace: "/tmp/openclaw" } },
        channels: { telegram: {} },
        messages: { groupChat: { mentionPatterns: ["\\bbot\\b"] } },
      },
      resolveGroupActivation: () => true,
      resolveGroupRequireMention: () => true,
      resolveTelegramGroupConfig: () => ({
        groupConfig: { requireMention: true },
        topicConfig: undefined,
      }),
    });

    expect(ctx).not.toBeNull();
    expect(ctx?.ctxPayload.SenderKind).toBe("bot");
  });
});
