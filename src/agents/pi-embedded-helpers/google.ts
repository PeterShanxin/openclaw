import { sanitizeGoogleTurnOrdering } from "./bootstrap.js";

export function isGoogleModelApi(api?: string | null): boolean {
<<<<<<< HEAD
  return (
    api === "google-gemini-cli" ||
    api === "google-generative-ai" ||
    api === "google-antigravity" ||
    api === "google-vertex"
  );
}

export function isAntigravityClaude(params: {
  api?: string | null;
  provider?: string | null;
  modelId?: string;
}): boolean {
  const provider = params.provider?.toLowerCase();
  const api = params.api?.toLowerCase();
  if (provider !== "google-antigravity" && api !== "google-antigravity") {
    return false;
  }
  return params.modelId?.toLowerCase().includes("claude") ?? false;
=======
  return api === "google-gemini-cli" || api === "google-generative-ai";
>>>>>>> origin/chore/openclaw-v2026.2.26
}

export { sanitizeGoogleTurnOrdering };
