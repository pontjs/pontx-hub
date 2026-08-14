import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("AI assistant source labeling", () => {
  it("keeps connection state separate from the Pontx catalog source", async () => {
    const source = await readFile(new URL("./ai-assistant.tsx", import.meta.url), "utf8");

    expect(source).toContain('live: "已连接"');
    expect(source).toContain('catalog: "Pontx API Hub"');
    expect(source).toContain('subtitle: "基于 Pontx API 目录，检索、生成代码并安全调用"');
    expect(source).not.toContain("已审核目录");
    expect(source).not.toContain("Reviewed catalog");
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
