import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import { DocumentationEvidence, OperationSeoContent } from "./operation-seo-content";
import { RequestExampleNotice } from "./request-example-notice";

describe("OperationSeoContent", () => {
  it("opens every external evidence link in a new tab", () => {
    const match = getCatalogOperation("dida365", "create-project");
    expect(match).toBeDefined();
    const evidenceUrls = [
      "https://docs.example.com/reference/first",
      "https://docs.example.com/reference/second"
    ];

    const html = renderToStaticMarkup(createElement(DocumentationEvidence, {
      locale: "zh",
      api: match!.api,
      operation: { ...match!.operation, evidenceUrls }
    }));

    expect(html.match(/target="_blank"/g)).toHaveLength(evidenceUrls.length);
    expect(html.match(/rel="noreferrer"/g)).toHaveLength(evidenceUrls.length);
  });

  it.each([
    [
      "zh" as const,
      "已填入一组可成功调用的示例值；检查并确认后即可发送。",
      "在 Playground 中预览"
    ],
    [
      "en" as const,
      "A successful request example is prefilled and ready to review before sending.",
      "Preview successful example"
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
          onPreview: () => undefined
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

  it("renders typed SSE events as semantic server HTML", () => {
    const match = getCatalogOperation("dida365", "create-project");
    expect(match).toBeDefined();
    const operation = {
      ...match!.operation,
      sse: {
        unknownEventPolicy: "preserve" as const,
        events: [
          {
            name: "delta",
            dataFormat: "json" as const,
            schemaName: "Project",
            description: { zh: "项目变更。", en: "Project update." }
          },
          { name: "done", dataFormat: "text" as const, terminal: true }
        ]
      }
    };

    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(OperationSeoContent, { locale: "en", api: match!.api, operation })
      )
    );

    expect(html).toContain('<h2 id="sse-events-heading">Stream events</h2>');
    expect(html).toContain("Preserved as raw payloads for forward compatibility.");
    expect(html).toContain("Data format: JSON");
    expect(html).toContain("Terminal event");
    expect(html).toContain("/en/apis/dida365/schemas/Project");
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

  it.each(["zh" as const, "en" as const])(
    "does not render Stripe Identity as unavailable in %s",
    (locale) => {
      const match = getCatalogOperation(
        "stripe-identity",
        "get-identity-verification-sessions"
      );
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

      expect(html).not.toContain(locale === "zh" ? "暂不支持在线调用：" : "Online calls unavailable:");
    }
  );

  it.each([
    [
      "zh" as const,
      "暂不支持在线调用：",
      "当前 API 风格需要专用在线调用适配器，当前尚未提供。"
    ],
    [
      "en" as const,
      "Online calls unavailable:",
      "This API style needs a dedicated online-call adapter, which is not available yet."
    ]
  ])("identifies a real adapter gap without calling it preview-only in %s", (locale, status, reason) => {
    const match = getCatalogOperation("amazon-sqs", "list-queues");
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

    expect(html).toContain(status);
    expect(html).toContain(reason);
    expect(html).not.toContain(locale === "zh" ? "仅预览" : "Preview only");
  });
});
