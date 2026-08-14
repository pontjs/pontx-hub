import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import type { GlobalSearchResponse, Locale } from "~/lib/catalog/types";
import { GlobalSearchResults } from "./global-search-results";
import { AccountProvider } from "~/lib/accounts/account-context";

const search: GlobalSearchResponse = {
  strategy: "hybrid-semantic",
  semanticVersion: "pontx-multilingual-v1",
  query: "stock",
  locale: "zh",
  total: 2,
  offset: 0,
  limit: 20,
  counts: { api: 1, endpoint: 1, schema: 0 },
  items: [
    {
      id: "api:massive",
      kind: "api",
      score: 100,
      apiSlug: "massive",
      apiTitle: "Massive 股票市场数据 API",
      provider: "Massive",
      title: "Massive 股票市场数据 API",
      description: "股票与市场数据产品。",
      href: "/zh/apis/massive",
      match: { mode: "hybrid", fields: ["title", "product"] },
      category: "Finance",
      endpointCount: 6,
      schemaCount: 17
    },
    {
      id: "endpoint:massive/get-last-trade",
      kind: "endpoint",
      score: 90,
      apiSlug: "massive",
      apiTitle: "Massive 股票市场数据 API",
      provider: "Massive",
      title: "获取最新成交",
      description: "返回指定股票最近一笔可用成交。",
      href: "/zh/apis/massive/get-last-trade",
      match: { mode: "hybrid", fields: ["title", "response"] },
      operationSlug: "get-last-trade",
      operationId: "getLastTrade",
      method: "GET",
      path: "/v2/last/trade/{stocksTicker}",
      tag: "stocks"
    }
  ]
};

function renderResults(locale: Locale) {
  const localizedSearch = { ...search, locale };
  const router = createMemoryRouter([
    {
      id: "root",
      path: "*",
      element: createElement(AccountProvider, {
        initialState: { enabled: true, loaded: true, viewer: null, favorites: [] }
      }, createElement(GlobalSearchResults, { search: localizedSearch, locale }))
    }
  ], {
    initialEntries: [`/${locale}?q=stock`],
    hydrationData: { loaderData: {} }
  });

  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

describe("global search terminology", () => {
  it("labels API products separately from endpoints in Chinese", () => {
    const html = renderResults("zh");

    expect(html.match(/API 产品/g)).toHaveLength(3);
    expect(html).not.toContain("API 集合");
  });

  it("uses the matching English API product terminology", () => {
    const html = renderResults("en");

    expect(html).toContain("API products");
    expect(html).toContain("API product");
    expect(html).toContain("API</span>");
    expect(html).not.toContain("API collection");
  });

  it("offers save controls for Endpoints instead of API products", () => {
    const html = renderResults("zh");

    expect(html).toContain("登录后收藏接口: 获取最新成交");
    expect(html).not.toContain("登录后收藏接口: Massive 股票市场数据 API");
  });
});
