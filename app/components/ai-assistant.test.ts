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
    expect(source).toContain('<rect x="3.75" y="4.5" width="16.5" height="15" rx="2.5" />');
    expect(source).not.toContain("AI 助手");
    expect(source).not.toContain("API Assistant");
    expect(source).not.toContain('d="M7 5.5h10a2.5');
  });

  it("explains an unavailable usage service without collapsing it into a generic error", async () => {
    const source = await readFile(new URL("./ai-assistant.tsx", import.meta.url), "utf8");

    expect(source).toContain('message.includes("ai_usage_unavailable")');
    expect(source).toContain('usageUnavailable: "Pontx Agent 的运行服务尚未就绪。"');
  });

  it("adapts the shared loading state into one compact Agent response row", async () => {
    const source = await readFile(new URL("./ai-assistant.tsx", import.meta.url), "utf8");
    const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");

    expect(source).toContain('className="ai-assistant-working-status"');
    expect(styles).toContain(".ai-assistant-working-status > div {");
    expect(styles).toContain("flex-direction: row;");
    expect(styles).toContain("padding-block: 0;");
    expect(styles).toContain("flex: 0 0 14px;");
    expect(styles).toContain(
      ".ai-assistant-working-status > .space-y-3 > :not([hidden])"
    );
  });

  it("renders a transcript-style conversation instead of two labeled cards", async () => {
    const source = await readFile(new URL("./ai-assistant.tsx", import.meta.url), "utf8");
    const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");

    expect(source).not.toContain('className="ai-message-meta"');
    expect(source).not.toContain('message.role === "user" ? "Y"');
    expect(source).toContain('message.role === "assistant" ? (');
    expect(styles).toContain("grid-template-columns: 28px minmax(0, 1fr);");
    expect(styles).toContain('border-radius: 18px;');
  });
});
