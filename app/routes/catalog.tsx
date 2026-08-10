import { Form } from "react-router";
import type { Route } from "./+types/catalog";
import { ApiCard } from "~/components/api-card";
import { GlobalSearchResults } from "~/components/global-search-results";
import { SiteShell } from "~/components/site-shell";
import {
  listCatalogSummaries,
  searchCatalog
} from "~/lib/catalog/catalog.server";
import { requireLocale, siteUrl } from "~/lib/http";

export function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const catalog = listCatalogSummaries();
  return {
    locale,
    query,
    apis: catalog,
    search: query ? searchCatalog(query, locale, { limit: 60 }) : null,
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
  const description =
    locale === "zh"
      ? "面向开发者与 Agent 的一站式 API 搜索、阅读、调试与 SDK 集成入口。"
      : "One place for developers and agents to discover, read, debug, and integrate APIs with SDKs.";
  const canonical = siteUrl(`/${locale}`);
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
    ...(data?.query ? [{ name: "robots", content: "noindex,follow" }] : []),
    { tagName: "link", rel: "canonical", href: canonical },
    { tagName: "link", rel: "alternate", hrefLang: "zh-CN", href: siteUrl("/zh") },
    { tagName: "link", rel: "alternate", hrefLang: "en", href: siteUrl("/en") },
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: siteUrl("/en") },
    ...(!data?.query && data ? [{
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        url: canonical,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: data.apis.length,
          itemListElement: data.apis.map((api, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: api.title[locale],
            url: siteUrl(`/${locale}/apis/${api.slug}`)
          }))
        }
      }
    }] : [])
  ];
}

export default function Catalog({ loaderData }: Route.ComponentProps) {
  const { locale, query, apis, search, totals } = loaderData;
  const zh = locale === "zh";

  return (
    <SiteShell locale={locale}>
      <main className="catalog-page">
        <header className="registry-header">
          <div className="registry-intro">
            <p className="registry-label">PONTX / OPENAPI REGISTRY</p>
            <h1>{zh ? "API 目录" : "API Catalog"}</h1>
            <p className="registry-description">
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
          <div className="registry-taskline">
            <strong>{zh ? "你想接入什么能力？" : "What do you want to build?"}</strong>
            <span>{zh ? "搜索接口、参数、返回字段，或浏览完整 API 集合" : "Search endpoints, parameters, response fields, or browse complete APIs"}</span>
          </div>
          <div className="registry-toolbar">
            <Form className="catalog-search" method="get">
              <span aria-hidden="true">⌕</span>
              <input
                name="q"
                defaultValue={query}
                placeholder={
                  zh
                    ? "语义搜索 API、接口、入参或数据结构…"
                    : "Semantically search APIs, inputs, outputs, or schemas…"
                }
                aria-label={zh ? "全局搜索" : "Global search"}
              />
            </Form>
            <span>
              {search
                ? zh
                  ? `${search.counts.api} API · ${search.counts.endpoint} 接口 · ${search.counts.schema} 数据结构`
                  : `${search.counts.api} APIs · ${search.counts.endpoint} endpoints · ${search.counts.schema} schemas`
                : `${String(apis.length).padStart(2, "0")} API`}
            </span>
          </div>

          {search ? (
            <GlobalSearchResults search={search} locale={locale} />
          ) : (
            <>
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
              </div>
            </>
          )}
        </section>
      </main>
    </SiteShell>
  );
}
