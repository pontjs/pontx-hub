import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import ProductSkill, { meta as productSkillMeta } from "./product-skill";
import SkillsIndex, { meta as skillsIndexMeta } from "./skills-index";

function renderPage(element: React.ReactNode, path: string) {
  const router = createMemoryRouter([{
    path: "*",
    element
  }], { initialEntries: [path] });
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

describe("Skills pages", () => {
  const api = getCatalogApi("dida365");
  if (!api) throw new Error("Expected synchronized Dida365 metadata");
  const skill = {
    name: "pontx-dida365",
    apiSlug: "dida365",
    version: "1.0.0",
    description: "Guide agents through Dida365 integration workflows.",
    license: "MIT-0",
    contentHash: "a".repeat(64),
    files: [{ path: "SKILL.md", sha256: "b".repeat(64), content: "# Dida365" }]
  };

  it("renders a bilingual empty state without product links", () => {
    const html = renderPage(createElement(SkillsIndex, {
      loaderData: { locale: "zh", products: [] }
    } as never), "/zh/skills");

    expect(html).toContain("让 Agent 更快接入正确的 API");
    expect(html).toContain("产品 Skill 正在准备中");
    expect(html).toContain('href="/zh/skills/pontx-hub"');
    expect(html).not.toContain('href="/zh/skills/pontx-dida365"');
  });

  it("localizes product card control copy while keeping stable Skill names", () => {
    const html = renderPage(createElement(SkillsIndex, {
      loaderData: {
        locale: "zh",
        products: [{
          skill,
          api: {
            slug: api.slug,
            title: api.title,
            provider: api.provider,
            category: api.category
          }
        }]
      }
    } as never), "/zh/skills");

    expect(html).toContain('href="/zh/skills/pontx-dida365"');
    expect(html).toContain("的集成流程、最佳实践与注意事项。");
    expect(html).not.toContain(skill.description);
    expect(html).toContain("pontx-dida365");
  });

  it("renders one localized H1 and the English Skill body below installation", () => {
    const markdown = "# Product workflow\n\n## Plan first\n\nUse `pontx-hub show`.";
    const html = renderPage(createElement(ProductSkill, {
      loaderData: { locale: "en", skill, api, markdown }
    } as never), "/en/skills/pontx-dida365");
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(text).toContain("Dida365 Open API Skill");
    expect(text).toContain("pontx-hub skill install dida365");
    expect(html).toContain('<h2>Product workflow</h2>');
    expect(html).toContain('<h3>Plan first</h3>');
    expect(html).toContain('aria-current="page" href="/en/skills/pontx-dida365"');
    expect(html).toContain('href="/en/apis/dida365"');
  });

  it("publishes canonical, hreflang, and structured data for index and detail", () => {
    const indexMeta = skillsIndexMeta({
      data: { locale: "en", products: [{ skill, api: { slug: api.slug, title: api.title, provider: api.provider, category: api.category } }] }
    } as never) as Array<Record<string, unknown>>;
    const detailMeta = productSkillMeta({
      data: { locale: "en", skill, api, markdown: "Instructions" }
    } as never) as Array<Record<string, unknown>>;

    expect(indexMeta).toContainEqual({ tagName: "link", rel: "canonical", href: "https://pontx.dev/en/skills" });
    expect(indexMeta.filter((entry) => entry.rel === "alternate")).toHaveLength(3);
    expect(JSON.stringify(indexMeta)).toContain("CollectionPage");
    expect(detailMeta).toContainEqual({ tagName: "link", rel: "canonical", href: "https://pontx.dev/en/skills/pontx-dida365" });
    expect(detailMeta.filter((entry) => entry.rel === "alternate")).toHaveLength(3);
    expect(JSON.stringify(detailMeta)).toContain("SoftwareApplication");
    expect(JSON.stringify(detailMeta)).toContain("BreadcrumbList");
  });
});
