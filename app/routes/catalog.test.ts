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
  it("states the SDK and CLI offer plainly in Chinese", () => {
    const html = renderSummary("zh");

    expect(html).toContain("每个收录的 API 都有自己的 SDK 和 CLI，而且用法一致。");
    expect(html).toContain("在 Pontx Hub 里找到 API、查看接口");
    expect(html).toContain("要接入项目就复制 SDK 代码，要在终端调用就运行对应的 CLI 命令");
    expect(html).toContain("了解使用方式");
    expect(html).not.toContain("@pontx/");
    expect(html).not.toContain("获准调用");
    expect(html).toContain('href="/zh/docs"');
    expect(html.match(/<a /g)).toHaveLength(1);
  });

  it("states the SDK and CLI offer plainly in English", () => {
    const html = renderSummary("en");

    expect(html).toContain("Every API here has an SDK and a CLI, and they all work the same way.");
    expect(html).toContain("Use Pontx Hub to find an API and understand its endpoints.");
    expect(html).toContain("Copy SDK code into your app, or run its CLI command in your terminal.");
    expect(html).toContain("See how it works");
    expect(html).not.toContain("@pontx/");
    expect(html).not.toContain("approved calls");
    expect(html).toContain('href="/en/docs"');
    expect(html.match(/<a /g)).toHaveLength(1);
  });
});
