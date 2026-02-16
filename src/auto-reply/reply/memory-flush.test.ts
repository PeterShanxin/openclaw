import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEMORY_FLUSH_SOFT_TOKENS,
  DEFAULT_PROACTIVE_COMPACTION_THRESHOLD_RATIO,
  resolveMemoryFlushContextWindowTokens,
  resolveMemoryFlushSettings,
  shouldRunMemoryFlush,
  shouldRunProactiveCompaction,
} from "./memory-flush.js";

describe("memory flush settings", () => {
  it("defaults to enabled with fallback prompt and system prompt", () => {
    const settings = resolveMemoryFlushSettings();
    expect(settings).not.toBeNull();
    expect(settings?.enabled).toBe(true);
    expect(settings?.prompt.length).toBeGreaterThan(0);
    expect(settings?.systemPrompt.length).toBeGreaterThan(0);
  });

  it("respects disable flag", () => {
    expect(
      resolveMemoryFlushSettings({
        agents: {
          defaults: { compaction: { memoryFlush: { enabled: false } } },
        },
      }),
    ).toBeNull();
  });

  it("appends NO_REPLY hint when missing", () => {
    const settings = resolveMemoryFlushSettings({
      agents: {
        defaults: {
          compaction: {
            memoryFlush: {
              prompt: "Write memories now.",
              systemPrompt: "Flush memory.",
            },
          },
        },
      },
    });
    expect(settings?.prompt).toContain("NO_REPLY");
    expect(settings?.systemPrompt).toContain("NO_REPLY");
  });
});

describe("shouldRunMemoryFlush", () => {
  it("requires totalTokens and threshold", () => {
    expect(
      shouldRunMemoryFlush({
        entry: { totalTokens: 0 },
        contextWindowTokens: 16_000,
        reserveTokensFloor: 20_000,
        softThresholdTokens: DEFAULT_MEMORY_FLUSH_SOFT_TOKENS,
      }),
    ).toBe(false);
  });

  it("skips when entry is missing", () => {
    expect(
      shouldRunMemoryFlush({
        entry: undefined,
        contextWindowTokens: 16_000,
        reserveTokensFloor: 1_000,
        softThresholdTokens: DEFAULT_MEMORY_FLUSH_SOFT_TOKENS,
      }),
    ).toBe(false);
  });

  it("skips when under threshold", () => {
    expect(
      shouldRunMemoryFlush({
        entry: { totalTokens: 10_000 },
        contextWindowTokens: 100_000,
        reserveTokensFloor: 20_000,
        softThresholdTokens: 10_000,
      }),
    ).toBe(false);
  });

  it("triggers at the threshold boundary", () => {
    expect(
      shouldRunMemoryFlush({
        entry: { totalTokens: 85 },
        contextWindowTokens: 100,
        reserveTokensFloor: 10,
        softThresholdTokens: 5,
      }),
    ).toBe(true);
  });

  it("skips when already flushed for current compaction count", () => {
    expect(
      shouldRunMemoryFlush({
        entry: {
          totalTokens: 90_000,
          compactionCount: 2,
          memoryFlushCompactionCount: 2,
        },
        contextWindowTokens: 100_000,
        reserveTokensFloor: 5_000,
        softThresholdTokens: 2_000,
      }),
    ).toBe(false);
  });

  it("runs when above threshold and not flushed", () => {
    expect(
      shouldRunMemoryFlush({
        entry: { totalTokens: 96_000, compactionCount: 1 },
        contextWindowTokens: 100_000,
        reserveTokensFloor: 5_000,
        softThresholdTokens: 2_000,
      }),
    ).toBe(true);
  });
});

describe("shouldRunProactiveCompaction", () => {
  it("returns false when entry is missing", () => {
    expect(
      shouldRunProactiveCompaction({
        entry: undefined,
        contextWindowTokens: 128_000,
      }),
    ).toBe(false);
  });

  it("returns false when totalTokens is 0", () => {
    expect(
      shouldRunProactiveCompaction({
        entry: { totalTokens: 0 },
        contextWindowTokens: 128_000,
      }),
    ).toBe(false);
  });

  it("returns false when below threshold", () => {
    expect(
      shouldRunProactiveCompaction({
        entry: { totalTokens: 80_000, contextTokens: 128_000 },
        contextWindowTokens: 128_000,
      }),
    ).toBe(false);
  });

  it("returns true at default threshold (85%)", () => {
    expect(
      shouldRunProactiveCompaction({
        entry: { totalTokens: 109_000, contextTokens: 128_000 },
        contextWindowTokens: 128_000,
      }),
    ).toBe(true);
  });

  it("uses contextWindowTokens when entry.contextTokens is missing", () => {
    expect(
      shouldRunProactiveCompaction({
        entry: { totalTokens: 109_000 },
        contextWindowTokens: 128_000,
      }),
    ).toBe(true);
  });

  it("respects custom threshold ratio", () => {
    // 70% of 100k = 70k — entry has 75k, should trigger
    expect(
      shouldRunProactiveCompaction({
        entry: { totalTokens: 75_000, contextTokens: 100_000 },
        contextWindowTokens: 100_000,
        thresholdRatio: 0.7,
      }),
    ).toBe(true);

    // 90% of 100k = 90k — entry has 85k, should NOT trigger
    expect(
      shouldRunProactiveCompaction({
        entry: { totalTokens: 85_000, contextTokens: 100_000 },
        contextWindowTokens: 100_000,
        thresholdRatio: 0.9,
      }),
    ).toBe(false);
  });

  it("returns true at exactly the threshold boundary", () => {
    // 85% of 100 = 85
    expect(
      shouldRunProactiveCompaction({
        entry: { totalTokens: 85, contextTokens: 100 },
        contextWindowTokens: 100,
      }),
    ).toBe(true);
  });

  it("returns false just below the threshold", () => {
    // 84/100 = 0.84 < 0.85
    expect(
      shouldRunProactiveCompaction({
        entry: { totalTokens: 84, contextTokens: 100 },
        contextWindowTokens: 100,
      }),
    ).toBe(false);
  });

  it("exports the default threshold constant", () => {
    expect(DEFAULT_PROACTIVE_COMPACTION_THRESHOLD_RATIO).toBe(0.85);
  });
});

describe("resolveMemoryFlushContextWindowTokens", () => {
  it("falls back to agent config or default tokens", () => {
    expect(resolveMemoryFlushContextWindowTokens({ agentCfgContextTokens: 42_000 })).toBe(42_000);
  });
});
