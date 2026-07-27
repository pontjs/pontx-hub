import { Form, Link } from "react-router";
import type { Route } from "./+types/catalog";
import { ApiCard } from "~/components/api-card";
import { SiteShell } from "~/components/site-shell";
import { listCatalogSummaries } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { requireLocale, siteUrl } from "~/lib/http";

export function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const catalog = listCatalogSummaries();
  const apis = catalog.filter((api) => {
    if (!query) return true;
    return [
      api.name,
      api.provider,
      api.category,
      api.title.zh,
      api.title.en,
      api.summary.zh,
      api.summary.en
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
  });
  return {
    locale,
    query,
    apis,
    totals: {
      apis: catalog.length,
      operations: catalog.reduce((count, api) => count + api.operationCount, 0),
      categories: new Set(catalog.map((api) => api.category)).size
    }
  };
}

export function meta({ data }: Route.MetaArgs) {
  const locale = data?.locale ?? "zh";
  const title =
    locale === "zh"
      ? "Pontx Hub — OpenAPI 目录"
      : "Pontx Hub — OpenAPI Catalog";
  return [
    { title },
    {
      name: "description",
      content:
        locale === "zh"
          ? "面向开发者与 Agent 的一站式 API 搜索、阅读、调试与 SDK 集成入口。"
          : "One place for developers and agents to discover, read, debug, and integrate APIs with SDKs."
    },
    ...(data?.query ? [{ name: "robots", content: "noindex,follow" }] : []),
    { tagName: "link", rel: "canonical", href: siteUrl(`/${locale}`) }
  ];
}

export default function Catalog({ loaderData }: Route.ComponentProps) {
  const { locale, query, apis, totals } = loaderData;
  const zh = locale === "zh";

  return (
    <SiteShell locale={locale}>
      <main className="catalog-page">
        <header className="registry-header">
          <div className="registry-intro">
            <p className="registry-label">PONTX / OPENAPI REGISTRY</p>
            <h1>{zh ? "API 目录" : "API Catalog"}</h1>
            <p>
              {zh
                ? "面向开发者与 Agent 的一站式 API 搜索、阅读、调试与 SDK 集成入口。"
                : "One place for developers and agents to discover, read, debug, and integrate APIs with SDKs."}
            </p>
          </div>
          <dl className="registry-stats">
            <div>
              <dt>API</dt>
              <dd>{String(totals.apis).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>{zh ? "接口" : "Endpoints"}</dt>
              <dd>{String(totals.operations).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>{zh ? "分类" : "Categories"}</dt>
              <dd>{String(totals.categories).padStart(2, "0")}</dd>
            </div>
          </dl>
        </header>

        <section className="registry-section">
          <div className="registry-toolbar">
            <Form className="catalog-search" method="get">
              <span aria-hidden="true">⌕</span>
            <input
              name="q"
              defaultValue={query}
              placeholder={zh ? "搜索 Provider、分类或能力…" : "Search provider, category, or capability…"}
              aria-label={zh ? "搜索 API" : "Search APIs"}
            />
            </Form>
            <span>
              {String(apis.length).padStart(2, "0")} / {String(totals.apis).padStart(2, "0")}
            </span>
          </div>

          <div className="registry-columns" aria-hidden="true">
            <span>{zh ? "API / 能力" : "API / Capability"}</span>
            <span>{zh ? "分类" : "Category"}</span>
            <span>{zh ? "接口" : "Endpoints"}</span>
            <span>{zh ? "鉴权" : "Auth"}</span>
            <span>SDK</span>
            <span />
          </div>

          <div className="api-grid">
            {apis.map((api, index) => (
              <ApiCard key={api.slug} api={api} locale={locale} index={index} />
            ))}
            {!apis.length ? (
              <div className="catalog-empty">
                <strong>{zh ? "没有匹配的 API" : "No matching APIs"}</strong>
                <p>{zh ? "尝试搜索 Provider、用途或分类。" : "Try a provider, capability, or category."}</p>
                <Link to={`/${locale}`}>{zh ? "清除搜索" : "Clear search"}</Link>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
