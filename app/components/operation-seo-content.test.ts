import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import { OperationSeoContent } from "./operation-seo-content";
import { RequestExampleNotice } from "./request-example-notice";

describe("OperationSeoContent", () => {
  it.each([
    [
      "zh" as const,
      "已填入一组可成功调用的示例值；检查并确认后即可发送。",
      "一键填入成功示例"
    ],
    [
      "en" as const,
      "A successful request example is prefilled and ready to review before sending.",
      "Prefill successful example"
    ]
  ])("describes the successful example as a quick prefill in %s", (locale, description, action) => {
    const match = getCatalogOperation("dida365", "create-project");
    expect(match).toBeDefined();

    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(RequestExampleNotice, {
          locale,
          api: match!.api,
          operation: match!.operation,
          example: match!.operation.requestExamples[0],
          onReset: () => undefined
        })
      )
    );

    expect(html).toContain(description);
    expect(html).toContain(action);
    expect(html).not.toContain(locale === "zh" ? "恢复此示例" : "Restore example");
  });

  it("uses the shared Select when an Endpoint has multiple request examples", () => {
    const match = getCatalogOperation("dida365", "create-project");
    expect(match).toBeDefined();
    const example = match!.operation.requestExamples[0];
    const operation = {
      ...match!.operation,
      requestExamples: [
        example,
        {
          ...example,
          id: "alternative",
          title: { zh: "备用成功示例", en: "Alternative successful example" }
        }
      ]
    };

    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(RequestExampleNotice, {
          locale: "zh",
          api: match!.api,
          operation,
          example,
          onSelect: () => undefined
        })
      )
    );

    expect(html).toContain("request-example-select-trigger");
    expect(html).toContain('role="combobox"');
    expect(html).toContain(example.title.zh);
    expect(html).toContain('<select aria-hidden="true"');
    expect(html).not.toContain('<option');
  });

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
    expect(html).toContain("成功请求示例");
  });

  it("renders arbitrary dynamic inputs and their prerequisite Endpoint", () => {
    const match = getCatalogOperation("dida365", "create-task");
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

    expect(html).toContain("需补充输入");
    expect(html).toContain("body/projectId");
    expect(html).toContain("获取项目列表");
    expect(html).toContain("/zh/apis/dida365/get-user-projects");
  });

  it.each([
    [
      "zh" as const,
      "仅预览：",
      "此接口仅支持预览，Hub 不会向供应商发送请求。"
    ],
    [
      "en" as const,
      "Preview only:",
      "This endpoint is preview-only; Hub will not send the request to the provider."
    ]
  ])(
    "renders the localized preview-only reason in %s",
    (locale, label, reason) => {
      const match = getCatalogOperation("massive", "get-previous-close");
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
