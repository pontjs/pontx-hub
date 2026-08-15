import type { Message } from "@ag-ui/client";
import type { HttpMethod } from "~/lib/catalog/types";

export type PreparedAgentCall = {
  request: Record<string, unknown>;
  preview: {
    method: HttpMethod;
    url: string;
    curl: string;
    requiresConfirmation: boolean;
    proxyEnabled: boolean;
    warnings: string[];
  };
  auth: Array<{ id: string; type: string }>;
  operation: {
    method: HttpMethod;
    path: string;
    href: string;
    credentialStorageKey: string;
  };
  cli: string;
};

export type AgentExecutionState = {
  status: "idle" | "working" | "confirm" | "done" | "error";
  preview?: Record<string, unknown>;
  result?: Record<string, unknown>;
  confirmationToken?: string;
  error?: string;
};

export type AgentSession = {
  version: 2;
  threadId: string;
  messages: Message[];
  prepared: PreparedAgentCall[];
  executions: Record<number, AgentExecutionState>;
};

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const SENSITIVE_KEY = /^(?:authorization|proxy-authorization|cookie|set-cookie|api[-_]?key|access[-_]?token|refresh[-_]?token|id[-_]?token|token|secret|client[-_]?secret|password)$/i;
const DANGEROUS_KEY = new Set(["__proto__", "constructor", "prototype"]);
const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 100;
const MAX_OBJECT_ENTRIES = 100;
const MAX_STRING_LENGTH = 12_000;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isHttpMethod(value: unknown): value is HttpMethod {
  return typeof value === "string" && HTTP_METHODS.has(value);
}

function asStringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : null;
}

function isPreparedAgentCall(value: unknown): value is PreparedAgentCall {
  if (!isRecord(value) || !isRecord(value.request) || !isRecord(value.preview) || !isRecord(value.operation)) {
    return false;
  }
  const { preview, operation } = value;
  if (
    !isHttpMethod(preview.method) ||
    typeof preview.url !== "string" ||
    typeof preview.curl !== "string" ||
    typeof preview.requiresConfirmation !== "boolean" ||
    typeof preview.proxyEnabled !== "boolean" ||
    !asStringArray(preview.warnings) ||
    !isHttpMethod(operation.method) ||
    typeof operation.path !== "string" ||
    typeof operation.href !== "string" ||
    typeof operation.credentialStorageKey !== "string" ||
    typeof value.cli !== "string" ||
    !Array.isArray(value.auth)
  ) {
    return false;
  }
  return value.auth.every((item) => (
    isRecord(item) && typeof item.id === "string" && typeof item.type === "string"
  ));
}

function isExecutionStatus(value: unknown): value is AgentExecutionState["status"] {
  return value === "idle" || value === "working" || value === "confirm" || value === "done" || value === "error";
}

function sanitizeJson(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeJson(item, depth + 1));
  }
  if (!isRecord(value)) return undefined;

  const sanitized: JsonRecord = {};
  for (const [key, item] of Object.entries(value).slice(0, MAX_OBJECT_ENTRIES)) {
    if (DANGEROUS_KEY.has(key) || SENSITIVE_KEY.test(key)) continue;
    const next = sanitizeJson(item, depth + 1);
    if (next !== undefined) sanitized[key] = next;
  }
  return sanitized;
}

function sanitizedPreparedCall(value: PreparedAgentCall): PreparedAgentCall | null {
  const sanitized = sanitizeJson(value);
  return isPreparedAgentCall(sanitized) ? sanitized : null;
}

function restoredExecution(value: unknown): AgentExecutionState | null {
  if (!isRecord(value) || !isExecutionStatus(value.status)) return null;
  if (value.status === "working" || value.status === "confirm") return { status: "idle" };
  if (value.status === "error") {
    return typeof value.error === "string"
      ? { status: "error", error: value.error.slice(0, MAX_STRING_LENGTH) }
      : { status: "idle" };
  }
  if (value.status === "done") {
    const result = isRecord(value.result) ? sanitizeJson(value.result) : undefined;
    return isRecord(result) ? { status: "done", result } : { status: "done" };
  }
  return { status: "idle" };
}

function restoredExecutions(value: unknown): Record<number, AgentExecutionState> {
  if (!isRecord(value)) return {};
  const executions: Record<number, AgentExecutionState> = {};
  for (const [key, candidate] of Object.entries(value)) {
    const index = Number(key);
    if (!Number.isSafeInteger(index) || index < 0 || index > 100) continue;
    const execution = restoredExecution(candidate);
    if (execution) executions[index] = execution;
  }
  return executions;
}

export function messageText(message: Message): string {
  if (typeof message.content === "string") return message.content;
  if (!Array.isArray(message.content)) return "";
  return message.content
    .filter((part): part is { type: "text"; text: string } => (
      Boolean(part) &&
      typeof part === "object" &&
      (part as { type?: unknown }).type === "text" &&
      typeof (part as { text?: unknown }).text === "string"
    ))
    .map((part) => part.text)
    .join("\n");
}

export function isRenderableConversationMessage(message: Message): boolean {
  return (message.role === "user" || message.role === "assistant") && Boolean(messageText(message).trim());
}

export function persistedMessages(messages: Message[]): Message[] {
  return messages.filter(isRenderableConversationMessage);
}

export function readAgentSession(raw: string | null, fallbackThreadId: string): AgentSession {
  const fallback: AgentSession = {
    version: 2,
    threadId: fallbackThreadId,
    messages: [],
    prepared: [],
    executions: {}
  };
  try {
    const value = JSON.parse(raw ?? "null") as unknown;
    if (!isRecord(value) || typeof value.threadId !== "string" || !Array.isArray(value.messages)) {
      return fallback;
    }
    return {
      version: 2,
      threadId: value.threadId,
      messages: persistedMessages(value.messages as Message[]),
      prepared: Array.isArray(value.prepared)
        ? value.prepared
          .filter(isPreparedAgentCall)
          .map(sanitizedPreparedCall)
          .filter((call): call is PreparedAgentCall => call !== null)
        : [],
      executions: restoredExecutions(value.executions)
    };
  } catch {
    return fallback;
  }
}

export function createAgentSession(input: Omit<AgentSession, "version">): AgentSession {
  const prepared = input.prepared
    .map(sanitizedPreparedCall)
    .filter((call): call is PreparedAgentCall => call !== null);
  const executions = Object.fromEntries(
    Object.entries(input.executions)
      .map(([index, value]) => [index, restoredExecution(value)] as const)
      .filter((entry): entry is readonly [string, AgentExecutionState] => entry[1] !== null)
  ) as Record<number, AgentExecutionState>;
  return {
    version: 2,
    threadId: input.threadId,
    messages: persistedMessages(input.messages),
    prepared,
    executions
  };
}
