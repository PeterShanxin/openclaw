import { describe, expect, it } from "vitest";
import { resolveAgentConfig } from "../agents/agent-scope.js";
import { validateConfigObject } from "./config.js";

describe("config: agents.list[].silentTools", () => {
  it("accepts boolean silentTools in agent config", () => {
    const res = validateConfigObject({
      agents: {
        list: [{ id: "main", silentTools: true }],
      },
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(resolveAgentConfig(res.config, "main")?.silentTools).toBe(true);
    }
  });

  it("rejects non-boolean silentTools values", () => {
    const res = validateConfigObject({
      agents: {
        list: [{ id: "main", silentTools: "true" }],
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.issues.some((issue) => issue.path === "agents.list.0.silentTools")).toBe(true);
    }
  });
});
