import { Link } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Route } from "./+types/product-skill";
import { CodeBlock } from "~/components/code-block";
import { ResourceNavigation } from "~/components/resource-navigation";
import { SiteShell } from "~/components/site-shell";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";
import { getSkillBundle } from "~/lib/product-skills.server";
import { breadcrumbList, localizedAlternates } from "~/lib/seo";
import { trackCodeCopied } from "~/lib/analytics/events";

type SkillFileView = {
  path: string;
  sha256: string;
  content: string;
};

type ProductSkillBundleView = {
  name: string;
  apiSlug?: string;
  version: string;
  description: string;
  license: string;
  contentHash: string;
  files: SkillFileView[];
};

function markdownBody(source: string) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
}

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const skillName = params.skillName ?? "";
  const skill = getSkillBundle(skillName) as ProductSkillBundleView | undefined;
  if (!skill?.apiSlug) throw new Response("Product Skill not found", { status: 404 });
  const api = getCatalogApi(skill.apiSlug);
  if (!api) throw new Response("Product API not found", { status: 404 });
  const source = skill.files.find((file) => file.path === "SKILL.md")?.content;
  if (!source) throw new Response("Product Skill is incomplete", { status: 500 });
  return { locale, skill, api, markdown: markdownBody(source) };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: "Product Skill not found — Pontx Hub" }];
  const { locale, skill, api } = data;
  const apiTitle = localize(api.title, locale);
  const title = locale === "zh"
    ? `${apiTitle} Skill — API 集成指南`
    : `${apiTitle} Skill — API Integration Guide`;
  const description = locale === "zh"
    ? `${apiTitle} 的 Agent 集成流程、最佳实践与注意事项；Endpoint、参数和 Schema 由 Pontx Hub 实时提供。`
    : skill.description;
  const path = `/skills/${skill.name}`;
  const canonical = siteUrl(`/${locale}${path}`);

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
    ...localizedAlternates(path),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "SoftwareApplication",
            name: skill.name,
            description,
            url: canonical,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Cross-platform",
            softwareVersion: skill.version,
            license: skill.license,
            inLanguage: "en",
            isPartOf: {
              "@type": "WebSite",
              name: "Pontx Hub",
              url: siteUrl(`/${locale}`)
            }
          },
          breadcrumbList(locale, [
            { name: locale === "zh" ? "技能" : "Skills", path: "/skills" },
            { name: apiTitle, path }
          ])
        ]
      }
    }
  ];
}

export function headers() {
  return cacheHeaders();
}

export default function ProductSkill({ loaderData }: Route.ComponentProps) {
  const { locale, skill, api, markdown } = loaderData;
  const zh = locale === "zh";
  const apiTitle = localize(api.title, locale);
  const copyLabel = zh ? "复制" : "Copy";
  const copiedLabel = zh ? "已复制" : "Copied";
  const copyFailedLabel = zh ? "复制失败" : "Copy failed";

  return (
    <SiteShell locale={locale}>
      <ResourceNavigation
        locale={locale}
        api={api}
        active="skill"
        skillName={skill.name}
      />
      <main className="product-skill-page">
        <header className="product-skill-hero">
          <nav className="product-skill-breadcrumbs" aria-label={zh ? "面包屑导航" : "Breadcrumb"}>
            <Link to={`/${locale}/skills`}>{zh ? "全部技能" : "All Skills"}</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/${locale}/apis/${api.slug}`}>{apiTitle}</Link>
          </nav>
          <div className="product-skill-hero-grid">
            <div>
              <p className="eyebrow">Product integration playbook</p>
              <h1>{apiTitle} Skill</h1>
              <p>
                {zh
                  ? "面向 Agent 的产品集成流程、最佳实践和风险提示。实时 Endpoint、参数与 Schema 由 Pontx Hub 查询，不在 Skill 中重复维护。"
                  : "A provider-specific integration flow for agents, with practical guidance and risk boundaries. Live Endpoints, parameters, and Schemas stay in Pontx Hub rather than being duplicated here."}
              </p>
            </div>
            <dl className="product-skill-facts">
              <div><dt>{zh ? "产品" : "API"}</dt><dd>{api.provider}</dd></div>
              <div><dt>{zh ? "版本" : "Version"}</dt><dd>v{skill.version}</dd></div>
              <div><dt>{zh ? "许可证" : "License"}</dt><dd>{skill.license}</dd></div>
              <div><dt>{zh ? "语言" : "Language"}</dt><dd>English</dd></div>
            </dl>
          </div>
        </header>

        <div className="product-skill-layout">
          <aside className="product-skill-install" aria-labelledby="product-skill-install-title">
            <div>
              <p className="skills-section-index">01 / Install</p>
              <h2 id="product-skill-install-title">{zh ? "添加到你的 Agent" : "Add it to your agent"}</h2>
              <p>
                {zh
                  ? "使用统一 CLI 安装并更新产品 Skill；统一 Skill 仍负责跨 API 搜索。"
                  : "Use the universal CLI to install and update this product Skill. Keep the universal Skill for catalog-wide discovery."}
              </p>
            </div>
            <CodeBlock
              code={`pnpm add -g @pontx/hub-cli\npontx-hub skill install ${api.slug}`}
              language="shell"
              label={zh ? "通过 Pontx Hub CLI 安装" : "Install with Pontx Hub CLI"}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
              copyFailedLabel={copyFailedLabel}
              onCopied={() => trackCodeCopied({ surface: "product_skill", kind: "install", apiSlug: api.slug })}
            />
            <CodeBlock
              className="code-frame-spaced"
              code={`npx skills add https://github.com/pontjs/pontx-api-metadata --skill ${skill.name}`}
              language="shell"
              label={zh ? "通过 Agent Skills 安装" : "Install with Agent Skills"}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
              copyFailedLabel={copyFailedLabel}
              onCopied={() => trackCodeCopied({ surface: "product_skill", kind: "install", apiSlug: api.slug })}
            />
            <Link className="product-skill-universal-link" to={`/${locale}/skills/pontx-hub`}>
              {zh ? "先了解统一 Skill" : "Learn about the universal Skill"} <span aria-hidden="true">→</span>
            </Link>
          </aside>

          <article className="product-skill-document" aria-labelledby="product-skill-content-title">
            <header>
              <p className="skills-section-index">02 / Playbook</p>
              <h2 id="product-skill-content-title">{zh ? "Skill 正文" : "Skill instructions"}</h2>
              <span>{zh ? "以下内容以英文发布，Agent 可按你的语言回答。" : "Published in English; the agent can respond in your language."}</span>
            </header>
            <div className="skill-markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: "h2",
                  h2: "h3",
                  h3: "h4",
                  a: ({ children, href }) => (
                    <a href={href} rel="noreferrer" target="_blank">{children}</a>
                  )
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </article>
        </div>
      </main>
    </SiteShell>
  );
}
