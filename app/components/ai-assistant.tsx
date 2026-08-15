import {
  Alert,
  AlertDescription,
  Button,
  Card,
  EmptyState,
  LoadingSpinner,
  Separator,
  StatusBadge
} from "@pontx/shadcn-ui";
import { HttpAgent, type Message } from "@ag-ui/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router";
import { MethodBadge } from "~/components/method-badge";
import {
  completeAgentActivity,
  describeAgentActivity,
  failAgentActivity,
  formatActivityPayload,
  startAgentActivity,
  summarizeAgentActivities,
  type AgentActivity,
  updateAgentActivityArguments
} from "~/lib/ai/agent-activity";
import type { HttpMethod, Locale } from "~/lib/catalog/types";

type PreparedCall = {
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

type ExecutionState = {
  status: "idle" | "working" | "confirm" | "done" | "error";
  preview?: Record<string, unknown>;
  result?: Record<string, unknown>;
  confirmationToken?: string;
  error?: string;
};

type AgentStatus = {
  kind: "runtime" | "limit" | "error";
  message: string;
  tone: "warning" | "danger";
};

const copy = {
  zh: {
    label: "Pontx Agent",
    title: "Pontx Agent",
    subtitle: "搜索 API、生成代码并安全执行任务",
    close: "关闭 Pontx Agent",
    emptyTitle: "交给 Agent 一个 API 任务",
    empty: "描述你要完成的任务。Pontx Agent 会查找并理解接口、说明鉴权与费用、生成统一 SDK 或 CLI 代码，并将可执行调用交给你预览和确认。",
    suggestions: [
      ["查找 API", "帮我查找一个汇率 API，并说明应该使用哪个接口。"],
      ["了解鉴权", "滴答清单 API 应该如何完成 OAuth 鉴权？"],
      ["生成统一 SDK", "为 Frankfurter 最新汇率接口生成统一 SDK 调用代码。"],
      ["查看费用", "Massive API 的调用费用和免费额度是什么？"]
    ],
    placeholder: "描述任务，例如：查找汇率 API 并生成统一 SDK 调用代码",
    inputLabel: "给 Pontx Agent 分配任务",
    send: "运行任务",
    stop: "停止",
    working: "正在查找 API 并规划执行步骤…",
    signIn: "登录后使用 Pontx Agent",
    limit: "今日额度已用完，请明天再试。",
    unavailable: "Pontx Agent 暂时不可用。",
    usageUnavailable: "Pontx Agent 暂时无法连接运行服务。",
    globalLimit: "当前全局 Agent 预算已用完，请稍后再试。",
    checkRuntime: "重新检测",
    checkingRuntime: "正在检测…",
    prepared: "请求预览",
    previewRun: "预览并调用",
    confirm: "确认执行写操作",
    executing: "正在执行…",
    completed: "调用完成",
    credentials: "请先在接口 Playground 中配置会话鉴权。",
    openEndpoint: "查看接口",
    cli: "CLI 调用",
    response: "响应结果",
    clear: "新建任务",
    live: "已连接",
    catalog: "Pontx API Hub",
    you: "你",
    agent: "Pontx Agent",
    composerHint: "Enter 运行任务 · Shift + Enter 换行"
  },
  en: {
    label: "Pontx Agent",
    title: "Pontx Agent",
    subtitle: "Find APIs, generate code, and execute tasks safely",
    close: "Close Pontx Agent",
    emptyTitle: "Delegate an API task",
    empty: "Describe the task you want completed. Pontx Agent will find and understand the endpoint, explain auth and pricing, generate Unified SDK or CLI code, and present executable calls for your review and confirmation.",
    suggestions: [
      ["Find an API", "Find an exchange-rate API and recommend the right endpoint."],
      ["Understand auth", "How do I complete OAuth authentication for the Dida365 API?"],
      ["Generate Unified SDK", "Generate Unified SDK integration code for the latest Frankfurter rates endpoint."],
      ["Check pricing", "What are the pricing and free-tier details for the Massive API?"]
    ],
    placeholder: "Describe a task, such as finding an exchange-rate API and generating Unified SDK code",
    inputLabel: "Assign a task to Pontx Agent",
    send: "Run task",
    stop: "Stop",
    working: "Finding APIs and planning the next steps…",
    signIn: "Sign in to use Pontx Agent",
    limit: "Today's message allowance is exhausted. Try again tomorrow.",
    unavailable: "Pontx Agent is currently unavailable.",
    usageUnavailable: "Pontx Agent cannot reach its runtime service right now.",
    globalLimit: "The shared Agent budget is currently exhausted. Try again later.",
    checkRuntime: "Check again",
    checkingRuntime: "Checking…",
    prepared: "Request preview",
    previewRun: "Preview and call",
    confirm: "Confirm mutation",
    executing: "Executing…",
    completed: "Call completed",
    credentials: "Configure session credentials in the endpoint Playground first.",
    openEndpoint: "View endpoint",
    cli: "CLI command",
    response: "Response",
    clear: "New task",
    live: "Connected",
    catalog: "Pontx API Hub",
    you: "You",
    agent: "Pontx Agent",
    composerHint: "Enter to run · Shift + Enter for a new line"
  }
} satisfies Record<Locale, Record<string, string | string[][]>>;

const SESSION_KEY = "pontx:ai:session:v1";

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      data-agent-icon="agent-operator"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="10.5" cy="9" r="3.2" />
      <path d="M4.8 19.25c.72-3.14 3.18-5.12 6.12-5.12s5.4 1.98 6.12 5.12" />
      <path d="m17.55 2.9.64 1.96 1.96.64-1.96.64-.64 1.96-.64-1.96-1.96-.64 1.96-.64.64-1.96Z" />
    </svg>
  );
}

function CloseIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>;
}

function NewSessionIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>;
}

function RunIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 5 7 5-7 5Z" /></svg>;
}

function StopIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5.5" y="5.5" width="9" height="9" rx="1" /></svg>;
}

function ActivityIcon({ kind }: { kind: AgentActivity["kind"] }) {
  if (kind === "read" || kind === "inspect") {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 3.5h6l3 3v10h-9Z" /><path d="M11.5 3.5v3h3M7.5 10h5M7.5 13h4" /></svg>;
  }
  if (kind === "write") {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 14.75-.5 2 2-.5L15 7.75 12.25 5Z" /><path d="m11.5 5.75 2.75 2.75M4.5 4.5h5" /></svg>;
  }
  if (kind === "delegate") {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="7" cy="7" r="2" /><circle cx="13.5" cy="12.5" r="2" /><path d="M8.7 8.1 12 11M4 15.5c.45-2 1.6-3 3.45-3" /></svg>;
  }
  if (kind === "code") {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.25 5-4 5 4 5M12.75 5l4 5-4 5M11 3.75 9 16.25" /></svg>;
  }
  if (kind === "call") {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 5 6 5-6 5Z" /><path d="M3.5 3.5h13v13h-13Z" /></svg>;
  }
  return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="4.5" /><path d="m12.5 12.5 3 3M9 6.75v4.5M6.75 9h4.5" /></svg>;
}

function messageText(message: Message): string {
  if (typeof message.content === "string") return message.content;
  if (!Array.isArray(message.content)) return "";
  return message.content
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function isRenderableConversationMessage(message: Message): boolean {
  return (message.role === "user" || message.role === "assistant") && Boolean(messageText(message).trim());
}

function persistedMessages(messages: Message[]): Message[] {
  return messages.filter(isRenderableConversationMessage);
}

function AgentRunTimeline({
  activities,
  locale,
  indented = false
}: {
  activities: AgentActivity[];
  locale: Locale;
  indented?: boolean;
}) {
  const run = summarizeAgentActivities(activities, locale);
  return (
    <section
      className="ai-run-timeline"
      data-status={activities.some((activity) => activity.status === "failed") ? "failed" : activities.some((activity) => activity.status !== "completed") ? "running" : "completed"}
      data-indent={indented || undefined}
      aria-label={run.title}
    >
      <header className="ai-run-timeline-header">
        <span className="ai-run-timeline-state" aria-hidden="true" />
        <span className="ai-run-timeline-copy">
          <span>{run.eyebrow}</span>
          <strong>{run.title}</strong>
        </span>
        <span className="ai-run-timeline-status">{run.status}</span>
      </header>
      <ol className="ai-run-steps">
        {activities.map((activity) => {
          const presentation = describeAgentActivity(activity, locale);
          const input = formatActivityPayload(activity.input);
          const output = formatActivityPayload(activity.result);
          return (
            <li className="ai-run-step" data-kind={activity.kind} data-status={activity.status} key={activity.id}>
              <span className="ai-run-step-icon" aria-hidden="true"><ActivityIcon kind={activity.kind} /></span>
              <details className="ai-run-step-details">
                <summary>
                  <span className="ai-run-step-copy">
                    <strong>{presentation.title}</strong>
                    {activity.target ? <code title={activity.target}>{activity.target}</code> : <span>{activity.name}</span>}
                  </span>
                  <span className="ai-run-step-status">{presentation.status}</span>
                </summary>
                {(input || output) ? (
                  <div className="ai-run-step-payload">
                    {input ? (
                      <div>
                        <span>{presentation.input}</span>
                        <pre>{input}</pre>
                      </div>
                    ) : null}
                    {output ? (
                      <div>
                        <span>{presentation.output}</span>
                        <pre>{output}</pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function readSession(): { threadId: string; messages: Message[] } {
  const fallback = { threadId: crypto.randomUUID(), messages: [] as Message[] };
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(SESSION_KEY) ?? "null"
    ) as typeof fallback | null;
    if (!value?.threadId || !Array.isArray(value.messages)) return fallback;
    return { ...value, messages: persistedMessages(value.messages) };
  } catch {
    return fallback;
  }
}

function sessionAuth(call: PreparedCall): Record<string, unknown> | undefined {
  let stored: { auth?: Record<string, unknown> } = {};
  try {
    stored = JSON.parse(
      window.sessionStorage.getItem(call.operation.credentialStorageKey) ?? "{}"
    ) as typeof stored;
  } catch {
    return undefined;
  }
  const auth = stored.auth;
  if (!auth?.type) return undefined;
  const scheme = call.auth.find((item) => item.type === auth.type) ?? call.auth[0];
  if (!scheme) return undefined;
  return { ...auth, schemeId: scheme.id };
}

export function AiAssistant({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [floatingTrigger, setFloatingTrigger] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [threadId, setThreadId] = useState("");
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [checkingRuntime, setCheckingRuntime] = useState(false);
  const [prepared, setPrepared] = useState<PreparedCall[]>([]);
  const [executions, setExecutions] = useState<Record<number, ExecutionState>>({});
  const agentRef = useRef<HttpAgent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const session = readSession();
    setMessages(session.messages);
    setThreadId(session.threadId);
    agentRef.current = new HttpAgent({
      url: "/api/ai/v1/agent",
      threadId: session.threadId,
      initialMessages: session.messages
    });
    setHydrated(true);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 740px)");
    const updatePlacement = () => setFloatingTrigger(query.matches);
    updatePlacement();
    query.addEventListener("change", updatePlacement);
    return () => query.removeEventListener("change", updatePlacement);
  }, []);

  useEffect(() => {
    if (!hydrated || !threadId) return;
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ threadId, messages: persistedMessages(messages) })
    );
  }, [hydrated, messages, threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [activities, messages, prepared, running]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const siteFrame = document.querySelector<HTMLElement>(".site-frame");
    const siteFrameWasInert = siteFrame?.hasAttribute("inert") ?? false;
    document.body.style.overflow = "hidden";
    if (!siteFrameWasInert) siteFrame?.setAttribute("inert", "");
    window.requestAnimationFrame(() => textareaRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (!siteFrameWasInert) siteFrame?.removeAttribute("inert");
      window.removeEventListener("keydown", closeOnEscape);
      triggerRef.current?.focus();
    };
  }, [open]);

  const context = useMemo(() => [
    { description: "locale", value: locale },
    {
      description: "current Pontx Hub route",
      value: `${location.pathname}${location.search}`
    }
  ], [locale, location.pathname, location.search]);

  const checkRuntime = async () => {
    setCheckingRuntime(true);
    try {
      const response = await fetch("/api/ai/v1/usage", {
        headers: { Accept: "application/json" }
      });
      if (response.ok) {
        setStatus((current) => current?.kind === "runtime" ? null : current);
      }
    } catch {
      // Keep the recoverable runtime notice visible until a later retry succeeds.
    } finally {
      setCheckingRuntime(false);
    }
  };

  const showRuntimeStatus = () => {
    setStatus({
      kind: "runtime",
      message: text.usageUnavailable as string,
      tone: "warning"
    });
    void checkRuntime();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    const agent = agentRef.current;
    if (!value || !agent || running) return;
    setInput("");
    setStatus(null);
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content: value });
    setMessages([...agent.messages]);
    setRunning(true);
    try {
      await agent.runAgent({ context }, {
        onMessagesChanged({ messages: next }) {
          setMessages(next.map((message) => ({ ...message })) as Message[]);
        },
        onToolCallStartEvent({ event }) {
          setActivities((current) => current.some((activity) => activity.id === event.toolCallId)
            ? current
            : [...current, startAgentActivity(event)]);
        },
        onToolCallArgsEvent({ event, partialToolCallArgs }) {
          setActivities((current) => current.map((activity) => (
            activity.id === event.toolCallId
              ? updateAgentActivityArguments(activity, partialToolCallArgs)
              : activity
          )));
        },
        onToolCallEndEvent({ event, toolCallArgs }) {
          setActivities((current) => current.map((activity) => (
            activity.id === event.toolCallId
              ? updateAgentActivityArguments(activity, toolCallArgs)
              : activity
          )));
        },
        onToolCallResultEvent({ event }) {
          setActivities((current) => current.map((activity) => (
            activity.id === event.toolCallId
              ? completeAgentActivity(activity, event.content)
              : activity
          )));
        },
        onCustomEvent({ event }) {
          if (event.name === "pontx.request_prepared") {
            setPrepared((current) => [...current, event.value as PreparedCall]);
          }
        },
        onRunErrorEvent({ event }) {
          setActivities((current) => current.map(failAgentActivity));
          if (event.code === "ai_usage_unavailable") {
            showRuntimeStatus();
            return;
          }
          setStatus({
            kind: event.code === "user_daily_limit" || event.code === "global_daily_budget"
              ? "limit"
              : "error",
            message: event.code === "user_daily_limit"
              ? text.limit as string
              : event.code === "global_daily_budget"
                ? text.globalLimit as string
                : event.message || text.unavailable as string,
            tone: event.code === "user_daily_limit" || event.code === "global_daily_budget"
              ? "warning"
              : "danger"
          });
        }
      });
    } catch (error) {
      setActivities((current) => current.map(failAgentActivity));
      const message = error instanceof Error ? error.message : "";
      if (message.includes("ai_usage_unavailable")) {
        showRuntimeStatus();
      } else {
        setStatus({
          kind: message.includes("429") ? "limit" : "error",
          message: message.includes("401")
            ? text.signIn as string
            : message.includes("global_daily_budget")
              ? text.globalLimit as string
              : message.includes("429")
                ? text.limit as string
                : text.unavailable as string,
          tone: message.includes("429") ? "warning" : "danger"
        });
      }
    } finally {
      setMessages([...(agentRef.current?.messages ?? [])]);
      setRunning(false);
    }
  };

  const execute = async (
    call: PreparedCall,
    index: number,
    confirmationToken?: string
  ) => {
    setExecutions((state) => ({
      ...state,
      [index]: { ...state[index], status: "working" }
    }));
    const auth = sessionAuth(call);
    if (call.auth.length && !auth) {
      setExecutions((state) => ({
        ...state,
        [index]: { status: "error", error: text.credentials as string }
      }));
      return;
    }
    const request = { ...call.request, ...(auth ? { auth } : {}) };
    try {
      if (!confirmationToken) {
        const response = await fetch("/api/v1/playground/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request)
        });
        const body = await response.json() as {
          data?: Record<string, unknown>;
          error?: { message?: string };
        };
        if (!response.ok || !body.data) {
          throw new Error(body.error?.message || `HTTP ${response.status}`);
        }
        const token = typeof body.data.confirmationToken === "string"
          ? body.data.confirmationToken
          : undefined;
        if (body.data.requiresConfirmation && token) {
          setExecutions((state) => ({
            ...state,
            [index]: {
              status: "confirm",
              preview: body.data,
              confirmationToken: token
            }
          }));
          return;
        }
      }
      const response = await fetch("/api/v1/playground/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...request,
          ...(confirmationToken ? { confirmationToken } : {})
        })
      });
      const body = await response.json() as {
        data?: Record<string, unknown>;
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(body.error?.message || `HTTP ${response.status}`);
      }
      setExecutions((state) => ({
        ...state,
        [index]: { status: "done", result: body.data }
      }));
    } catch (error) {
      setExecutions((state) => ({
        ...state,
        [index]: {
          status: "error",
          error: error instanceof Error ? error.message : text.unavailable as string
        }
      }));
    }
  };

  const clear = () => {
    const nextThread = crypto.randomUUID();
    agentRef.current?.abortRun();
    agentRef.current = new HttpAgent({
      url: "/api/ai/v1/agent",
      threadId: nextThread
    });
    setThreadId(nextThread);
    setMessages([]);
    setActivities([]);
    setPrepared([]);
    setExecutions({});
    setStatus(null);
    window.sessionStorage.removeItem(SESSION_KEY);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const suggestions = text.suggestions as string[][];
  const visibleMessages = messages.filter(isRenderableConversationMessage);
  const messageIds = new Set(messages.map((message) => message.id));
  const hasTranscript = Boolean(visibleMessages.length || activities.length);
  const trigger = (
    <Button
      ref={triggerRef}
      type="button"
      variant="outline"
      size="sm"
      className="ai-assistant-trigger"
      aria-label={text.label as string}
      title={text.label as string}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen(true)}
    >
      <AgentIcon className="ai-assistant-trigger-icon" />
      <span className="ai-assistant-trigger-label">{text.label as string}</span>
    </Button>
  );

  return (
    <>
      {hydrated && floatingTrigger ? createPortal(trigger, document.body) : trigger}

      {open && hydrated ? createPortal((
        <div className="ai-assistant-layer">
          <div
            className="ai-assistant-backdrop"
            aria-hidden="true"
            onMouseDown={() => setOpen(false)}
          />
          <Card
            ref={panelRef}
            variant="elevated"
            className="ai-assistant-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-assistant-title"
            aria-describedby="ai-assistant-description"
            onKeyDown={handleDialogKeyDown}
          >
            <header className="ai-assistant-header">
              <div className="ai-assistant-identity">
                <span className="ai-assistant-mark"><AgentIcon /></span>
                <div>
                  <div className="ai-assistant-statusline">
                    <StatusBadge tone="success" showDot>{text.live as string}</StatusBadge>
                    <span>{text.catalog as string}</span>
                  </div>
                  <h2 id="ai-assistant-title">{text.title as string}</h2>
                  <p id="ai-assistant-description">{text.subtitle as string}</p>
                </div>
              </div>
              <div className="ai-assistant-header-actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="iconSm"
                  aria-label={text.clear as string}
                  title={text.clear as string}
                  disabled={!hasTranscript && !prepared.length}
                  onClick={clear}
                >
                  <NewSessionIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="iconSm"
                  aria-label={text.close as string}
                  title={text.close as string}
                  onClick={() => setOpen(false)}
                >
                  <CloseIcon />
                </Button>
              </div>
            </header>

            <Separator />

            <div className="ai-assistant-feed" ref={scrollRef} aria-live="polite">
              {!hasTranscript ? (
                <div className="ai-assistant-empty-wrap">
                  <EmptyState
                    className="ai-assistant-empty"
                    icon={<span className="ai-assistant-empty-icon"><AgentIcon /></span>}
                    title={text.emptyTitle as string}
                    description={text.empty as string}
                  />
                  <div className="ai-assistant-suggestions" aria-label={text.emptyTitle as string}>
                    {suggestions.map(([label, prompt]) => (
                      <Button
                        key={label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setInput(prompt);
                          textareaRef.current?.focus();
                        }}
                      >
                        <span>{label}</span>
                        <span aria-hidden="true">↗</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((message) => {
                const messageActivities = message.role === "assistant"
                  ? activities.filter((activity) => activity.parentMessageId === message.id)
                  : [];
                if (!isRenderableConversationMessage(message)) {
                  return messageActivities.length ? (
                    <AgentRunTimeline activities={messageActivities} locale={locale} key={message.id} />
                  ) : null;
                }
                return (
                  <Fragment key={message.id}>
                    <article
                      className="ai-message"
                      data-role={message.role}
                      aria-label={message.role === "user" ? text.you as string : text.agent as string}
                    >
                      {message.role === "assistant" ? (
                        <span className="ai-message-avatar" aria-hidden="true">
                          <AgentIcon />
                        </span>
                      ) : null}
                      <div className="ai-message-content">
                        {message.role === "assistant" ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{messageText(message)}</ReactMarkdown>
                        ) : <p>{messageText(message)}</p>}
                      </div>
                    </article>
                    {messageActivities.length ? (
                      <AgentRunTimeline activities={messageActivities} locale={locale} indented />
                    ) : null}
                  </Fragment>
                );
              })}
              {(() => {
                const unassignedActivities = activities.filter(
                  (activity) => !activity.parentMessageId || !messageIds.has(activity.parentMessageId)
                );
                return unassignedActivities.length ? (
                  <AgentRunTimeline activities={unassignedActivities} locale={locale} />
                ) : null;
              })()}

              {prepared.map((call, index) => {
                const execution = executions[index] ?? { status: "idle" };
                return (
                  <Card
                    variant="muted"
                    className="ai-prepared-call"
                    key={`${call.operation.href}:${index}`}
                  >
                    <div className="ai-prepared-heading">
                      <div>
                        <span className="ai-prepared-label">{text.prepared as string}</span>
                        <strong>{call.operation.path}</strong>
                      </div>
                      <MethodBadge method={call.operation.method} compact />
                    </div>
                    <code className="ai-prepared-url">{call.preview.url}</code>
                    {call.preview.warnings.length ? (
                      <Alert tone="warning" className="ai-prepared-warning">
                        <AlertDescription>{call.preview.warnings.join(" ")}</AlertDescription>
                      </Alert>
                    ) : null}
                    <details className="ai-prepared-code">
                      <summary>{text.cli as string}</summary>
                      <pre>{call.cli}</pre>
                    </details>
                    {execution.status === "done" ? (
                      <details className="ai-prepared-code" open>
                        <summary>{text.response as string}</summary>
                        <pre>{JSON.stringify(execution.result, null, 2)}</pre>
                      </details>
                    ) : null}
                    {execution.error ? (
                      <Alert tone="danger">
                        <AlertDescription>{execution.error}</AlertDescription>
                      </Alert>
                    ) : null}
                    <div className="ai-prepared-actions">
                      <Button asChild variant="outline" size="sm">
                        <Link to={call.operation.href} onClick={() => setOpen(false)}>
                          {text.openEndpoint as string}
                        </Link>
                      </Button>
                      {call.preview.proxyEnabled ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={execution.status === "working" || execution.status === "done"}
                          onClick={() => execute(call, index, execution.confirmationToken)}
                        >
                          {execution.status === "working"
                            ? text.executing as string
                            : execution.status === "confirm"
                              ? text.confirm as string
                              : execution.status === "done"
                                ? text.completed as string
                                : text.previewRun as string}
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                );
              })}

              {running ? (
                <div className="ai-assistant-working" role="status">
                  <span className="ai-message-avatar" aria-hidden="true">
                    <AgentIcon />
                  </span>
                  <LoadingSpinner
                    className="ai-assistant-working-status"
                    size="sm"
                    text={text.working as string}
                  />
                </div>
              ) : null}
              {status ? (
                <Alert tone={status.tone} className="ai-assistant-error">
                  <AlertDescription>{status.message}</AlertDescription>
                  {status.kind === "runtime" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void checkRuntime()}
                      disabled={checkingRuntime}
                    >
                      {checkingRuntime
                        ? text.checkingRuntime as string
                        : text.checkRuntime as string}
                    </Button>
                  ) : null}
                </Alert>
              ) : null}
            </div>

            <form className="ai-assistant-composer" onSubmit={submit}>
              <div className="ai-assistant-input-shell">
                <textarea
                  ref={textareaRef}
                  value={input}
                  aria-label={text.inputLabel as string}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={text.placeholder as string}
                  rows={2}
                  disabled={!hydrated || running}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                {running ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    aria-label={text.stop as string}
                    title={text.stop as string}
                    onClick={() => agentRef.current?.abortRun()}
                  >
                    <StopIcon />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    aria-label={text.send as string}
                    title={text.send as string}
                    disabled={!hydrated || !input.trim()}
                  >
                    <RunIcon />
                  </Button>
                )}
              </div>
              <span className="ai-assistant-composer-hint">
                {text.composerHint as string}
              </span>
            </form>
          </Card>
        </div>
      ), document.body) : null}
    </>
  );
}
