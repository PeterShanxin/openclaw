import { describe, expect, it } from "vitest";
import { isCacheTtlEligibleProvider } from "./cache-ttl.js";

describe("isCacheTtlEligibleProvider", () => {
  it("defaults to provider-agnostic allow mode", () => {
    expect(isCacheTtlEligibleProvider("anthropic", "claude-opus")).toBe(true);
    expect(isCacheTtlEligibleProvider("zai", "glm-4.7")).toBe(true);
    expect(isCacheTtlEligibleProvider("qwen", "qwen3-coder-plus")).toBe(true);
  });

  it("supports allowlist mode", () => {
    const cfg = {
      providersMode: "allowlist" as const,
      allowProviders: ["anthropic", "zai"],
    };
    expect(isCacheTtlEligibleProvider("anthropic", "claude-opus", cfg)).toBe(true);
    expect(isCacheTtlEligibleProvider("zai", "glm-4.7", cfg)).toBe(true);
    expect(isCacheTtlEligibleProvider("qwen", "qwen3-coder-plus", cfg)).toBe(false);
  });

  it("supports denylist mode for all-providers policy", () => {
    const cfg = {
      providersMode: "all" as const,
      denyProviders: ["anthropic"],
    };
    expect(isCacheTtlEligibleProvider("anthropic", "claude-opus", cfg)).toBe(false);
    expect(isCacheTtlEligibleProvider("zai", "glm-4.7", cfg)).toBe(true);
  });
});
