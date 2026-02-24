import { normalizeProviderId } from "./model-selection.js";

const PROVIDER_DISPLAY_ALIASES: Record<string, string> = {
  "openai-codex": "openai",
};

const PROVIDER_NAME_ALIASES: Record<string, string> = {
  openai: "OpenAI",
};

export function formatProviderForDisplay(provider?: string | null): string | undefined {
  const trimmed = provider?.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = normalizeProviderId(trimmed);
  return PROVIDER_DISPLAY_ALIASES[normalized] ?? normalized;
}

export function formatProviderNameForDisplay(provider?: string | null): string | undefined {
  const displayId = formatProviderForDisplay(provider);
  if (!displayId) {
    return undefined;
  }
  return PROVIDER_NAME_ALIASES[displayId] ?? displayId;
}

export function formatModelRefForDisplay(params: {
  provider?: string | null;
  model?: string | null;
}): string | undefined {
  const provider = formatProviderForDisplay(params.provider);
  const model = params.model?.trim();
  if (!provider) {
    return undefined;
  }
  return model ? `${provider}/${model}` : provider;
}

export function normalizeModelRefForDisplay(raw?: string | null): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  const slash = trimmed.indexOf("/");
  if (slash <= 0) {
    return formatProviderForDisplay(trimmed) ?? trimmed;
  }
  return (
    formatModelRefForDisplay({
      provider: trimmed.slice(0, slash),
      model: trimmed.slice(slash + 1),
    }) ?? trimmed
  );
}
