import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Pontx Agent presentation", () => {
  it("keeps connection state separate from the Pontx catalog source", async () => {
    const source = await readFile(new URL("./ai-assistant.tsx", import.meta.url), "utf8");

    expect(source).toContain('live: "已连接"');
    expect(source).toContain('catalog: "Pontx API Hub"');
    expect(source).toContain('subtitle: "搜索 API、生成代码并安全执行任务"');
    expect(source).not.toContain("已审核目录");
    expect(source).not.toContain("Reviewed catalog");
  });

  it("positions the product as an executing agent instead of a chatbot", async () => {
    const source = await readFile(new URL("./ai-assistant.tsx", import.meta.url), "utf8");

    expect(source).toContain('label: "Pontx Agent"');
    expect(source).toContain('send: "运行任务"');
    expect(source).toContain('emptyTitle: "交给 Agent 一个 API 任务"');
    expect(source).toContain('data-agent-icon="agent-operator"');
    expect(source).toContain('<circle cx="10.5" cy="9" r="3.2" />');
    expect(source).toContain('d="M4.8 19.25c.72-3.14 3.18-5.12 6.12-5.12s5.4 1.98 6.12 5.12"');
    expect(source).toContain('d="m17.55 2.9.64 1.96 1.96.64-1.96.64-.64 1.96-.64-1.96-1.96-.64 1.96-.64.64-1.96Z"');
    expect(source).not.toContain('data-agent-icon="agent-unit"');
    expect(source).not.toContain("AI 助手");
    expect(source).not.toContain("API Assistant");
    expect(source).not.toContain('<rect x="3.75" y="4.5" width="16.5" height="15" rx="2.5" />');
  });

  it("makes a recoverable runtime outage actionable instead of presenting it as an unready service", async () => {
    const source = await readFile(new URL("./ai-assistant.tsx", import.meta.url), "utf8");

    expect(source).toContain('message.includes("ai_usage_unavailable")');
    expect(source).toContain('event.code === "ai_usage_unavailable"');
    expect(source).toContain('usageUnavailable: "Pontx Agent 暂时无法连接运行服务。"');
    expect(source).toContain('checkRuntime: "重新检测"');
    expect(source).toContain('fetch("/api/ai/v1/usage"');
    expect(source).toContain('tone: "warning"');
  });

  it("uses beUI response and action states for compact Agent feedback", async () => {
    const source = await readFile(new URL("./ai-assistant.tsx", import.meta.url), "utf8");
    const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");

    expect(source).toContain('className="ai-assistant-working-status"');
    expect(source).toContain("<MessageTyping");
    expect(source).toContain("<StatefulButton");
    expect(styles).toContain("flex-direction: row;");
    expect(styles).toContain("padding-block: 0;");
    expect(styles).toContain(".ai-assistant-working-status > span:last-child");
  });

  it("renders a transcript-style conversation instead of two labeled cards", async () => {
    const source = await readFile(new URL("./ai-assistant.tsx", import.meta.url), "utf8");
    const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");

    expect(source).not.toContain('className="ai-message-meta"');
    expect(source).not.toContain('message.role === "user" ? "Y"');
    expect(source).toContain("<MotionMessage");
    expect(source).toContain("<MessageBubble");
    expect(source).toContain("<MessageScroller");
    expect(source).toContain("<PromptInput");
    expect(source).toContain("sendLabel={text.send as string}");
    expect(source).toContain("stopLabel={text.stop as string}");
    expect(styles).toContain("grid-template-columns: 28px minmax(0, 1fr);");
    expect(styles).toContain(".ai-message-bubble {");
  });

  it("filters non-text protocol messages and renders assistant Markdown safely", async () => {
    const source = await readFile(new URL("./ai-assistant.tsx", import.meta.url), "utf8");
    const session = await readFile(new URL("../lib/ai/agent-session.ts", import.meta.url), "utf8");
    const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");

    expect(source).toContain("isRenderableConversationMessage");
    expect(source).toContain("createAgentSession({ threadId, messages, prepared, executions })");
    expect(session).toContain("function isRenderableConversationMessage");
    expect(session).toContain("Boolean(messageText(message).trim())");
    expect(source).toContain("<ReactMarkdown remarkPlugins={[remarkGfm]}>");
    expect(session).toContain("messages: persistedMessages(input.messages)");
    expect(styles).toContain('.ai-message[data-role="assistant"] .ai-message-content pre');
    expect(styles).toContain('.ai-message[data-role="assistant"] .ai-message-content table');
  });

  it("keeps an Agent call recoverable across refreshes and gives a stalled call a bounded outcome", async () => {
    const source = await readFile(new URL("./ai-assistant.tsx", import.meta.url), "utf8");
    const session = await readFile(new URL("../lib/ai/agent-session.ts", import.meta.url), "utf8");

    expect(source).toContain("setPrepared(session.prepared)");
    expect(source).toContain("setExecutions(session.executions)");
    expect(source).toContain("postJsonWithTimeout");
    expect(source).toContain("AgentExecutionTimeoutError");
    expect(source).toContain("executionTimeout");
    expect(session).toContain("version: 2");
    expect(session).toContain("if (value.status === \"working\" || value.status === \"confirm\") return { status: \"idle\" };");
    expect(session).toContain("SENSITIVE_KEY");
  });

  it("renders AG-UI tool lifecycles as one scannable, expandable execution timeline", async () => {
    const source = await readFile(new URL("./ai-assistant.tsx", import.meta.url), "utf8");
    const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");

    expect(source).toContain("onToolCallStartEvent");
    expect(source).toContain("onToolCallArgsEvent");
    expect(source).toContain("onToolCallEndEvent");
    expect(source).toContain("onToolCallResultEvent");
    expect(source).toContain('className="ai-run-timeline"');
    expect(source).toContain('className="ai-run-step-details"');
    expect(source).toContain("activities={messageActivities}");
    expect(source).toContain("startAgentActivity(event)");
    expect(styles).toContain(".ai-run-step-details[open] summary");
    expect(styles).toContain(".ai-run-step-payload pre");
  });
});
