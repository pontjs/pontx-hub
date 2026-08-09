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
});
