import type { Locale } from "~/lib/catalog/types";

export type AgentActivityKind =
  | "read"
  | "write"
  | "delegate"
  | "search"
  | "inspect"
  | "code"
  | "call"
  | "tool";

export type AgentActivityStatus = "preparing" | "running" | "completed" | "failed";

export type AgentActivity = {
  id: string;
  name: string;
  kind: AgentActivityKind;
  parentMessageId?: string;
  input?: Record<string, unknown>;
  target?: string;
  result?: string;
  status: AgentActivityStatus;
};

type ActivityCopy = {
  title: string;
  input: string;
  output: string;
  status: string;
};

const TARGET_FIELDS = [
  "path",
  "filePath",
  "file_path",
  "filename",
  "file",
  "resourceId",
  "resource_id",
  "operationId",
  "operation_id",
  "apiSlug",
  "api_slug",
  "query",
  "command",
  "task",
  "description",
  "url"
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function classifyTool(name: string): AgentActivityKind {
  const normalized = name.toLowerCase();
  if (/(read|cat|view|open_file|load_file)/.test(normalized)) return "read";
  if (/(write|edit|patch|apply|create_file|delete_file)/.test(normalized)) return "write";
  if (/(sub.?agent|delegate|spawn|task\b)/.test(normalized)) return "delegate";
  if (/(search|grep|glob|find)/.test(normalized)) return "search";
  if (/(pricing|resource|schema|inspect|show|lookup)/.test(normalized)) return "inspect";
  if (/(sdk|cli|code|generate)/.test(normalized)) return "code";
  if (/(call|execute|request|preview)/.test(normalized)) return "call";
  return "tool";
}

function activityTarget(input?: Record<string, unknown>): string | undefined {
  if (!input) return undefined;
  for (const field of TARGET_FIELDS) {
    const value = input[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function parseToolArguments(value: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function startAgentActivity(input: {
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}): AgentActivity {
  return {
    id: input.toolCallId,
    name: input.toolCallName,
    kind: classifyTool(input.toolCallName),
    parentMessageId: input.parentMessageId,
    status: "preparing"
  };
}

export function updateAgentActivityArguments(
  activity: AgentActivity,
  input: Record<string, unknown>
): AgentActivity {
  return {
    ...activity,
    input,
    target: activityTarget(input) ?? activity.target,
    status: "running"
  };
}

export function completeAgentActivity(activity: AgentActivity, result: string): AgentActivity {
  return { ...activity, result, status: "completed" };
}

export function failAgentActivity(activity: AgentActivity): AgentActivity {
  return activity.status === "completed" ? activity : { ...activity, status: "failed" };
}

export function formatActivityPayload(value: unknown): string | undefined {
  if (typeof value === "string") {
    const parsed = parseToolArguments(value);
    return parsed ? JSON.stringify(parsed, null, 2) : value.trim() || undefined;
  }
  if (!value) return undefined;
  return JSON.stringify(value, null, 2);
}

function copyFor(activity: AgentActivity, locale: Locale): ActivityCopy {
  const zh = locale === "zh";
  const titles: Record<AgentActivityKind, string> = zh
    ? {
        read: "读取文件",
        write: "修改文件",
        delegate: "委派子 Agent",
        search: "检索资源",
        inspect: "读取资源",
        code: "生成代码",
        call: "准备调用",
        tool: "调用工具"
      }
    : {
        read: "Read file",
        write: "Modify file",
        delegate: "Delegate sub-agent",
        search: "Search resources",
        inspect: "Inspect resource",
        code: "Generate code",
        call: "Prepare call",
        tool: "Run tool"
      };
  const statuses: Record<AgentActivityStatus, string> = zh
    ? { preparing: "准备中", running: "执行中", completed: "已完成", failed: "失败" }
    : { preparing: "Preparing", running: "Running", completed: "Completed", failed: "Failed" };
  return {
    title: titles[activity.kind],
    input: zh ? "输入" : "Input",
    output: zh ? "输出" : "Output",
    status: statuses[activity.status]
  };
}

export function describeAgentActivity(activity: AgentActivity, locale: Locale) {
  return copyFor(activity, locale);
}
