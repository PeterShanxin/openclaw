import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { ImageContent } from "@mariozechner/pi-ai";
import { describe, expect, it } from "vitest";
import {
  injectHistoryImagesIntoMessages,
  snapshotMessagesAfterToolResultFlush,
} from "./attempt.js";

describe("injectHistoryImagesIntoMessages", () => {
  const image: ImageContent = { type: "image", data: "abc", mimeType: "image/png" };

  it("injects history images and converts string content", () => {
    const messages: AgentMessage[] = [
      {
        role: "user",
        content: "See /tmp/photo.png",
      } as AgentMessage,
    ];

    const didMutate = injectHistoryImagesIntoMessages(messages, new Map([[0, [image]]]));

    expect(didMutate).toBe(true);
    expect(Array.isArray(messages[0]?.content)).toBe(true);
    const content = messages[0]?.content as Array<{ type: string; text?: string; data?: string }>;
    expect(content).toHaveLength(2);
    expect(content[0]?.type).toBe("text");
    expect(content[1]).toMatchObject({ type: "image", data: "abc" });
  });

  it("avoids duplicating existing image content", () => {
    const messages: AgentMessage[] = [
      {
        role: "user",
        content: [{ type: "text", text: "See /tmp/photo.png" }, { ...image }],
      } as AgentMessage,
    ];

    const didMutate = injectHistoryImagesIntoMessages(messages, new Map([[0, [image]]]));

    expect(didMutate).toBe(false);
    const first = messages[0];
    if (!first || !Array.isArray(first.content)) {
      throw new Error("expected array content");
    }
    expect(first.content).toHaveLength(2);
  });

  it("ignores non-user messages and out-of-range indices", () => {
    const messages: AgentMessage[] = [
      {
        role: "assistant",
        content: "noop",
      } as AgentMessage,
    ];

    const didMutate = injectHistoryImagesIntoMessages(messages, new Map([[1, [image]]]));

    expect(didMutate).toBe(false);
    expect(messages[0]?.content).toBe("noop");
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
