import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { TextContent } from "@mariozechner/pi-ai";
import type { SessionManager } from "@mariozechner/pi-coding-agent";
import { emitSessionTranscriptUpdate } from "../sessions/transcript-events.js";
import { HARD_MAX_TOOL_RESULT_CHARS } from "./pi-embedded-runner/tool-result-truncation.js";
import { makeMissingToolResult, sanitizeToolCallInputs } from "./session-transcript-repair.js";

const GUARD_TRUNCATION_SUFFIX =
  "\n\n⚠️ [Content truncated during persistence — original exceeded size limit. " +
  "Use offset/limit parameters or request specific sections for large content.]";
const DEFAULT_READ_TOOL_RESULT_CHARS = 12_000;
const DEFAULT_EXEC_TOOL_RESULT_CHARS = 8_000;

/**
 * Truncate oversized text content blocks in a tool result message.
 * Returns the original message if under the limit, or a new message with
 * truncated text blocks otherwise.
 */
function truncateHeadTail(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  if (maxChars <= GUARD_TRUNCATION_SUFFIX.length + 16) {
    return `${text.slice(0, Math.max(0, maxChars - GUARD_TRUNCATION_SUFFIX.length))}${GUARD_TRUNCATION_SUFFIX}`;
  }
  const available = maxChars - GUARD_TRUNCATION_SUFFIX.length;
  const headChars = Math.max(1, Math.floor(available * 0.6));
  const tailChars = Math.max(1, available - headChars);
  return `${text.slice(0, headChars)}${GUARD_TRUNCATION_SUFFIX}${text.slice(-tailChars)}`;
}

type ToolOutputBudget = {
  readChars?: number;
  execChars?: number;
};

type ToolResultCapResult = {
  message: AgentMessage;
  truncated: boolean;
  originalChars: number;
  includedChars: number;
  budgetChars: number;
};

function resolveToolResultBudget(toolName: string | undefined, budget?: ToolOutputBudget): number {
  const normalized = toolName?.trim().toLowerCase();
  if (normalized === "read") {
    const configured = budget?.readChars;
    if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
      return Math.min(HARD_MAX_TOOL_RESULT_CHARS, Math.floor(configured));
    }
    return DEFAULT_READ_TOOL_RESULT_CHARS;
  }
  if (normalized === "exec") {
    const configured = budget?.execChars;
    if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
      return Math.min(HARD_MAX_TOOL_RESULT_CHARS, Math.floor(configured));
    }
    return DEFAULT_EXEC_TOOL_RESULT_CHARS;
  }
  return HARD_MAX_TOOL_RESULT_CHARS;
}

function capToolResultSize(
  msg: AgentMessage,
  toolName: string | undefined,
  budget?: ToolOutputBudget,
): ToolResultCapResult {
  const role = (msg as { role?: string }).role;
  if (role !== "toolResult") {
    return {
      message: msg,
      truncated: false,
      originalChars: 0,
      includedChars: 0,
      budgetChars: HARD_MAX_TOOL_RESULT_CHARS,
    };
  }
  const content = (msg as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return {
      message: msg,
      truncated: false,
      originalChars: 0,
      includedChars: 0,
      budgetChars: HARD_MAX_TOOL_RESULT_CHARS,
    };
  }

  const budgetChars = resolveToolResultBudget(toolName, budget);

  // Calculate total text size
  let totalTextChars = 0;
  for (const block of content) {
    if (block && typeof block === "object" && (block as { type?: string }).type === "text") {
      const text = (block as TextContent).text;
      if (typeof text === "string") {
        totalTextChars += text.length;
      }
    }
  }

  if (totalTextChars <= budgetChars) {
    return {
      message: msg,
      truncated: false,
      originalChars: totalTextChars,
      includedChars: totalTextChars,
      budgetChars,
    };
  }

  // Truncate proportionally
  let includedChars = 0;
  let didTruncate = false;
  const newContent = content.map((block: unknown) => {
    if (!block || typeof block !== "object" || (block as { type?: string }).type !== "text") {
      return block;
    }
    const textBlock = block as TextContent;
    if (typeof textBlock.text !== "string") {
      return block;
    }
    const blockShare = textBlock.text.length / totalTextChars;
    const blockBudget = Math.max(128, Math.floor(budgetChars * blockShare));
    const nextText = truncateHeadTail(textBlock.text, blockBudget);
    if (nextText.length < textBlock.text.length) {
      didTruncate = true;
    }
    includedChars += nextText.length;
    return {
      ...textBlock,
      text: nextText,
    };
  });

  return {
    message: { ...msg, content: newContent } as AgentMessage,
    truncated: didTruncate,
    originalChars: totalTextChars,
    includedChars: includedChars || budgetChars,
    budgetChars,
  };
}

type ToolCall = { id: string; name?: string };

function extractAssistantToolCalls(msg: Extract<AgentMessage, { role: "assistant" }>): ToolCall[] {
  const content = msg.content;
  if (!Array.isArray(content)) {
    return [];
  }

  const toolCalls: ToolCall[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const rec = block as { type?: unknown; id?: unknown; name?: unknown };
    if (typeof rec.id !== "string" || !rec.id) {
      continue;
    }
    if (rec.type === "toolCall" || rec.type === "toolUse" || rec.type === "functionCall") {
      toolCalls.push({
        id: rec.id,
        name: typeof rec.name === "string" ? rec.name : undefined,
      });
    }
  }
  return toolCalls;
}

function extractToolResultId(msg: Extract<AgentMessage, { role: "toolResult" }>): string | null {
  const toolCallId = (msg as { toolCallId?: unknown }).toolCallId;
  if (typeof toolCallId === "string" && toolCallId) {
    return toolCallId;
  }
  const toolUseId = (msg as { toolUseId?: unknown }).toolUseId;
  if (typeof toolUseId === "string" && toolUseId) {
    return toolUseId;
  }
  return null;
}

export function installSessionToolResultGuard(
  sessionManager: SessionManager,
  opts?: {
    /**
     * Optional, synchronous transform applied to toolResult messages *before* they are
     * persisted to the session transcript.
     */
    transformToolResultForPersistence?: (
      message: AgentMessage,
      meta: { toolCallId?: string; toolName?: string; isSynthetic?: boolean },
    ) => AgentMessage;
    /**
     * Whether to synthesize missing tool results to satisfy strict providers.
     * Defaults to true.
     */
    allowSyntheticToolResults?: boolean;
    /** Optional tool-specific char budgets for persisted tool results. */
    toolOutputBudget?: ToolOutputBudget;
    /** Optional callback for tool-output truncation telemetry. */
    onToolResultTruncated?: (event: {
      toolName?: string;
      originalChars: number;
      includedChars: number;
      budgetChars: number;
    }) => void;
  },
): {
  flushPendingToolResults: () => void;
  getPendingIds: () => string[];
} {
  const originalAppend = sessionManager.appendMessage.bind(sessionManager);
  const pending = new Map<string, string | undefined>();

  const persistToolResult = (
    message: AgentMessage,
    meta: { toolCallId?: string; toolName?: string; isSynthetic?: boolean },
  ) => {
    const transformer = opts?.transformToolResultForPersistence;
    return transformer ? transformer(message, meta) : message;
  };

  const allowSyntheticToolResults = opts?.allowSyntheticToolResults ?? true;

  const flushPendingToolResults = () => {
    if (pending.size === 0) {
      return;
    }
    if (allowSyntheticToolResults) {
      for (const [id, name] of pending.entries()) {
        const synthetic = makeMissingToolResult({ toolCallId: id, toolName: name });
        originalAppend(
          persistToolResult(synthetic, {
            toolCallId: id,
            toolName: name,
            isSynthetic: true,
          }) as never,
        );
      }
    }
    pending.clear();
  };

  const guardedAppend = (message: AgentMessage) => {
    let nextMessage = message;
    const role = (message as { role?: unknown }).role;
    if (role === "assistant") {
      const sanitized = sanitizeToolCallInputs([message]);
      if (sanitized.length === 0) {
        if (allowSyntheticToolResults && pending.size > 0) {
          flushPendingToolResults();
        }
        return undefined;
      }
      nextMessage = sanitized[0];
    }
    const nextRole = (nextMessage as { role?: unknown }).role;

    if (nextRole === "toolResult") {
      const id = extractToolResultId(nextMessage as Extract<AgentMessage, { role: "toolResult" }>);
      const toolName = id ? pending.get(id) : undefined;
      if (id) {
        pending.delete(id);
      }
      // Apply hard size cap before persistence to prevent oversized tool results
      // from consuming the entire context window on subsequent LLM calls.
      const capped = capToolResultSize(nextMessage, toolName, opts?.toolOutputBudget);
      if (capped.truncated) {
        opts?.onToolResultTruncated?.({
          toolName,
          originalChars: capped.originalChars,
          includedChars: capped.includedChars,
          budgetChars: capped.budgetChars,
        });
      }
      return originalAppend(
        persistToolResult(capped.message, {
          toolCallId: id ?? undefined,
          toolName,
          isSynthetic: false,
        }) as never,
      );
    }

    const toolCalls =
      nextRole === "assistant"
        ? extractAssistantToolCalls(nextMessage as Extract<AgentMessage, { role: "assistant" }>)
        : [];

    if (allowSyntheticToolResults) {
      // If previous tool calls are still pending, flush before non-tool results.
      if (pending.size > 0 && (toolCalls.length === 0 || nextRole !== "assistant")) {
        flushPendingToolResults();
      }
      // If new tool calls arrive while older ones are pending, flush the old ones first.
      if (pending.size > 0 && toolCalls.length > 0) {
        flushPendingToolResults();
      }
    }

    const result = originalAppend(nextMessage as never);

    const sessionFile = (
      sessionManager as { getSessionFile?: () => string | null }
    ).getSessionFile?.();
    if (sessionFile) {
      emitSessionTranscriptUpdate(sessionFile);
    }

    if (toolCalls.length > 0) {
      for (const call of toolCalls) {
        pending.set(call.id, call.name);
      }
    }

    return result;
  };

  // Monkey-patch appendMessage with our guarded version.
  sessionManager.appendMessage = guardedAppend as SessionManager["appendMessage"];

  return {
    flushPendingToolResults,
    getPendingIds: () => Array.from(pending.keys()),
  };
}
