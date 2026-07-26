import { Link } from "react-router";
import type { Route } from "./+types/home";
import { ApiCard } from "~/components/api-card";
import { SiteShell } from "~/components/site-shell";
import { listCatalogSummaries } from "~/lib/catalog/catalog.server";
import { requireLocale, siteUrl } from "~/lib/http";

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  return {
    locale,
    apis: listCatalogSummaries().filter((api) => api.featured).slice(0, 3)
  };
}

export function meta({ data }: Route.MetaArgs) {
  const locale = data?.locale ?? "zh";
  const zh = locale === "zh";
  const title = zh
    ? "Pontx Hub — 面向开发者与 Agent 的精选 API"
    : "Pontx Hub — Curated APIs for developers and agents";
  const description = zh
    ? "集中阅读、预演和调用高频 OpenAPI，并使用运营方维护的 TypeScript 与 Node.js SDK。"
    : "Read, preview, and call high-frequency OpenAPIs with operator-maintained TypeScript and Node.js SDKs.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: siteUrl(`/${locale}`) },
    { tagName: "link", rel: "canonical", href: siteUrl(`/${locale}`) },
    { tagName: "link", rel: "alternate", hrefLang: "zh-CN", href: siteUrl("/zh") },
    { tagName: "link", rel: "alternate", hrefLang: "en", href: siteUrl("/en") }
  ];
}

const copy = {
  zh: {
    eyebrow: "精选 OpenAPI / 类型安全 SDK / Agent Ready",
    titleA: "让 API",
    titleB: "更容易被调用。",
    lede:
      "一处读懂高频 API，一次预演看清真实请求，再把经过验证的调用方式交给 TypeScript、Node.js 和你的 Agent。",
    catalog: "浏览 API 目录",
    skill: "安装 Agent Skill",
    featured: "精选 API",
    featuredBody: "只收录来源明确、可验证、可维护的 API。每个条目都连接文档、调试、SDK 与 Agent 工作流。",
    all: "查看全部 API",
    workflow: "从参考文档到可执行代码",
    workflowBody: "同一份 OAS 元数据贯穿网页、CLI、SDK 和 Agent，减少复制、猜测与过期示例。",
    steps: [
      ["发现", "按 Provider、分类、Operation 或自然关键词搜索。"],
      ["预演", "生成已解析的 URL、Header、Body 与脱敏 cURL。"],
      ["验证", "只读请求直接验证，写操作必须明确二次确认。"],
      ["集成", "复制针对已发布 SDK 的类型安全调用代码。"]
    ]
  },
  en: {
    eyebrow: "Curated OpenAPI / Typed SDKs / Agent Ready",
    titleA: "Make APIs",
    titleB: "easier to call.",
    lede:
      "Understand high-frequency APIs in one place, preview the exact request, then hand a verified integration to TypeScript, Node.js, or your agent.",
    catalog: "Browse API catalog",
    skill: "Install Agent Skill",
    featured: "Featured APIs",
    featuredBody:
      "Only APIs with clear provenance, verifiable metadata, and an maintainable release path. Every entry connects docs, debugging, SDKs, and agent workflows.",
    all: "View every API",
    workflow: "From reference to executable code",
    workflowBody:
      "The same OAS metadata powers the web, CLI, SDK, and agent so examples remain accurate and discoverable.",
    steps: [
      ["Discover", "Search by provider, category, operation, or natural keywords."],
      ["Preview", "Resolve the URL, headers, body, and a redacted cURL request."],
      ["Verify", "Run reads safely; mutations always require explicit confirmation."],
      ["Integrate", "Copy type-safe code targeting the operator-published SDK."]
    ]
  }
} as const;

export default function Home({ loaderData }: Route.ComponentProps) {
  const { locale, apis } = loaderData;
  const text = copy[locale];

  return (
    <SiteShell locale={locale}>
      <main>
        <section className="hero">
          <div className="hero-main">
            <div>
              <p className="eyebrow">{text.eyebrow}</p>
              <h1>
                {text.titleA}
                <br />
                <em>{text.titleB}</em>
              </h1>
              <p className="hero-lede">{text.lede}</p>
              <div className="hero-actions">
                <Link className="button button-dark" to={`/${locale}/apis`}>
                  {text.catalog}
                </Link>
                <Link className="button button-acid" to={`/${locale}/agent-skill`}>
                  {text.skill}
                </Link>
              </div>
            </div>
          </div>
          <aside className="hero-aside" aria-label="Pontx CLI example">
            <pre className="hero-code">
              <code>
                <strong>$ pontx hub search</strong> repository{"\n\n"}
                01 github.repos.get{"\n"}
                {"   "}GET /repos/{"{owner}"}/{"{repo}"}
                {"\n\n"}
                <strong>$ pontx hub call</strong> github.repos.get \{"\n"}
                {"  "}--owner octocat --repo Hello-World \{"\n"}
                {"  "}--dry-run{"\n\n"}
                ✓ URL resolved{"\n"}
                ✓ credentials redacted{"\n"}
                ✓ no request sent
              </code>
            </pre>
            <div className="hero-stats">
              <div>
                <strong>OAS</strong>
                <span>one source of truth</span>
              </div>
              <div>
                <strong>4×</strong>
                <span>web · cli · sdk · agent</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="section">
          <div className="section-heading">
            <h2>{text.featured}</h2>
            <p>{text.featuredBody}</p>
          </div>
          <div className="api-grid">
            {apis.map((api, index) => (
              <ApiCard key={api.slug} api={api} locale={locale} index={index} />
            ))}
          </div>
          <div className="hero-actions" style={{ marginTop: 28 }}>
            <Link className="button" to={`/${locale}/apis`}>
              {text.all}
            </Link>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <h2>{text.workflow}</h2>
            <p>{text.workflowBody}</p>
          </div>
          <div className="workflow">
            {text.steps.map(([title, body]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
