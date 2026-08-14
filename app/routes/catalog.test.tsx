import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { CatalogAccessStory } from "./catalog";

function renderStory(locale: "zh" | "en") {
  const router = createMemoryRouter([{
    path: "*",
    element: createElement(CatalogAccessStory, { locale })
  }], { initialEntries: [`/${locale}`] });
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

describe("catalog SDK and CLI story", () => {
  it("makes the three consistent call surfaces explicit in Chinese", () => {
    const html = renderStory("zh");

    expect(html).toContain("每个收录的 API，都有一致的 SDK 与 CLI 调用方式");
    expect(html).toContain("pontx-hub 负责全目录发现、预览与获准的在线调用");
    expect(html).toContain("@pontx/&lt;api&gt; SDK");
    expect(html).toContain("pontx-&lt;api&gt; CLI");
    expect(html).toContain('href="/zh/docs/cli"');
    expect(html).toContain('href="/zh/docs/sdk"');
    expect(html).toContain('href="/zh/docs/sdk#dedicated-cli"');
  });

  it("publishes the same product promise in English", () => {
    const html = renderStory("en");

    expect(html).toContain("Every curated API comes with a consistent SDK and CLI call model");
    expect(html).toContain("approved online calls");
    expect(html).toContain("Universal CLI");
    expect(html).toContain("Unified SDK");
    expect(html).toContain("Dedicated API CLI");
  });
});
