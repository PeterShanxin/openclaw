import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildHeartbeatMainSessionContextBlock } from "./heartbeat-main-context.js";

describe("buildHeartbeatMainSessionContextBlock", () => {
  it("extracts a small tail of user/assistant messages and filters injected heartbeat boilerplate", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-heartbeat-context-"));
    const sessionFile = path.join(dir, "session.jsonl");

    try {
      const lines = [
        JSON.stringify({ type: "session", version: 3, id: "s1" }),
        JSON.stringify({
          type: "message",
          message: {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Read HEARTBEAT.md if it exists. If nothing else, reply HEARTBEAT_OK as plain assistant text only.',
              },
            ],
          },
        }),
        JSON.stringify({
          type: "message",
          message: { role: "user", content: [{ type: "text", text: "hello" }] },
        }),
        JSON.stringify({
          type: "message",
          message: { role: "assistant", content: [{ type: "text", text: "hi there" }] },
        }),
        JSON.stringify({
          type: "message",
          message: { role: "user", content: [{ type: "image", mimeType: "image/png" }] },
        }),
        JSON.stringify({
          type: "message",
          message: { role: "toolResult", content: [{ type: "text", text: "tool output" }] },
        }),
        JSON.stringify({
          type: "message",
          message: {
            role: "user",
            content: [{ type: "text", text: "System: [2026-02-10] Exec completed (code 0)" }],
          },
        }),
        JSON.stringify({
          type: "message",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "multi\n\nline   message" }],
          },
        }),
      ];

      await fs.writeFile(sessionFile, `${lines.join("\n")}\n`, "utf-8");

      const block = await buildHeartbeatMainSessionContextBlock({ sessionFile, maxMessages: 10 });
      expect(block).toBeTruthy();
      expect(block).toContain("User: hello");
      expect(block).toContain("Assistant: hi there");
      expect(block).toContain("User: [non-text message: image]");
      expect(block).toContain("Assistant: multi line message");

      expect(block).not.toContain("Read HEARTBEAT.md if it exists.");
      expect(block).not.toContain("HEARTBEAT_OK");
      expect(block).not.toContain("Exec completed");
      expect(block).not.toContain("tool output");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

