import { useEffect, useRef, useState, type FormEvent } from "react";
import { data, Form, Link, useNavigate } from "react-router";
import type { Route } from "./+types/catalog";
import { ApiCard } from "~/components/api-card";
import {
  CatalogSearchStatus,
  isCatalogSearchPending,
} from "~/components/catalog-search-status";
import { GlobalSearchResults } from "~/components/global-search-results";
import { SiteShell } from "~/components/site-shell";
import { publicResourceTerminologyCopy } from "~/lib/i18n";
import {
  listCatalogSummaries,
  searchCatalog
} from "~/lib/catalog/catalog.server";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";
import { createDebouncedTask } from "~/lib/debounce";

const SEARCH_DEBOUNCE_MS = 350;

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const catalog = listCatalogSummaries();
  return data({
    locale,
    query,
    apis: catalog,
    search: query ? searchCatalog(query, locale, { limit: 60 }) : null,
    totals: {
      apis: catalog.length,
      operations: catalog.reduce((count, api) => count + api.operationCount, 0),
      categories: new Set(catalog.map((api) => api.category)).size
    }
  }, {
    headers: query
      ? { "Cache-Control": "private, no-store" }
      : cacheHeaders()
  });
}

export function meta({ data }: Route.MetaArgs) {
  const locale = data?.locale ?? "zh";
  const title =
    locale === "zh"
      ? "Pontx API Hub — OpenAPI 目录"
      : "Pontx API Hub — OpenAPI Catalog";
  const description =
    locale === "zh"
      ? "通过 pontx-hub 搜索、阅读和预览已收录 API，再用对应的统一 SDK 与专属 CLI 调用。"
      : "Discover, inspect, and preview curated APIs through pontx-hub, then call them with the matching Unified SDK and dedicated CLI.";
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
        "@graph": [{
          "@id": siteUrl("/#website"),
          "@type": "WebSite",
          name: "Pontx Hub",
          alternateName: "Pontx API Hub",
          url: siteUrl("/")
        }, {
          "@id": siteUrl("/#organization"),
          "@type": "Organization",
          name: "Pontx",
          url: siteUrl("/"),
          logo: siteUrl("/pontx-logo.svg"),
          sameAs: ["https://github.com/pontjs"]
        }, {
          "@type": "CollectionPage",
          name: title,
          description,
          url: canonical,
          isPartOf: { "@id": siteUrl("/#website") },
          publisher: { "@id": siteUrl("/#organization") },
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
        }]
      }
    }] : [])
  ];
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

function searchHref(locale: "zh" | "en", query: string): string {
  return query ? `/${locale}?q=${encodeURIComponent(query)}` : `/${locale}`;
}

export function CatalogAccessSummary({ locale }: { locale: "zh" | "en" }) {
  const zh = locale === "zh";
  return (
    <p className="registry-description">
      {zh ? (
        <>
          每个收录的 API 都提供统一 SDK 与 CLI：<code>pontx-hub</code> 覆盖全目录检索、预览和获准调用；
          <code>@pontx/&lt;api&gt;</code> 与 <code>pontx-&lt;api&gt;</code> 用于单个 API 集成。
        </>
      ) : (
        <>
          Every curated API has a Unified SDK and CLI: <code>pontx-hub</code> covers catalog-wide search,
          previews, and approved calls; <code>@pontx/&lt;api&gt;</code> and <code>pontx-&lt;api&gt;</code> handle
          single-API integration.
        </>
      )}{" "}
      <Link className="registry-description-link" to={`/${locale}/docs`}>
        {zh ? "查看文档" : "View docs"}
        <span aria-hidden="true">↗</span>
      </Link>
    </p>
  );
}

function CatalogSearch({
  locale,
  query,
  summary,
  onPendingChange,
}: {
  locale: "zh" | "en";
  query: string;
  summary: string;
  onPendingChange: (pending: boolean) => void;
}) {
  const zh = locale === "zh";
  const terminology = publicResourceTerminologyCopy(locale);
  const navigate = useNavigate();
  const [draftQuery, setDraftQuery] = useState(query);
  const lastNavigatedQuery = useRef(query);
  const debouncedSearch = useRef(
    createDebouncedTask<string>(SEARCH_DEBOUNCE_MS)
  );
  const searchPending = isCatalogSearchPending(draftQuery, query);

  useEffect(() => () => debouncedSearch.current.cancel(), []);

  useEffect(() => {
    onPendingChange(searchPending);
  }, [onPendingChange, searchPending]);

  useEffect(() => () => onPendingChange(false), [onPendingChange]);

  useEffect(() => {
    debouncedSearch.current.cancel();
  }, [locale]);

  useEffect(() => {
    if (query === lastNavigatedQuery.current) return;
    lastNavigatedQuery.current = query;
    setDraftQuery(query);
  }, [query]);

  function navigateToQuery(nextQuery: string, replace: boolean) {
    const normalizedQuery = nextQuery.trim();
    if (normalizedQuery === lastNavigatedQuery.current) return;
    lastNavigatedQuery.current = normalizedQuery;
    void navigate(searchHref(locale, normalizedQuery), {
      replace,
      preventScrollReset: true
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    debouncedSearch.current.cancel();
    navigateToQuery(draftQuery, false);
  }

  return (
    <>
      <Form
        action={`/${locale}`}
        className="catalog-search"
        method="get"
        onSubmit={handleSubmit}
        role="search"
        aria-busy={searchPending}
      >
        <span aria-hidden="true">⌕</span>
        <input
          name="q"
          value={draftQuery}
          onChange={(event) => {
            const nextQuery = event.currentTarget.value;
            setDraftQuery(nextQuery);
            debouncedSearch.current.schedule(nextQuery, (latestQuery) => {
              navigateToQuery(latestQuery, true);
            });
          }}
          placeholder={
            zh
              ? `语义搜索 ${terminology.apiProducts}、${terminology.endpoints}、入参、出参或${terminology.schemas}…`
              : `Semantically search ${terminology.apiProducts}, ${terminology.endpoints.toLowerCase()}, inputs, outputs, or ${terminology.schemas.toLowerCase()}…`
          }
          aria-label={zh ? "全局搜索" : "Global search"}
          aria-controls="catalog-search-results"
          aria-describedby="catalog-search-status"
        />
      </Form>
      <CatalogSearchStatus
        locale={locale}
        pending={searchPending}
        summary={summary}
      />
    </>
  );
}

export default function Catalog({ loaderData }: Route.ComponentProps) {
  const { locale, query, apis, search, totals } = loaderData;
  const zh = locale === "zh";
  const terminology = publicResourceTerminologyCopy(locale);
  const [searchPending, setSearchPending] = useState(false);
  const searchSummary = search
    ? zh
      ? `${search.counts.api} ${terminology.apiProducts} · ${search.counts.endpoint} ${terminology.endpoints} · ${search.counts.schema} ${terminology.schemas}`
      : `${search.counts.api} ${terminology.apiProducts} · ${search.counts.endpoint} ${terminology.endpoints.toLowerCase()} · ${search.counts.schema} ${terminology.schemas.toLowerCase()}`
    : `${String(apis.length).padStart(2, "0")} ${terminology.apiProducts}`;

  return (
    <SiteShell locale={locale}>
      <main className="catalog-page">
        <header className="registry-header">
          <div className="registry-intro">
            <p className="registry-label">PONTX / OPENAPI REGISTRY</p>
            <h1>{zh ? "Pontx API Hub · API 目录" : "Pontx API Hub · API Catalog"}</h1>
            <CatalogAccessSummary locale={locale} />
          </div>
          <dl className="registry-stats">
            <div>
              <dt>{terminology.apiProducts}</dt>
              <dd>{String(totals.apis).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>{terminology.endpoints}</dt>
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
            <span>{zh ? `搜索${terminology.endpoints}、参数、返回字段，或浏览全部 ${terminology.apiProducts}` : `Search ${terminology.endpoints.toLowerCase()}, parameters, response fields, or browse all ${terminology.apiProducts}`}</span>
          </div>
          <div className="registry-toolbar">
            <CatalogSearch
              locale={locale}
              query={query}
              summary={searchSummary}
              onPendingChange={setSearchPending}
            />
          </div>

          <div
            id="catalog-search-results"
            className="catalog-results-frame"
            aria-busy={searchPending}
          >
            {search ? (
              <GlobalSearchResults
                search={search}
                locale={locale}
              />
            ) : (
              <div className="api-grid">
                {apis.map((api, index) => (
                  <ApiCard
                    key={api.slug}
                    api={api}
                    locale={locale}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
