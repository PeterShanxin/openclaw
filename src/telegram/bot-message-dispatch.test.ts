import type { Bot } from "grammy";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createTelegramDraftStream = vi.hoisted(() => vi.fn());
const dispatchReplyWithBufferedBlockDispatcher = vi.hoisted(() => vi.fn());
const deliverReplies = vi.hoisted(() => vi.fn());

vi.mock("./draft-stream.js", () => ({
  createTelegramDraftStream,
}));

vi.mock("../auto-reply/reply/provider-dispatcher.js", () => ({
  dispatchReplyWithBufferedBlockDispatcher,
}));

vi.mock("./bot/delivery.js", () => ({
  deliverReplies,
}));

vi.mock("./sticker-cache.js", () => ({
  cacheSticker: vi.fn(),
  describeStickerImage: vi.fn(),
}));

import { dispatchTelegramMessage } from "./bot-message-dispatch.js";

describe("dispatchTelegramMessage draft streaming", () => {
  const createContext = () => ({
    ctxPayload: {},
    primaryCtx: { message: { chat: { id: 123, type: "private" } } },
    msg: {
      chat: { id: 123, type: "private" },
      message_id: 456,
      message_thread_id: 777,
    },
    chatId: 123,
    isGroup: false,
    resolvedThreadId: undefined,
    replyThreadId: 777,
    threadSpec: { id: 777, scope: "dm" as const },
    historyKey: undefined,
    historyLimit: 0,
    groupHistories: new Map(),
    route: { agentId: "default", accountId: "default" },
    skillFilter: undefined,
    sendTyping: vi.fn(),
    sendRecordVoice: vi.fn(),
    ackReactionPromise: null,
    reactionApi: null,
    removeAckAfterReply: false,
  });

  const runtime = {
    log: vi.fn(),
    error: vi.fn(),
    exit: () => {
      throw new Error("exit");
    },
  };

  const bot = { api: { sendMessageDraft: vi.fn() } } as unknown as Bot;

  beforeEach(() => {
    createTelegramDraftStream.mockReset();
    dispatchReplyWithBufferedBlockDispatcher.mockReset();
    deliverReplies.mockReset();
  });

  it("streams drafts in private threads and forwards thread id", async () => {
    const draftStream = {
      update: vi.fn(),
      flush: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };
    createTelegramDraftStream.mockReturnValue(draftStream);
    dispatchReplyWithBufferedBlockDispatcher.mockImplementation(
      async ({ dispatcherOptions, replyOptions }) => {
        await replyOptions?.onPartialReply?.({ text: "Hello" });
        await dispatcherOptions.deliver({ text: "Hello" }, { kind: "final" });
        return { queuedFinal: true };
      },
    );
    deliverReplies.mockResolvedValue({ delivered: true });

    const resolveBotTopicsEnabled = vi.fn().mockResolvedValue(true);
    const context = createContext();

    await dispatchTelegramMessage({
      context,
      bot,
      cfg: {},
      runtime,
      replyToMode: "first",
      streamMode: "partial",
      textLimit: 4096,
      telegramCfg: {},
      opts: { token: "token" },
      resolveBotTopicsEnabled,
    });

    expect(resolveBotTopicsEnabled).toHaveBeenCalledWith(context.primaryCtx);
    expect(createTelegramDraftStream).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 123,
        thread: { id: 777, scope: "dm" },
      }),
    );
    expect(draftStream.update).toHaveBeenCalledWith("Hello");
    expect(deliverReplies).toHaveBeenCalledWith(
      expect.objectContaining({
        thread: { id: 777, scope: "dm" },
      }),
    );
  });

  it("coalesces tool updates into one message when streamMode is off", async () => {
    dispatchReplyWithBufferedBlockDispatcher.mockImplementation(async ({ dispatcherOptions }) => {
      await dispatcherOptions.deliver({ text: "🛠️ Exec: `ls`" }, { kind: "tool" });
      await dispatcherOptions.deliver({ text: "🛠️ Exec: `ls`" }, { kind: "tool" });
      await dispatcherOptions.deliver({ text: "📖 Read: `/tmp/file`" }, { kind: "tool" });
      await dispatcherOptions.deliver({ text: "Final answer" }, { kind: "final" });
      return { queuedFinal: true };
    });
    deliverReplies.mockResolvedValue({ delivered: true });
    const context = createContext();

    await dispatchTelegramMessage({
      context,
      bot,
      cfg: {},
      runtime,
      replyToMode: "first",
      streamMode: "off",
      textLimit: 4096,
      telegramCfg: {},
      opts: { token: "token" },
      resolveBotTopicsEnabled: vi.fn().mockResolvedValue(false),
    });

    expect(deliverReplies).toHaveBeenCalledTimes(2);
    const coalesced = deliverReplies.mock.calls[0]?.[0]?.replies?.[0]?.text ?? "";
    expect(coalesced).toContain("🛠️ Exec: `ls`");
    expect(coalesced).toContain("📖 Read: `/tmp/file`");
    expect(coalesced.match(/🛠️ Exec: `ls`/g)?.length ?? 0).toBe(1);
    expect(deliverReplies.mock.calls[1]?.[0]?.replies?.[0]?.text).toBe("Final answer");
  });

  it("suppresses all tool updates when agent silentTools is enabled", async () => {
    dispatchReplyWithBufferedBlockDispatcher.mockImplementation(async ({ dispatcherOptions }) => {
      await dispatcherOptions.deliver({ text: "🛠️ Exec: `ls`" }, { kind: "tool" });
      await dispatcherOptions.deliver({ text: "📖 Read: `/tmp/file`" }, { kind: "tool" });
      await dispatcherOptions.deliver({ text: "Final answer" }, { kind: "final" });
      return { queuedFinal: true };
    });
    deliverReplies.mockResolvedValue({ delivered: true });
    const context = createContext();

    await dispatchTelegramMessage({
      context,
      bot,
      cfg: {
        agents: {
          list: [{ id: "default", silentTools: true }],
        },
      },
      runtime,
      replyToMode: "first",
      streamMode: "off",
      textLimit: 4096,
      telegramCfg: {},
      opts: { token: "token" },
      resolveBotTopicsEnabled: vi.fn().mockResolvedValue(false),
    });

    expect(deliverReplies).toHaveBeenCalledTimes(1);
    expect(deliverReplies.mock.calls[0]?.[0]?.replies?.[0]?.text).toBe("Final answer");
  });

  it("keeps tool updates uncoalesced in partial mode", async () => {
    dispatchReplyWithBufferedBlockDispatcher.mockImplementation(async ({ dispatcherOptions }) => {
      await dispatcherOptions.deliver({ text: "🛠️ Exec: `ls`" }, { kind: "tool" });
      await dispatcherOptions.deliver({ text: "📖 Read: `/tmp/file`" }, { kind: "tool" });
      await dispatcherOptions.deliver({ text: "Final answer" }, { kind: "final" });
      return { queuedFinal: true };
    });
    deliverReplies.mockResolvedValue({ delivered: true });
    const context = createContext();

    await dispatchTelegramMessage({
      context,
      bot,
      cfg: {},
      runtime,
      replyToMode: "first",
      streamMode: "partial",
      textLimit: 4096,
      telegramCfg: {},
      opts: { token: "token" },
      resolveBotTopicsEnabled: vi.fn().mockResolvedValue(false),
    });

    expect(deliverReplies).toHaveBeenCalledTimes(3);
    expect(deliverReplies.mock.calls[0]?.[0]?.replies?.[0]?.text).toBe("🛠️ Exec: `ls`");
    expect(deliverReplies.mock.calls[1]?.[0]?.replies?.[0]?.text).toBe("📖 Read: `/tmp/file`");
    expect(deliverReplies.mock.calls[2]?.[0]?.replies?.[0]?.text).toBe("Final answer");
  });
});
