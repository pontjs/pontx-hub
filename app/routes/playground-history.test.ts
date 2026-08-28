import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import PlaygroundHistory, { headers, meta } from "./playground-history";

vi.mock("~/components/account-navigation", () => ({
  AccountNavigation: () => null
}));

const entry = {
  id: "11111111-1111-4111-8111-111111111111",
  apiSlug: "dida365",
  operationSlug: "create-task",
  serverId: "production",
  pathValues: {},
  queryValues: {},
  headerValues: {},
  requestBody: { title: "Replay me" },
  hasRequestBody: true,
  omittedFields: ["body.password"],
  responseStatus: 201,
  durationMs: 83,
  createdAt: "2026-08-11T04:00:00.000Z",
  available: true,
  apiTitle: "Dida365",
  provider: "Dida365",
  operationTitle: "Create task",
  method: "POST" as const,
  pathTemplate: "/open/v1/task",
  serverUrl: "https://api.dida365.com"
};

function render(locale: "zh" | "en", entries = [entry]) {
  return renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: [`/${locale}/account/history`] },
    createElement(PlaygroundHistory, {
      loaderData: {
        locale,
        viewer: { id: "viewer-1", name: "Jason", image: null },
        projects: [{
          id: "22222222-2222-4222-8222-222222222222",
          name: "Jason's workspace",
          isPersonal: true
        }],
        entries
      }
    } as never)
  ));
}

describe("Playground history account page", () => {
  it("renders the Chinese replay and credential privacy states", () => {
    const html = render("zh");
    expect(html).toContain("调试历史");
    expect(html).toContain("重新调试");
    expect(html).toContain("凭证不进入历史");
    expect(html).toContain("body.password");
    expect(html).toContain("HTTP 201");
  });

  it("renders the English empty state", () => {
    const html = render("en", []);
    expect(html).toContain("Playground history");
    expect(html).toContain("No Playground history yet");
    expect(html).toContain("Find an API");
  });

  it("is private and excluded from search indexing", () => {
    expect(headers()).toEqual({ "Cache-Control": "private, no-store" });
    expect(meta({ data: { locale: "en" } } as never)).toContainEqual({
      name: "robots",
      content: "noindex,nofollow"
    });
  });
});
