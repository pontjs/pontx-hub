import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import { OperationSeoContent } from "./operation-seo-content";

describe("OperationSeoContent", () => {
  it("renders endpoint input and output metadata as semantic server HTML", () => {
    const match = getCatalogOperation("dida365", "create-project");
    expect(match).toBeDefined();

    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(OperationSeoContent, {
          locale: "zh",
          api: match!.api,
          operation: match!.operation
        })
      )
    );

    expect(html).toContain("<h1 id=\"endpoint-title\">创建项目</h1>");
    expect(html).toContain("<h2 id=\"body-heading\">Body 参数</h2>");
    expect(html).toContain("ProjectCreate");
    expect(html).toContain("color");
    expect(html).toContain("sortOrder");
    expect(html).toContain("<h2 id=\"responses-heading\">响应</h2>");
    expect(html).toContain("Project</a>");
    expect(html).toContain("OAuth2");
  });

  it.each([
    [
      "zh" as const,
      "仅预览：",
      "该地址当前返回 Stooq 404 页面，已停止代理执行。"
    ],
    [
      "en" as const,
      "Preview only:",
      "This URL currently returns Stooq&#x27;s 404 page, so proxy execution is disabled."
    ]
  ])(
    "renders the localized preview-only reason in %s",
    (locale, label, reason) => {
      const match = getCatalogOperation("stooq", "download-latest-quotes");
      expect(match).toBeDefined();

      const html = renderToStaticMarkup(
        createElement(
          MemoryRouter,
          null,
          createElement(OperationSeoContent, {
            locale,
            api: match!.api,
            operation: match!.operation
          })
        )
      );

      expect(html).toContain(label);
      expect(html).toContain(reason);
    }
  );
});
