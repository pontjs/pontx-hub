import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { CatalogAccessSummary } from "./catalog";

function renderSummary(locale: "zh" | "en") {
  const router = createMemoryRouter([{
    path: "*",
    element: createElement(CatalogAccessSummary, { locale })
  }], { initialEntries: [`/${locale}`] });
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

describe("catalog SDK and CLI summary", () => {
  it("leads with the human benefit before explaining the catalog tools in Chinese", () => {
    const html = renderSummary("zh");

    expect(html).toContain("选好 API 后，直接复制代码接入项目。");
    expect(html).toContain("每个收录 API 都有一致的 SDK 和 CLI");
    expect(html).toContain("Pontx Hub CLI 用于在目录中搜索、查看接口和预览请求");
    expect(html).toContain("了解使用方式");
    expect(html).not.toContain("@pontx/");
    expect(html).not.toContain("获准调用");
    expect(html).toContain('href="/zh/docs"');
    expect(html.match(/<a /g)).toHaveLength(1);
  });

  it("keeps the same human-first structure in English", () => {
    const html = renderSummary("en");

    expect(html).toContain("Find the API you need. Add it to your project with ready-to-copy code.");
    expect(html).toContain("Every catalog API has a consistent SDK and CLI");
    expect(html).toContain("Pontx Hub CLI to search, inspect endpoints, and preview requests");
    expect(html).toContain("See how it works");
    expect(html).not.toContain("@pontx/");
    expect(html).not.toContain("approved calls");
    expect(html).toContain('href="/en/docs"');
    expect(html.match(/<a /g)).toHaveLength(1);
  });
});
