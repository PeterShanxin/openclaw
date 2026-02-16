import type { AgentContextPruningConfig } from "../../config/types.agent-defaults.js";
import { normalizeProviderId } from "../model-selection.js";

type CustomEntryLike = { type?: unknown; customType?: unknown; data?: unknown };

export const CACHE_TTL_CUSTOM_TYPE = "openclaw.cache-ttl";

export type CacheTtlEntryData = {
  timestamp: number;
  provider?: string;
  modelId?: string;
};

function normalizeProviderList(raw?: string[]): Set<string> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return new Set<string>();
  }
  return new Set(
    raw
      .map((entry) => normalizeProviderId(String(entry ?? "").trim()))
      .filter((entry) => entry.length > 0),
  );
}

export function isCacheTtlEligibleProvider(
  provider: string,
  _modelId: string,
  contextPruning?: AgentContextPruningConfig,
): boolean {
  const normalizedProvider = normalizeProviderId(provider);
  const mode = contextPruning?.providersMode ?? "all";
  const allow = normalizeProviderList(contextPruning?.allowProviders);
  const deny = normalizeProviderList(contextPruning?.denyProviders);

  if (mode === "allowlist") {
    return allow.has(normalizedProvider);
  }

  return !deny.has(normalizedProvider);
}

export function readLastCacheTtlTimestamp(sessionManager: unknown): number | null {
  const sm = sessionManager as { getEntries?: () => CustomEntryLike[] };
  if (!sm?.getEntries) {
    return null;
  }
  try {
    const entries = sm.getEntries();
    let last: number | null = null;
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry?.type !== "custom" || entry?.customType !== CACHE_TTL_CUSTOM_TYPE) {
        continue;
      }
      const data = entry?.data as Partial<CacheTtlEntryData> | undefined;
      const ts = typeof data?.timestamp === "number" ? data.timestamp : null;
      if (ts && Number.isFinite(ts)) {
        last = ts;
        break;
      }
    }
    return last;
  } catch {
    return null;
  }
}

export function appendCacheTtlTimestamp(sessionManager: unknown, data: CacheTtlEntryData): void {
  const sm = sessionManager as {
    appendCustomEntry?: (customType: string, data: unknown) => void;
  };
  if (!sm?.appendCustomEntry) {
    return;
  }
  try {
    sm.appendCustomEntry(CACHE_TTL_CUSTOM_TYPE, data);
  } catch {
    // ignore persistence failures
  }
}
