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
  slug: "overview" | "sdk" | "cli" | "agent-skill" | "web" | "safety" = "sdk"
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
    const skill = html.indexOf("告诉 Agent 你想做什么");
    const cli = html.indexOf("喜欢在终端工作时");
    const sdk = html.indexOf("准备写进应用时");
    const web = html.indexOf("不安装任何工具");

    expect(html).toContain("先从 Agent Skill 开始，再选择你习惯的方式");
    expect(html).not.toContain("TypeScript SDK");
    expect(html).toContain("<h3>统一 SDK</h3>");
    expect(html).toContain(">统一 SDK</button>");
    expect(skill).toBeGreaterThan(-1);
    expect(skill).toBeLessThan(cli);
    expect(cli).toBeLessThan(sdk);
    expect(sdk).toBeLessThan(web);
    expect(html).toContain('role="tab" aria-selected="true" aria-controls="panel-overview-skill"');

    const englishHtml = renderDocs("/en/docs", "en", "overview");
    expect(englishHtml).toContain("<h3>Unified SDK</h3>");
    expect(englishHtml).toContain(">Unified SDK</button>");
  });

  it("explains website use in practical, human language", () => {
    const zh = renderDocs("/zh/docs/web", "zh", "web");
    expect(zh).toContain("在网站上找到需要的 API，并放心试一次");
    expect(zh).toContain("不用先记住 API 名称");
    expect(zh).toContain("先看概览，再看接口");
    expect(zh).toContain("它不会自动发送");
    expect(zh).toContain("把可用示例带回项目");
    expect(zh).not.toContain("从意图开始搜索");
    expect(zh).not.toContain("重新建立所属 API 的上下文");
    expect(zh).not.toContain("请求形状可见、可检查、可复制");

    const en = renderDocs("/en/docs/web", "en", "web");
    expect(en).toContain("Find the API you need and try it with confidence");
    expect(en).toContain("You do not need to know an API name first");
    expect(en).toContain("Preview before you send");
    expect(en).not.toContain("Start with intent");
    expect(en).not.toContain("re-establishes its parent API context");
    expect(en).not.toContain("visible, reviewable, and portable");
  });

  it("describes the Skill as an operating workflow, with on-demand loading as a benefit", () => {
    const html = renderDocs("/zh/docs/agent-skill", "zh", "agent-skill");

    expect(html).toContain("让 Agent 用一套清楚可靠的步骤来使用 API");
    expect(html).toContain("Skill 主要规定做事步骤");
    expect(html).toContain("需要时再读取 API 资料");
    expect(html).not.toContain("让 Agent 按需查找，而不是背下全部 API");
  });

  it("explains credentials and safety as practical guidance for people", () => {
    const zh = renderDocs("/zh/docs/safety", "zh", "safety");
    expect(zh).toContain("使用须知");
    expect(zh).toContain("凭证放在哪里");
    expect(zh).toContain("预览本身不会访问 API 供应商");
    expect(zh).toContain("修改数据前再确认一次");
    expect(zh).toContain("只连接目录里的 API");
    expect(zh).not.toContain("安全模型");
    expect(zh).not.toContain("规范化请求");
    expect(zh).not.toContain("完全相同的副作用");
    expect(zh).not.toContain("任意 URL 交给 Hub 代理");

    const en = renderDocs("/en/docs/safety", "en", "safety");
    expect(en).toContain("Where credentials stay");
    expect(en).toContain("A preview never contacts the API provider");
    expect(en).toContain("Confirm before changing data");
    expect(en).not.toContain("normalized request");
    expect(en).not.toContain("exact side effect");
    expect(en).not.toContain("arbitrary URL to the Hub proxy");
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
