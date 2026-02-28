import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { ImageContent } from "@mariozechner/pi-ai";
import { describe, expect, it } from "vitest";
<<<<<<< HEAD:src/agents/pi-embedded-runner/run/attempt.e2e.test.ts
import {
  injectHistoryImagesIntoMessages,
  snapshotMessagesAfterToolResultFlush,
} from "./attempt.js";
=======
import { PRUNED_HISTORY_IMAGE_MARKER, pruneProcessedHistoryImages } from "./history-image-prune.js";
>>>>>>> origin/chore/openclaw-v2026.2.26:src/agents/pi-embedded-runner/run/history-image-prune.test.ts

describe("pruneProcessedHistoryImages", () => {
  const image: ImageContent = { type: "image", data: "abc", mimeType: "image/png" };

  it("prunes image blocks from user messages that already have assistant replies", () => {
    const messages: AgentMessage[] = [
      {
        role: "user",
        content: [{ type: "text", text: "See /tmp/photo.png" }, { ...image }],
      } as AgentMessage,
      {
        role: "assistant",
        content: "got it",
      } as unknown as AgentMessage,
    ];

    const didMutate = pruneProcessedHistoryImages(messages);

    expect(didMutate).toBe(true);
    const firstUser = messages[0] as Extract<AgentMessage, { role: "user" }> | undefined;
    expect(Array.isArray(firstUser?.content)).toBe(true);
    const content = firstUser?.content as Array<{ type: string; text?: string; data?: string }>;
    expect(content).toHaveLength(2);
    expect(content[0]?.type).toBe("text");
    expect(content[1]).toMatchObject({ type: "text", text: PRUNED_HISTORY_IMAGE_MARKER });
  });

  it("does not prune latest user message when no assistant response exists yet", () => {
    const messages: AgentMessage[] = [
      {
        role: "user",
        content: [{ type: "text", text: "See /tmp/photo.png" }, { ...image }],
      } as AgentMessage,
    ];

    const didMutate = pruneProcessedHistoryImages(messages);

    expect(didMutate).toBe(false);
    const first = messages[0] as Extract<AgentMessage, { role: "user" }> | undefined;
    if (!first || !Array.isArray(first.content)) {
      throw new Error("expected array content");
    }
    expect(first.content).toHaveLength(2);
    expect(first.content[1]).toMatchObject({ type: "image", data: "abc" });
  });

  it("does not change messages when no assistant turn exists", () => {
    const messages: AgentMessage[] = [
      {
        role: "user",
        content: "noop",
      } as AgentMessage,
    ];

    const didMutate = pruneProcessedHistoryImages(messages);

    expect(didMutate).toBe(false);
    const firstUser = messages[0] as Extract<AgentMessage, { role: "user" }> | undefined;
    expect(firstUser?.content).toBe("noop");
  });
});

describe("snapshotMessagesAfterToolResultFlush", () => {
  it("flushes pending tool results and snapshots the updated session context", () => {
    const unresolvedAssistant = {
      role: "assistant",
      content: [{ type: "toolCall", id: "call_1", name: "web_search", arguments: {} }],
      stopReason: "toolUse",
    } as AgentMessage;

    const syntheticToolResult = {
      role: "toolResult",
      toolCallId: "call_1",
      toolName: "web_search",
      content: [
        {
          type: "text",
          text: "[openclaw] missing tool result in session history; inserted synthetic error result for transcript repair.",
        },
      ],
      isError: true,
    } as AgentMessage;

    const activeSession = {
      messages: [unresolvedAssistant],
      agent: {
        replaceMessages(messages: AgentMessage[]) {
          activeSession.messages = messages;
        },
      },
    };

    let flushed = false;
    const sessionManager = {
      flushPendingToolResults() {
        flushed = true;
      },
      buildSessionContext() {
        return { messages: [unresolvedAssistant, syntheticToolResult] };
      },
    };

    const snapshot = snapshotMessagesAfterToolResultFlush({ sessionManager, activeSession });

    expect(flushed).toBe(true);
    expect(snapshot).toHaveLength(2);
    expect((snapshot[1] as { role?: string }).role).toBe("toolResult");
    expect((snapshot[1] as { toolCallId?: string }).toolCallId).toBe("call_1");
  });

  it("falls back to current active session messages when session manager context is unavailable", () => {
    const activeSession = {
      messages: [{ role: "assistant", content: [{ type: "text", text: "ok" }] } as AgentMessage],
      agent: {
        replaceMessages(_messages: AgentMessage[]) {
          // no-op
        },
      },
    };

    const snapshot = snapshotMessagesAfterToolResultFlush({ activeSession });

    expect(snapshot).toEqual(activeSession.messages);
    expect(snapshot).not.toBe(activeSession.messages);
  });
});
