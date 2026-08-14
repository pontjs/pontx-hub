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
  it("explains the call model once in compact Chinese copy", () => {
    const html = renderSummary("zh");

    expect(html).toContain("每个收录的 API 都提供统一 SDK 与 CLI");
    expect(html).toContain("覆盖全目录检索、预览和获准调用");
    expect(html).toContain("@pontx/&lt;api&gt;");
    expect(html).toContain("pontx-&lt;api&gt;");
    expect(html).toContain('href="/zh/docs"');
    expect(html.match(/<a /g)).toHaveLength(1);
  });

  it("publishes the same compact promise in English", () => {
    const html = renderSummary("en");

    expect(html).toContain("Every curated API has a Unified SDK and CLI");
    expect(html).toContain("approved calls");
    expect(html).toContain("@pontx/&lt;api&gt;");
    expect(html).toContain("pontx-&lt;api&gt;");
    expect(html).toContain('href="/en/docs"');
    expect(html.match(/<a /g)).toHaveLength(1);
  });
});
