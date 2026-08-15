import { Link } from "react-router";
import type { Route } from "./+types/skills-index";
import { SiteShell } from "~/components/site-shell";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";
import { listSkillSummaries } from "~/lib/product-skills.server";
import { localizedAlternates } from "~/lib/seo";

type SkillSummaryView = {
  name: string;
  apiSlug?: string;
  version: string;
  description: string;
  license: string;
  contentHash: string;
};

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const products = (listSkillSummaries() as SkillSummaryView[]).flatMap((skill) => {
    if (!skill.apiSlug) return [];
    const api = getCatalogApi(skill.apiSlug);
    if (!api) return [];
    return [{
      skill,
      api: {
        slug: api.slug,
        title: api.title,
        provider: api.provider,
        category: api.category
      }
    }];
  });
  return { locale, products };
}

export function meta({ data }: Route.MetaArgs) {
  const locale = data?.locale ?? "zh";
  const products = data?.products ?? [];
  const title = locale === "zh"
    ? "API Skills — 统一发现与产品集成指南"
    : "API Skills — Universal Discovery & Product Integration Guides";
  const description = locale === "zh"
    ? "安装 Pontx Hub 统一 Skill 搜索全部 API，或选择产品 Skill 获取经过验证的集成流程、最佳实践与注意事项。"
    : "Install the universal Pontx Hub Skill to discover every API, then add product Skills for verified integration flows, best practices, and caveats.";
  const canonical = siteUrl(`/${locale}/skills`);

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonical },
    { property: "og:site_name", content: "Pontx Hub" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    ...localizedAlternates("/skills"),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        url: canonical,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: products.length + 1,
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Pontx Hub",
              url: siteUrl(`/${locale}/skills/pontx-hub`)
            },
            ...products.map(({ skill }, index) => ({
              "@type": "ListItem",
              position: index + 2,
              name: skill.name,
              url: siteUrl(`/${locale}/skills/${skill.name}`)
            }))
          ]
        },
        isPartOf: {
          "@type": "WebSite",
          name: "Pontx Hub",
          url: siteUrl(`/${locale}`)
        }
      }
    }
  ];
}

export function headers() {
  return cacheHeaders();
}

export default function SkillsIndex({ loaderData }: Route.ComponentProps) {
  const { locale, products } = loaderData;
  const zh = locale === "zh";

  return (
    <SiteShell locale={locale}>
      <main className="skills-index-page">
        <header className="skills-hero">
          <div className="skills-hero-copy">
            <p className="eyebrow">Universal discovery / Product playbooks</p>
            <h1>{zh ? "让 Agent 更快接入正确的 API" : "Give agents the right API playbook"}</h1>
            <p>
              {zh
                ? "统一 Skill 负责跨产品发现、契约检查与安全调用；产品 Skill 只补充真正需要上下文的集成流程、最佳实践和注意事项。"
                : "The universal Skill handles catalog-wide discovery, contract inspection, and safe calls. Product Skills add only the integration flows, best practices, and caveats that need provider context."}
            </p>
          </div>
          <aside className="skills-layer-note" aria-label={zh ? "Skill 分工" : "How Skills work together"}>
            <span>01</span>
            <div>
              <strong>{zh ? "先从统一 Skill 开始" : "Start universal"}</strong>
              <p>{zh ? "找到 API，并读取实时 Endpoint 与 Schema。" : "Find the API and inspect live Endpoints and Schemas."}</p>
            </div>
            <span>02</span>
            <div>
              <strong>{zh ? "按需添加产品 Skill" : "Add product context"}</strong>
              <p>{zh ? "获得供应商特有的集成路径，不复制元数据。" : "Follow provider-specific workflows without duplicating metadata."}</p>
            </div>
          </aside>
        </header>

        <section className="skills-universal" aria-labelledby="universal-skill-title">
          <div>
            <p className="skills-card-kicker">Universal Skill</p>
            <h2 id="universal-skill-title">Pontx Hub</h2>
            <p>
              {zh
                ? "一个入口搜索全部已审核 API，检查当前契约，预演请求，并在用户明确授权后执行调用。"
                : "One entry point to search every reviewed API, inspect the current contract, preview requests, and call only with explicit authorization."}
            </p>
          </div>
          <div className="skills-universal-action">
            <code>pontx-hub skill install</code>
            <Link className="button button-dark" to={`/${locale}/skills/pontx-hub`}>
              {zh ? "查看统一 Skill" : "View universal Skill"}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="skills-products" aria-labelledby="product-skills-title">
          <div className="section-heading">
            <div>
              <p className="skills-section-index">02 / Product Skills</p>
              <h2 id="product-skills-title">{zh ? "面向具体 API 的集成指南" : "Integration guides for each API"}</h2>
            </div>
            <p>
              {zh
                ? "产品 Skill 保持简洁；Endpoint、参数和 Schema 始终从实时目录读取。"
                : "Product Skills stay concise; Endpoints, parameters, and Schemas always come from the live catalog."}
            </p>
          </div>

          {products.length ? (
            <div className="product-skill-grid">
              {products.map(({ skill, api }, index) => (
                <article className="product-skill-card" key={skill.name}>
                  <div className="product-skill-card-topline">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{api.category}</span>
                  </div>
                  <div>
                    <p>{api.provider}</p>
                    <h3>
                      <Link to={`/${locale}/skills/${skill.name}`}>
                        {localize(api.title, locale)}
                      </Link>
                    </h3>
                    <p className="product-skill-description">
                      {zh
                        ? `${localize(api.title, locale)} 的集成流程、最佳实践与注意事项。`
                        : skill.description}
                    </p>
                  </div>
                  <footer>
                    <code>{skill.name}</code>
                    <span>v{skill.version} <b aria-hidden="true">↗</b></span>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="skills-empty" role="status">
              <span aria-hidden="true">◇</span>
              <div>
                <h3>{zh ? "产品 Skill 正在准备中" : "Product Skills are being prepared"}</h3>
                <p>
                  {zh
                    ? "在首批产品指南通过验证前，统一 Skill 仍可搜索和调用目录中的所有 API。"
                    : "Until the first product guides pass review, the universal Skill can still discover and call every API in the catalog."}
                </p>
              </div>
              <Link to={`/${locale}/skills/pontx-hub`}>
                {zh ? "使用统一 Skill" : "Use the universal Skill"} →
              </Link>
            </div>
          )}
        </section>
      </main>
    </SiteShell>
  );
}
