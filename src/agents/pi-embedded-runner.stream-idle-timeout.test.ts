import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "./test-helpers/fast-coding-tools.js";
import type { OpenClawConfig } from "../config/config.js";

let runEmbeddedPiAgent: typeof import("./pi-embedded-runner.js").runEmbeddedPiAgent;
let tempRoot: string | undefined;
let agentDir: string;
let workspaceDir: string;
let sessionCounter = 0;
let streamSimpleCalls = 0;

const nextSessionFile = () => {
  sessionCounter += 1;
  return path.join(workspaceDir, `session-${sessionCounter}.jsonl`);
};

const immediateEnqueue = async <T>(task: () => Promise<T>) => task();

vi.mock("@mariozechner/pi-ai", async () => {
  const actual = await vi.importActual<typeof import("@mariozechner/pi-ai")>("@mariozechner/pi-ai");

  const buildAbortMessage = (model: { api: string; provider: string; id: string }) => ({
    role: "assistant" as const,
    content: [] as const,
    stopReason: "aborted" as const,
    errorMessage: "mock stream aborted",
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        total: 0,
      },
    },
    timestamp: Date.now(),
  });

  return {
    ...actual,
    // Keep complete/completeSimple usable in case some internal path relies on them.
    complete: async (model: { api: string; provider: string; id: string }) =>
      buildAbortMessage(model),
    completeSimple: async (model: { api: string; provider: string; id: string }) =>
      buildAbortMessage(model),
    // Simulate a hung stream: no events until the caller aborts via AbortSignal.
    streamSimple: (
      model: { api: string; provider: string; id: string },
      _context: unknown,
      options?: { signal?: AbortSignal },
    ) => {
      streamSimpleCalls += 1;
      const stream = new actual.AssistantMessageEventStream();
      const signal = options?.signal;
      if (signal) {
        const onAbort = () => {
          // Resolve the stream so prompt() can unwind after we abort.
          stream.push({ type: "error", reason: "aborted", error: buildAbortMessage(model) });
          stream.end();
        };
        if (signal.aborted) {
          queueMicrotask(onAbort);
        } else {
          signal.addEventListener("abort", () => queueMicrotask(onAbort), { once: true });
        }
      }
      return stream;
    },
  };
});

const makeOpenAiConfig = (modelIds: string[]) =>
  ({
    models: {
      providers: {
        openai: {
          api: "openai-responses",
          apiKey: "sk-test",
          baseUrl: "https://example.com",
          models: modelIds.map((id) => ({
            id,
            name: `Mock ${id}`,
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 16_000,
            maxTokens: 2048,
          })),
        },
      },
    },
  }) satisfies OpenClawConfig;

beforeAll(async () => {
  vi.useRealTimers();
  ({ runEmbeddedPiAgent } = await import("./pi-embedded-runner.js"));
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-stream-idle-timeout-"));
  agentDir = path.join(tempRoot, "agent");
  workspaceDir = path.join(tempRoot, "workspace");
  await fs.mkdir(agentDir, { recursive: true });
  await fs.mkdir(workspaceDir, { recursive: true });
}, 20_000);

beforeEach(() => {
  streamSimpleCalls = 0;
});

afterAll(async () => {
  if (!tempRoot) {
    return;
  }
  await fs.rm(tempRoot, { recursive: true, force: true });
  tempRoot = undefined;
});

describe("streamIdleTimeoutSeconds", () => {
  it("fails over when no streaming events are observed within the idle timeout", async () => {
    const sessionFile = nextSessionFile();
    const cfg = {
      ...makeOpenAiConfig(["mock-hang"]),
      agents: {
        defaults: {
          // Ensure the runner throws FailoverError on timeout (outer layer can pick fallbacks).
          model: { fallbacks: ["openai/mock-fallback"] },
          streamIdleTimeoutSeconds: 1,
        },
      },
    } satisfies OpenClawConfig;

    await expect(
      runEmbeddedPiAgent({
        sessionId: "session:test-stream-idle-timeout",
        sessionKey: "agent:test:embedded",
        sessionFile,
        workspaceDir,
        config: cfg,
        prompt: "hello",
        provider: "openai",
        model: "mock-hang",
        // Keep the overall timeout long; we want stream-idle to trip first.
        timeoutMs: 60_000,
        agentDir,
        runId: "run-stream-idle-timeout",
        enqueue: immediateEnqueue,
      }),
    ).rejects.toMatchObject({ name: "FailoverError", reason: "timeout" });
    expect(streamSimpleCalls).toBe(2);
  }, 20_000);

  it("returns a local run-timeout error payload without model fallback on run budget timeout", async () => {
    const sessionFile = nextSessionFile();
    const cfg = {
      ...makeOpenAiConfig(["mock-hang"]),
      agents: {
        defaults: {
          streamIdleTimeoutSeconds: 30,
        },
      },
    } satisfies OpenClawConfig;

    const result = await runEmbeddedPiAgent({
      sessionId: "session:test-run-budget-timeout",
      sessionKey: "agent:test:embedded",
      sessionFile,
      workspaceDir,
      config: cfg,
      prompt: "hello",
      provider: "openai",
      model: "mock-hang",
      timeoutMs: 200,
      agentDir,
      runId: "run-budget-timeout",
      enqueue: immediateEnqueue,
    });

    expect(result.meta.error).toMatchObject({ kind: "run_timeout" });
    expect(result.payloads?.[0]?.text).toContain("local run budget timeout");
    expect(result.payloads?.[0]?.text).toContain("agents.defaults.timeoutSeconds");
    expect(streamSimpleCalls).toBe(1);
  }, 20_000);
});
