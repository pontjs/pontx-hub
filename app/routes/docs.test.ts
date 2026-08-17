import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { DocsContent } from "~/components/docs-content";
import { DocsLayout } from "~/components/docs-layout";
import { DOC_SLUGS, type DocSlug } from "~/lib/docs";
import { docsMeta } from "~/lib/docs-seo";
import { loader as docsRedirectLoader } from "./docs-redirect";
import { loader as docsDetailRedirectLoader } from "./docs-detail-redirect";

type Descriptor = Record<string, unknown>;

function renderDocs(
  path: string,
  locale: "zh" | "en" = "zh",
  slug: DocSlug = "sdk"
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

  it("leads with the consistent CLI and SDK contract for every curated API", () => {
    const html = renderDocs("/zh/docs", "zh", "overview");
    const cli = html.indexOf("用 pontx-hub 的一组命令搜索、查看和预览整个目录");
    const sdk = html.indexOf("每个 API 都使用可预测的");
    const apiCli = html.indexOf("pontx-&lt;api&gt; 随对应 SDK 发布");
    const skill = html.indexOf("统一 Skill 负责跨目录发现与安全流程");

    expect(html).toContain("每个被收录的 API，都有一致的 SDK 与 CLI 调用方式");
    expect(html).toContain("目前公开目录里的每个 API 都有已发布的 SDK 与 CLI");
    expect(html).not.toContain("TypeScript SDK");
    expect(html).toContain("<h3>统一 SDK</h3>");
    expect(html).toContain(">统一 SDK</button>");
    expect(cli).toBeGreaterThan(-1);
    expect(cli).toBeLessThan(sdk);
    expect(sdk).toBeLessThan(apiCli);
    expect(apiCli).toBeLessThan(skill);
    expect(html).toContain('role="tab" aria-selected="true" aria-controls="panel-overview-cli"');

    const englishHtml = renderDocs("/en/docs", "en", "overview");
    expect(englishHtml).toContain("Every curated API comes with a consistent SDK and CLI call model");
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

  it("publishes a useful, localized Notion TypeScript recipe with safe local credential handling", () => {
    const zh = renderDocs("/zh/docs/notion-typescript", "zh", "notion-typescript");
    expect(zh.match(/<h1/g)).toHaveLength(1);
    expect(zh).toContain("用 TypeScript 安全地接入 Notion API");
    expect(zh).toContain("NOTION_ACCESS_TOKEN");
    expect(zh).toContain("client.users.getSelf()");
    expect(zh).toContain('href="/zh/apis/notion/get-self"');
    expect(zh).toContain('href="/zh/sdks/notion"');

    const en = renderDocs("/en/docs/notion-typescript", "en", "notion-typescript");
    expect(en).toContain("Connect the Notion API from TypeScript, safely");
    expect(en).toContain("Verify the current identity first");
    expect(en).toContain('href="/en/apis/notion"');
  });

  it("explains the universal and product Skill relationship without duplicating PontxSpec metadata", () => {
    const html = renderDocs("/zh/docs/agent-skill", "zh", "agent-skill");
    const text = html.replace(/<[^>]+>/g, "");

    expect(html).toContain("让 Agent 结合统一 Skill 与产品 Skill 使用 API");
    expect(text).toContain("pontx-hub skill list");
    expect(text).toContain("pontx-hub skill install stripe-identity");
    expect(html).toContain("两层 Skill，一份 PontxSpec");
    expect(html).toContain("产品 Skill 不复制 Endpoint 清单、Schema 或参数表");
    expect(html).toContain("@pontx/&lt;apiSlug&gt;");

    const englishHtml = renderDocs("/en/docs/agent-skill", "en", "agent-skill");
    expect(englishHtml).toContain("Combine universal and product Skills to work with APIs");
    expect(englishHtml).toContain("Product Skills do not copy Endpoint inventories");
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
    const detailJson = JSON.stringify(detail);
    expect(detailJson).toContain("WebSite");
    expect(detailJson).toContain("Organization");
    expect(detailJson).toContain("WebPage");
    expect(detailJson).toContain("TechArticle");
    expect(detailJson).toContain("BreadcrumbList");
    expect(detailJson).toContain("mainEntityOfPage");
    expect(detailJson).toContain('"isAccessibleForFree":true');

    const index = docsMeta("zh", "overview") as Descriptor[];
    expect(JSON.stringify(index)).toContain("CollectionPage");
    expect(JSON.stringify(index)).toContain("/zh/docs/quick-start");

    const sdk = docsMeta("en", "sdk") as Descriptor[];
    expect(sdk).toContainEqual({ title: "TypeScript SDK: Type-Safe API Clients — Pontx Hub" });
    expect(JSON.stringify(sdk)).toContain('"name":"TypeScript SDK: Type-Safe API Clients"');
  });

  it("gives every docs page a unique, descriptive search title and snippet", () => {
    for (const locale of ["zh", "en"] as const) {
      const titles: string[] = [];
      const descriptions: string[] = [];

      for (const slug of DOC_SLUGS) {
        const metadata = docsMeta(locale, slug) as Descriptor[];
        const title = metadata.find((item) => "title" in item)?.title;
        const description = metadata.find((item) => item.name === "description")?.content;
        const openGraphTitle = metadata.find((item) => item.property === "og:title")?.content;
        const openGraphDescription = metadata.find((item) => item.property === "og:description")?.content;

        expect(title).toEqual(expect.any(String));
        expect(description).toEqual(expect.any(String));
        expect(title).toContain("Pontx Hub");
        expect(title).not.toMatch(/文档首页|Documentation home|网站使用|Use the website/);
        expect(openGraphTitle).toBe(title);
        expect(openGraphDescription).toBe(description);

        titles.push(title as string);
        descriptions.push(description as string);
      }

      expect(new Set(titles).size).toBe(DOC_SLUGS.length);
      expect(new Set(descriptions).size).toBe(DOC_SLUGS.length);
    }
  });

  it("documents named request options without advertising removed -p compatibility", () => {
    for (const locale of ["zh", "en"] as const) {
      const html = renderDocs(`/${locale}/docs/cli`, locale, "cli");

      expect(html).toContain("--projectId 123");
      expect(html).not.toContain("-p key=value");
      expect(html).not.toContain("兼容旧脚本");
      expect(html).not.toContain("Compatibility fallback");
      expect(html).toContain("skill list");
      expect(html).toContain("skill install &lt;apiSlug&gt;");
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
