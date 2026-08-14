import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { DocsContent } from "~/components/docs-content";
import { DocsLayout } from "~/components/docs-layout";
import { docsMeta } from "~/lib/docs-seo";
import { loader as docsRedirectLoader } from "./docs-redirect";
import { loader as docsDetailRedirectLoader } from "./docs-detail-redirect";

type Descriptor = Record<string, unknown>;

function renderDocs(
  path: string,
  locale: "zh" | "en" = "zh",
  slug: "overview" | "sdk" | "cli" | "agent-skill" = "sdk"
) {
  const router = createMemoryRouter([
    {
      id: "root",
      path: "*",
      element: createElement(
        DocsLayout,
        {
          locale,
          slug,
          children: createElement(DocsContent, { locale, slug })
        }
      )
    }
  ], { initialEntries: [path] });
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

describe("localized documentation", () => {
  it("renders one descriptive H1, semantic sections, and exact SDK examples in SSR HTML", () => {
    const html = renderDocs("/zh/docs/sdk");

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("TypeScript SDK：统一的命名、类型与调用方式");
    expect(html).toContain('id="client-shapes"');
    expect(html).toContain("@pontx/frankfurter");
    expect(html).toContain("createMassiveClient");
    expect(html).toContain('aria-label="本页目录"');
    expect(html).toContain('href="/zh/docs/web"');
  });

  it("presents Skill, CLI, SDK, then the website as the product hierarchy", () => {
    const html = renderDocs("/zh/docs", "zh", "overview");
    const skill = html.indexOf("把用户意图转为可审查的 API 发现");
    const cli = html.indexOf("为 Skill、终端和自动化提供统一的搜索");
    const sdk = html.indexOf("把验证过的请求变成类型安全的生产代码");
    const web = html.indexOf("用可视化界面浏览同一份 API");

    expect(html).toContain("一套 Skill，把 API 意图变成可靠集成");
    expect(html).not.toContain("TypeScript SDK");
    expect(html).not.toContain("统一 SDK");
    expect(skill).toBeGreaterThan(-1);
    expect(skill).toBeLessThan(cli);
    expect(cli).toBeLessThan(sdk);
    expect(sdk).toBeLessThan(web);
    expect(html).toContain('role="tab" aria-selected="true" aria-controls="panel-overview-skill"');
  });

  it("describes the Skill as an operating workflow, with on-demand loading as a benefit", () => {
    const html = renderDocs("/zh/docs/agent-skill", "zh", "agent-skill");

    expect(html).toContain("让 Agent 遵循可执行、可审查的 API 工作流");
    expect(html).toContain("Skill 的核心是操作规范");
    expect(html).toContain("按需加载是工作流收益");
    expect(html).not.toContain("让 Agent 按需查找，而不是背下全部 API");
  });

  it("publishes canonical, reciprocal, and structured metadata for every docs page", () => {
    const detail = docsMeta("en", "cli") as Descriptor[];
    expect(detail).toContainEqual({
      tagName: "link",
      rel: "canonical",
      href: "https://pontx.dev/en/docs/cli"
    });
    expect(detail.filter((item) => item.rel === "alternate")).toEqual([
      expect.objectContaining({ hrefLang: "zh-CN", href: "https://pontx.dev/zh/docs/cli" }),
      expect.objectContaining({ hrefLang: "en", href: "https://pontx.dev/en/docs/cli" }),
      expect.objectContaining({ hrefLang: "x-default", href: "https://pontx.dev/en/docs/cli" })
    ]);
    expect(JSON.stringify(detail)).toContain("TechArticle");
    expect(JSON.stringify(detail)).toContain("BreadcrumbList");

    const index = docsMeta("zh", "overview") as Descriptor[];
    expect(JSON.stringify(index)).toContain("CollectionPage");
    expect(JSON.stringify(index)).toContain("/zh/docs/quick-start");

    const sdk = docsMeta("en", "sdk") as Descriptor[];
    expect(sdk).toContainEqual({ title: "TypeScript SDK — Pontx Hub Docs" });
    expect(JSON.stringify(sdk)).toContain('"name":"TypeScript SDK"');
  });

  it("documents named request options without advertising removed -p compatibility", () => {
    for (const locale of ["zh", "en"] as const) {
      const html = renderDocs(`/${locale}/docs/cli`, locale, "cli");

      expect(html).toContain("--projectId 123");
      expect(html).not.toContain("-p key=value");
      expect(html).not.toContain("兼容旧脚本");
      expect(html).not.toContain("Compatibility fallback");
    }
  });

  it("negotiates /docs language while preserving safe query state", async () => {
    const response = docsRedirectLoader({
      request: new Request("https://pontx.dev/docs?from=header", {
        headers: { "accept-language": "zh-CN,zh;q=0.9,en;q=0.5" }
      })
    } as never);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/zh/docs?from=header");

    const detailResponse = docsDetailRedirectLoader({
      params: { docSlug: "sdk" },
      request: new Request("https://pontx.dev/docs/sdk", {
        headers: { "accept-language": "en-US,en;q=0.9" }
      })
    } as never);
    expect(detailResponse.status).toBe(302);
    expect(detailResponse.headers.get("Location")).toBe("/en/docs/sdk");
  });
});
