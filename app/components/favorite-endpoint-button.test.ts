import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { AccountProvider } from "~/lib/accounts/account-context";
import { FavoriteEndpointButton } from "./favorite-endpoint-button";

function renderFavorite(locale: "zh" | "en", viewer: boolean) {
  const router = createMemoryRouter([{
    path: "*",
    element: createElement(AccountProvider, {
      initialState: {
        enabled: true,
        loaded: true,
        viewer: viewer ? { id: "viewer-1", name: "Viewer" } : null,
        favorites: []
      }
    }, createElement(FavoriteEndpointButton, {
      apiSlug: "frankfurter-v2",
      operationSlug: "get-rates",
      endpointLabel: locale === "zh" ? "获取汇率" : "Get rates",
      locale,
      compact: true
    }))
  }], { initialEntries: [`/${locale}/apis/frankfurter-v2/get-rates`] });
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

describe("FavoriteEndpointButton", () => {
  it("describes the compact icon with a visible Chinese tooltip", () => {
    const html = renderFavorite("zh", true);
    expect(html).toContain('role="tooltip"');
    expect(html).toContain(">收藏接口</span>");
    expect(html).toMatch(/aria-describedby="[^"]+"/);
  });

  it("explains the signed-out compact action in English", () => {
    const html = renderFavorite("en", false);
    expect(html).toContain(">Sign in to save Endpoint</span>");
    expect(html).toContain('role="tooltip"');
  });
});
