import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { listCatalogSummaries } from "~/lib/catalog/catalog.server";
import type { CatalogSummary, Locale } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { ApiCard } from "./api-card";

function renderCard(api: CatalogSummary, locale: Locale) {
  const router = createMemoryRouter([
    {
      id: "root",
      path: "*",
      element: createElement(ApiCard, { api, locale, index: 0 })
    }
  ], { initialEntries: [`/${locale}`] });

  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

describe("ApiCard navigation", () => {
  it("keeps the overview and SDK as separate links", () => {
    const api = listCatalogSummaries().find((item) => item.slug === "dida365");
    if (!api) throw new Error("Expected Dida365 catalog API");
    const html = renderCard(api, "zh");

    expect(html).toContain('class="api-card-main"');
    expect(html).toContain('href="/zh/apis/dida365"');
    expect(html).toContain('href="/zh/sdks/dida365"');
    expect(html).toContain(`aria-label="打开 ${localize(api.title, "zh")} SDK 页面"`);
    expect(html).not.toContain('<a class="api-card"');
  });

  it("localizes the label and links published SDKs to their detail page", () => {
    const api = listCatalogSummaries().find((item) => item.slug === "massive");
    if (!api) throw new Error("Expected the Massive SDK in the catalog");
    const html = renderCard(api, "en");

    expect(html).toContain(`href="/en/sdks/${api.slug}"`);
    expect(html).toContain(`aria-label="Open the ${localize(api.title, "en")} SDK page"`);
    expect(html).toContain(`v${api.sdkVersion}`);
  });
});
