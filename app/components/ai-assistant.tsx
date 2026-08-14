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
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router";
import { MethodBadge } from "~/components/method-badge";
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

const copy = {
  zh: {
    label: "AI 助手",
    title: "Pontx API 助手",
    subtitle: "基于 Pontx API 目录，检索、生成代码并安全调用",
    close: "关闭 AI 助手",
    emptyTitle: "从 API 目录开始",
    empty: "描述你想实现的能力，我会定位对应接口，说明鉴权与费用，并生成可执行的统一 SDK 或 CLI 代码。",
    suggestions: [
      ["查找 API", "帮我查找一个汇率 API，并说明应该使用哪个接口。"],
      ["了解鉴权", "滴答清单 API 应该如何完成 OAuth 鉴权？"],
      ["生成统一 SDK", "为 Frankfurter 最新汇率接口生成统一 SDK 调用代码。"],
      ["查看费用", "Massive API 的调用费用和免费额度是什么？"]
    ],
    placeholder: "描述目标，例如：查找汇率 API 并生成统一 SDK 调用代码",
    inputLabel: "给 Pontx API 助手发送消息",
    send: "发送",
    stop: "停止",
    working: "正在检索 Pontx API 资料…",
    signIn: "登录后使用 AI 助手",
    limit: "今日额度已用完，请明天再试。",
    unavailable: "AI 助手暂时不可用。",
    prepared: "请求预览",
    previewRun: "预览并调用",
    confirm: "确认执行写操作",
    executing: "正在执行…",
    completed: "调用完成",
    credentials: "请先在接口 Playground 中配置会话鉴权。",
    openEndpoint: "查看接口",
    cli: "CLI 调用",
    response: "响应结果",
    clear: "新建会话",
    live: "已连接",
    catalog: "Pontx API Hub",
    you: "你",
    agent: "Pontx",
    composerHint: "Enter 发送 · Shift + Enter 换行"
  },
  en: {
    label: "AI Assistant",
    title: "Pontx API Assistant",
    subtitle: "Search the Pontx API catalog, generate code, and execute safely",
    close: "Close AI assistant",
    emptyTitle: "Start with the API catalog",
    empty: "Describe what you want to build. I’ll identify the endpoint, explain auth and pricing, and generate executable Unified SDK or CLI code.",
    suggestions: [
      ["Find an API", "Find an exchange-rate API and recommend the right endpoint."],
      ["Understand auth", "How do I complete OAuth authentication for the Dida365 API?"],
      ["Generate Unified SDK", "Generate Unified SDK integration code for the latest Frankfurter rates endpoint."],
      ["Check pricing", "What are the pricing and free-tier details for the Massive API?"]
    ],
    placeholder: "Describe a goal, such as finding an exchange-rate API and generating Unified SDK code",
    inputLabel: "Send a message to the Pontx API assistant",
    send: "Send",
    stop: "Stop",
    working: "Searching Pontx API resources…",
    signIn: "Sign in to use the AI assistant",
    limit: "Today's message allowance is exhausted. Try again tomorrow.",
    unavailable: "The AI assistant is currently unavailable.",
    prepared: "Request preview",
    previewRun: "Preview and call",
    confirm: "Confirm mutation",
    executing: "Executing…",
    completed: "Call completed",
    credentials: "Configure session credentials in the endpoint Playground first.",
    openEndpoint: "View endpoint",
    cli: "CLI command",
    response: "Response",
    clear: "New session",
    live: "Connected",
    catalog: "Pontx API Hub",
    you: "You",
    agent: "Pontx",
    composerHint: "Enter to send · Shift + Enter for a new line"
  }
} satisfies Record<Locale, Record<string, string | string[][]>>;

const SESSION_KEY = "pontx:ai:session:v1";

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5.5h10a2.5 2.5 0 0 1 2.5 2.5v6A2.5 2.5 0 0 1 17 16.5h-6l-4.5 3v-3A2.5 2.5 0 0 1 4.5 14V8A2.5 2.5 0 0 1 7 5.5Z" />
      <path d="m8.5 9 2 2-2 2M13 13h2.5" />
    </svg>
  );
}

function CloseIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>;
}

function NewSessionIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>;
}

function SendIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m3 10 14-6-4.5 12-2.8-4.2L3 10Z" /><path d="m9.7 11.8 3-3" /></svg>;
}

function StopIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5.5" y="5.5" width="9" height="9" rx="1" /></svg>;
}

function messageText(message: Message): string {
  if (typeof message.content === "string") return message.content;
  if (!Array.isArray(message.content)) return "";
  return message.content
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function readSession(): { threadId: string; messages: Message[] } {
  const fallback = { threadId: crypto.randomUUID(), messages: [] as Message[] };
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(SESSION_KEY) ?? "null"
    ) as typeof fallback | null;
    if (!value?.threadId || !Array.isArray(value.messages)) return fallback;
    return value;
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
  const [threadId, setThreadId] = useState("");
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
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
      JSON.stringify({ threadId, messages })
    );
  }, [hydrated, messages, threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, prepared, running]);

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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    const agent = agentRef.current;
    if (!value || !agent || running) return;
    setInput("");
    setStatus("");
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content: value });
    setMessages([...agent.messages]);
    setRunning(true);
    try {
      await agent.runAgent({ context }, {
        onMessagesChanged({ messages: next }) {
          setMessages(next.map((message) => ({ ...message })) as Message[]);
        },
        onCustomEvent({ event }) {
          if (event.name === "pontx.request_prepared") {
            setPrepared((current) => [...current, event.value as PreparedCall]);
          }
        },
        onRunErrorEvent({ event }) {
          setStatus(
            event.code === "user_daily_limit"
              ? text.limit as string
              : event.message || text.unavailable as string
          );
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setStatus(
        message.includes("401")
          ? text.signIn as string
          : message.includes("429")
            ? text.limit as string
            : text.unavailable as string
      );
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
    setPrepared([]);
    setExecutions({});
    setStatus("");
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
  const visibleMessages = messages.filter(
    (message) => message.role === "user" || message.role === "assistant"
  );
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
                  disabled={!visibleMessages.length && !prepared.length}
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
              {!visibleMessages.length ? (
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

              {visibleMessages.map((message) => (
                <article
                  className="ai-message"
                  key={message.id}
                  data-role={message.role}
                >
                  <div className="ai-message-meta">
                    <span className="ai-message-avatar" aria-hidden="true">
                      {message.role === "user" ? "Y" : <AgentIcon />}
                    </span>
                    <strong>
                      {message.role === "user" ? text.you as string : text.agent as string}
                    </strong>
                  </div>
                  <p>{messageText(message)}</p>
                </article>
              ))}

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
                  <LoadingSpinner size="sm" text={text.working as string} />
                </div>
              ) : null}
              {status ? (
                <Alert tone="danger" className="ai-assistant-error">
                  <AlertDescription>{status}</AlertDescription>
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
                    <SendIcon />
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
