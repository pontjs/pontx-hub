import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import {
  EndpointPlaygroundHistory,
  historyInputSummary,
  type EndpointPlaygroundHistoryEntry
} from "./endpoint-playground-history";

const entry: EndpointPlaygroundHistoryEntry = {
  id: "11111111-1111-4111-8111-111111111111",
  serverId: "production",
  pathValues: { projectId: "project-1" },
  queryValues: { limit: 10 },
  headerValues: {},
  requestBody: { title: "Replay me" },
  hasRequestBody: true,
  omittedFields: ["body.password"],
  responseStatus: 201,
  durationMs: 83,
  createdAt: "2026-08-14T04:00:00.000Z"
};

function render(
  locale: "zh" | "en",
  entries: EndpointPlaygroundHistoryEntry[]
) {
  return renderToStaticMarkup(createElement(
    MemoryRouter,
    null,
    createElement(EndpointPlaygroundHistory, {
      locale,
      apiSlug: "dida365",
      operationSlug: "create-task",
      availableServerIds: ["production"],
      initialEntries: entries,
      refreshVersion: 0,
      onReplay: vi.fn()
    })
  ));
}

describe("EndpointPlaygroundHistory", () => {
  it("renders a compact Chinese retry row with privacy context", () => {
    const html = render("zh", [entry]);

    expect(html).toContain("当前接口 · 最近记录");
    expect(html).toContain("调试历史");
    expect(html).toContain("HTTP 201");
    expect(html).toContain("2 个参数 + Body");
    expect(html).toContain("已跳过 1 个敏感字段");
    expect(html).toContain("载入参数，不会自动发送请求");
    expect(html).toContain('href="/zh/account/history"');
  });

  it("renders the English current-endpoint empty state", () => {
    const html = render("en", []);

    expect(html).toContain("This endpoint · Recent runs");
    expect(html).toContain("No runs for this endpoint yet");
    expect(html).toContain('href="/en/account/history"');
  });

  it("summarizes zero, scalar, and body inputs without exposing values", () => {
    expect(historyInputSummary({
      ...entry,
      pathValues: {},
      queryValues: {},
      hasRequestBody: false
    }, "en")).toBe("No inputs");
    expect(historyInputSummary(entry, "en")).toBe("2 params + Body");
  });
});
