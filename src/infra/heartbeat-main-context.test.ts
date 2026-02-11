import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHeartbeatMainSessionContext,
  buildHeartbeatMainSessionContextBlock,
} from "./heartbeat-main-context.js";

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
                text: "Read HEARTBEAT.md if it exists. If nothing else, reply HEARTBEAT_OK as plain assistant text only.",
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

  it("trims unresolved tail turns ending with a progress-only assistant", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-heartbeat-context-trim-"));
    const sessionFile = path.join(dir, "session.jsonl");

    try {
      const lines = [
        JSON.stringify({ type: "session", version: 3, id: "s2" }),
        JSON.stringify({
          type: "message",
          message: {
            role: "user",
            content: [{ type: "text", text: "旧问题：昨天那个修复是不是完成了？" }],
          },
        }),
        JSON.stringify({
          type: "message",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "完成了，测试也通过了。" }],
          },
        }),
        JSON.stringify({
          type: "message",
          message: {
            role: "user",
            content: [
              { type: "text", text: "对了，王者荣耀充值是在游戏里划算还是外面官方渠道更划算？" },
            ],
          },
        }),
        JSON.stringify({
          type: "message",
          message: {
            role: "assistant",
            content: [
              { type: "text", text: "正在为你查询《王者荣耀》官方充值渠道的最新优惠对比。" },
              {
                type: "toolCall",
                id: "web_search_x",
                name: "web_search",
                arguments: { query: "王者荣耀 官方充值渠道 优惠对比 2026" },
              },
            ],
          },
        }),
      ];

      await fs.writeFile(sessionFile, `${lines.join("\n")}\n`, "utf-8");

      const block = await buildHeartbeatMainSessionContextBlock({ sessionFile, maxMessages: 10 });
      expect(block).toBeTruthy();
      expect(block).toContain("User: 旧问题：昨天那个修复是不是完成了？");
      expect(block).toContain("Assistant: 完成了，测试也通过了。");
      expect(block).not.toContain("王者荣耀充值是在游戏里划算还是外面官方渠道更划算");
      expect(block).not.toContain("正在为你查询《王者荣耀》官方充值渠道");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps substantive assistant turns even when they include tool calls", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-heartbeat-context-keep-"));
    const sessionFile = path.join(dir, "session.jsonl");

    try {
      const lines = [
        JSON.stringify({ type: "session", version: 3, id: "s3" }),
        JSON.stringify({
          type: "message",
          message: { role: "user", content: [{ type: "text", text: "给我结论" }] },
        }),
        JSON.stringify({
          type: "message",
          message: {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "结论：春节活动期优先走游戏内活动叠加，再补官方渠道折扣。",
              },
              {
                type: "toolCall",
                id: "web_search_y",
                name: "web_search",
                arguments: { query: "王者荣耀 春节 充值 活动" },
              },
            ],
          },
        }),
      ];

      await fs.writeFile(sessionFile, `${lines.join("\n")}\n`, "utf-8");

      const block = await buildHeartbeatMainSessionContextBlock({ sessionFile, maxMessages: 10 });
      expect(block).toBeTruthy();
      expect(block).toContain(
        "Assistant: 结论：春节活动期优先走游戏内活动叠加，再补官方渠道折扣。",
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("reports diagnostics for trimmed unresolved trailing turns", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-heartbeat-context-diag-"));
    const sessionFile = path.join(dir, "session.jsonl");

    try {
      const lines = [
        JSON.stringify({ type: "session", version: 3, id: "s4" }),
        JSON.stringify({
          type: "message",
          message: { role: "user", content: [{ type: "text", text: "已完成了吗？" }] },
        }),
        JSON.stringify({
          type: "message",
          message: { role: "assistant", content: [{ type: "text", text: "已完成。" }] },
        }),
        JSON.stringify({
          type: "message",
          message: { role: "user", content: [{ type: "text", text: "那王者荣耀充值怎么选？" }] },
        }),
        JSON.stringify({
          type: "message",
          message: {
            role: "assistant",
            content: [
              { type: "text", text: "正在为你查询最新优惠。" },
              {
                type: "toolCall",
                id: "call_diag",
                name: "web_search",
                arguments: { query: "王者荣耀 充值" },
              },
            ],
          },
        }),
      ];

      await fs.writeFile(sessionFile, `${lines.join("\n")}\n`, "utf-8");

      const result = await buildHeartbeatMainSessionContext({ sessionFile, maxMessages: 10 });
      expect(result.block).toContain("Assistant: 已完成。");
      expect(result.block).not.toContain("王者荣耀充值怎么选");
      expect(result.diagnostics.trimmedTrailingMessages).toBe(2);
      expect(result.diagnostics.includedMessages).toBe(2);
      expect(result.diagnostics.parsedMessages).toBe(4);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
