import { HttpAgent, type Message } from "@ag-ui/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import type { Locale } from "~/lib/catalog/types";

type PreparedCall = {
  request: Record<string, unknown>;
  preview: {
    method: string;
    url: string;
    curl: string;
    requiresConfirmation: boolean;
    proxyEnabled: boolean;
    warnings: string[];
  };
  auth: Array<{ id: string; type: string }>;
  operation: {
    method: string;
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
    title: "API 助手",
    subtitle: "搜索、理解、生成代码并安全调用 API",
    close: "关闭",
    empty: "问我某个 API 能做什么、如何鉴权、费用多少，或直接生成 SDK / CLI 调用。",
    placeholder: "例如：查找汇率 API 并生成调用代码",
    send: "发送",
    stop: "停止",
    working: "正在检索 Pontx API 资料…",
    signIn: "登录后使用 AI 助手",
    limit: "今日额度已用完，请明天再试。",
    unavailable: "AI 助手暂时不可用。",
    prepared: "已准备请求",
    previewRun: "预览并调用",
    confirm: "确认执行写操作",
    executing: "正在执行…",
    completed: "调用完成",
    credentials: "请先在接口 Playground 中配置会话鉴权。",
    openEndpoint: "打开接口",
    cli: "CLI 调用",
    clear: "清空会话"
  },
  en: {
    label: "AI Assistant",
    title: "API Assistant",
    subtitle: "Discover, understand, generate code, and call APIs safely",
    close: "Close",
    empty: "Ask what an API does, how authentication or pricing works, or request SDK / CLI code.",
    placeholder: "Example: find an exchange-rate API and generate a call",
    send: "Send",
    stop: "Stop",
    working: "Searching approved Pontx API resources…",
    signIn: "Sign in to use the AI assistant",
    limit: "Today's message allowance is exhausted. Try again tomorrow.",
    unavailable: "The AI assistant is currently unavailable.",
    prepared: "Request prepared",
    previewRun: "Preview and call",
    confirm: "Confirm mutation",
    executing: "Executing…",
    completed: "Call completed",
    credentials: "Configure session credentials in the endpoint Playground first.",
    openEndpoint: "Open endpoint",
    cli: "CLI command",
    clear: "Clear session"
  }
} satisfies Record<Locale, Record<string, string>>;

const SESSION_KEY = "pontx:ai:session:v1";

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
    const value = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? "null") as typeof fallback | null;
    if (!value?.threadId || !Array.isArray(value.messages)) return fallback;
    return value;
  } catch {
    return fallback;
  }
}

function sessionAuth(call: PreparedCall): Record<string, unknown> | undefined {
  let stored: { auth?: Record<string, unknown> } = {};
  try {
    stored = JSON.parse(window.sessionStorage.getItem(call.operation.credentialStorageKey) ?? "{}") as typeof stored;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState("");
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [prepared, setPrepared] = useState<PreparedCall[]>([]);
  const [executions, setExecutions] = useState<Record<number, ExecutionState>>({});
  const agentRef = useRef<HttpAgent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (!hydrated || !threadId) return;
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ threadId, messages }));
  }, [hydrated, messages, threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, prepared, running]);

  const context = useMemo(() => [
    { description: "locale", value: locale },
    { description: "current Pontx Hub route", value: `${location.pathname}${location.search}` }
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
          setStatus(event.code === "user_daily_limit" ? text.limit : event.message || text.unavailable);
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setStatus(message.includes("401") ? text.signIn : message.includes("429") ? text.limit : text.unavailable);
    } finally {
      setMessages([...(agentRef.current?.messages ?? [])]);
      setRunning(false);
    }
  };

  const execute = async (call: PreparedCall, index: number, confirmationToken?: string) => {
    setExecutions((state) => ({ ...state, [index]: { ...state[index], status: "working" } }));
    const auth = sessionAuth(call);
    if (call.auth.length && !auth) {
      setExecutions((state) => ({ ...state, [index]: { status: "error", error: text.credentials } }));
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
        const body = await response.json() as { data?: Record<string, unknown>; error?: { message?: string } };
        if (!response.ok || !body.data) throw new Error(body.error?.message || `HTTP ${response.status}`);
        const token = typeof body.data.confirmationToken === "string" ? body.data.confirmationToken : undefined;
        if (body.data.requiresConfirmation && token) {
          setExecutions((state) => ({ ...state, [index]: { status: "confirm", preview: body.data, confirmationToken: token } }));
          return;
        }
      }
      const response = await fetch("/api/v1/playground/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, ...(confirmationToken ? { confirmationToken } : {}) })
      });
      const body = await response.json() as { data?: Record<string, unknown>; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || `HTTP ${response.status}`);
      setExecutions((state) => ({ ...state, [index]: { status: "done", result: body.data } }));
    } catch (error) {
      setExecutions((state) => ({ ...state, [index]: { status: "error", error: error instanceof Error ? error.message : text.unavailable } }));
    }
  };

  const clear = () => {
    const nextThread = crypto.randomUUID();
    agentRef.current?.abortRun();
    agentRef.current = new HttpAgent({ url: "/api/ai/v1/agent", threadId: nextThread });
    setThreadId(nextThread);
    setMessages([]);
    setPrepared([]);
    setExecutions({});
    setStatus("");
    window.sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <>
      <button type="button" className="ai-assistant-trigger" aria-label={text.label} onClick={() => setOpen(true)}>
        <span aria-hidden="true">✦</span><span className="ai-assistant-trigger-label">{text.label}</span>
      </button>
      {open ? <div className="ai-assistant-layer">
        <button className="ai-assistant-backdrop" type="button" aria-label={text.close} onClick={() => setOpen(false)} />
        <section className="ai-assistant-panel" role="dialog" aria-modal="true" aria-label={text.title}>
          <header>
            <div><span className="ai-assistant-kicker">PONTX / AG-UI</span><h2>{text.title}</h2><p>{text.subtitle}</p></div>
            <button type="button" aria-label={text.close} onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="ai-assistant-feed" ref={scrollRef} aria-live="polite">
            {!messages.length ? <div className="ai-assistant-empty"><span>✦</span><p>{text.empty}</p></div> : null}
            {messages.filter((message) => message.role === "user" || message.role === "assistant").map((message) => (
              <article key={message.id} data-role={message.role}><small>{message.role === "user" ? "YOU" : "PONTX"}</small><p>{messageText(message)}</p></article>
            ))}
            {prepared.map((call, index) => {
              const execution = executions[index] ?? { status: "idle" };
              return <article className="ai-prepared-call" key={`${call.operation.href}:${index}`}>
                <div><small>{text.prepared}</small><strong><span>{call.operation.method}</span> {call.preview.url}</strong></div>
                <details><summary>{text.cli}</summary><pre>{call.cli}</pre></details>
                {execution.status === "done" ? <pre>{JSON.stringify(execution.result, null, 2)}</pre> : null}
                {execution.error ? <p className="ai-assistant-error">{execution.error}</p> : null}
                <div className="ai-prepared-actions">
                  <Link to={call.operation.href} onClick={() => setOpen(false)}>{text.openEndpoint}</Link>
                  {call.preview.proxyEnabled ? <button type="button" disabled={execution.status === "working" || execution.status === "done"} onClick={() => execute(call, index, execution.confirmationToken)}>
                    {execution.status === "working" ? text.executing : execution.status === "confirm" ? text.confirm : execution.status === "done" ? text.completed : text.previewRun}
                  </button> : null}
                </div>
              </article>;
            })}
            {running ? <p className="ai-assistant-working"><span />{text.working}</p> : null}
            {status ? <p className="ai-assistant-error">{status}</p> : null}
          </div>
          <form onSubmit={submit}>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={text.placeholder} rows={3} disabled={!hydrated || running} onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
            }} />
            <div><button type="button" className="ai-assistant-clear" onClick={clear}>{text.clear}</button><button type={running ? "button" : "submit"} onClick={running ? () => agentRef.current?.abortRun() : undefined}>{running ? text.stop : text.send}</button></div>
          </form>
        </section>
      </div> : null}
    </>
  );
}
