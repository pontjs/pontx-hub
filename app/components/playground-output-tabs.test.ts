import { PlaygroundPanel } from "@pontx/shadcn-ui/playground";
import type { PontxAPI } from "@pontx/spec";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("shared Playground output navigation", () => {
  it("ships code scenarios and the response as one flat tab list", () => {
    const api = {
      name: "getProjects",
      method: "GET",
      path: "/projects",
      parameters: [],
      responses: {},
    } as unknown as PontxAPI;

    const html = renderToStaticMarkup(
      createElement(PlaygroundPanel, {
        visible: true,
        onVisibleChange: () => {},
        api,
        specName: "dida365",
        servers: [{ url: "https://api.example.com", description: "Example" }],
        onExecute: () => {},
        isExecuting: false,
        getCodeGenScenarios: () => [
          { id: "curl", label: "cURL", language: "shell" },
          { id: "sdk", label: "SDK", language: "typescript" },
          { id: "cli", label: "Pontx Hub CLI", language: "shell" },
        ],
        onGenerateCode: () => "generated code",
      })
    );

    expect(html).toContain('aria-label="查看代码或响应结果"');
    expect(html).toContain("grid-cols-2");
    expect(html).toContain(">cURL</button>");
    expect(html).toContain(">SDK</button>");
    expect(html).toContain(">Pontx Hub CLI</button>");
    expect(html).toContain(">响应</button>");
    expect(html).not.toContain(">代码</button>");
    expect(html).not.toContain('aria-label="选择代码生成场景"');
  });

  it("disables execution with an explicit prerequisite reason", () => {
    const api = {
      name: "getProjects",
      method: "GET",
      path: "/projects",
      parameters: [],
      responses: {},
    } as unknown as PontxAPI;

    const html = renderToStaticMarkup(
      createElement(PlaygroundPanel, {
        visible: true,
        onVisibleChange: () => {},
        api,
        specName: "dida365",
        servers: [{ url: "https://api.example.com", description: "Example" }],
        onExecute: () => {},
        isExecuting: false,
        executeDisabled: true,
        executeDisabledReason: "Complete OAuth authorization first",
      })
    );

    expect(html).toContain("disabled=\"\"");
    expect(html).toContain('title="Complete OAuth authorization first"');
  });
});
