import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent
} from "react";
import {
  data,
  Form,
  Link,
  useLocation,
  useNavigate,
  type ShouldRevalidateFunctionArgs,
} from "react-router";
import { Search } from "lucide-react";
import type { Route } from "./+types/catalog";
import type { GlobalSearchResponse } from "~/lib/catalog/types";
import { ApiCard } from "~/components/api-card";
import {
  CatalogSearchStatus,
  isCatalogSearchPending,
} from "~/components/catalog-search-status";
import { SiteShell } from "~/components/site-shell";
import { publicResourceTerminologyCopy } from "~/lib/i18n";
import {
  listCatalogSummaries,
  searchCatalog
} from "~/lib/catalog/catalog.server";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";
import { createDebouncedTask } from "~/lib/debounce";
import { trackCatalogSearchViewed } from "~/lib/analytics/events";
import { fetchCatalogSearch } from "~/lib/catalog/search-client";
import { Input as MotionInput } from "~/components/motion/input";

const SEARCH_DEBOUNCE_MS = 350;
const GlobalSearchResults = lazy(async () => {
  const module = await import("~/components/global-search-results");
  return { default: module.GlobalSearchResults };
});

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

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (currentUrl.pathname === nextUrl.pathname) {
    const currentSearch = new URLSearchParams(currentUrl.search);
    const nextSearch = new URLSearchParams(nextUrl.search);
    const queryChanged = currentSearch.get("q") !== nextSearch.get("q");
    currentSearch.delete("q");
    nextSearch.delete("q");
    currentSearch.sort();
    nextSearch.sort();

    if (queryChanged && currentSearch.toString() === nextSearch.toString()) {
      return false;
    }
  }

  return defaultShouldRevalidate;
}

export function meta({ data }: Route.MetaArgs) {
  const locale = data?.locale ?? "zh";
  const title =
    locale === "zh"
      ? "Pontx API Hub — API 目录"
      : "Pontx API Hub — API Catalog";
  const description =
    locale === "zh"
      ? "在一个目录里找到 API、查看接口，并复制 SDK 或 CLI 代码接入项目。"
      : "Find an API, inspect its endpoints, and copy SDK or CLI code to add it to your project.";
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
      <strong>{zh ? "每个收录的 API 都有自己的 SDK 和 CLI，而且用法一致。" : "Every API here has an SDK and a CLI, and they all work the same way."}</strong>{" "}
      {zh
        ? "在 Pontx Hub 里找到 API、查看接口；要接入项目就复制 SDK 代码，要在终端调用就运行对应的 CLI 命令。"
        : "Use Pontx Hub to find an API and understand its endpoints. Copy SDK code into your app, or run its CLI command in your terminal."}{" "}
      <Link className="registry-description-link" to={`/${locale}/docs`}>
        {zh ? "了解使用方式" : "See how it works"}
      </Link>
    </p>
  );
}

function CatalogSearch({
  locale,
  query,
  requestPending,
  summary,
  onPendingChange,
}: {
  locale: "zh" | "en";
  query: string;
  requestPending: boolean;
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
  const searchPending =
    isCatalogSearchPending(draftQuery, query) || requestPending;

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
        <MotionInput
          name="q"
          value={draftQuery}
          onChange={(nextQuery) => {
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
          leftIcon={<Search className="catalog-search-icon" aria-hidden="true" />}
          rightIcon={draftQuery ? (
            <button
              type="button"
              className="catalog-search-clear"
              aria-label={zh ? "清除搜索" : "Clear search"}
              onClick={() => {
                setDraftQuery("");
                debouncedSearch.current.cancel();
                navigateToQuery("", false);
              }}
            >
              ×
            </button>
          ) : undefined}
          className="catalog-search-control"
          classNames={{
            field: "catalog-search-field",
            input: "catalog-search-input",
            leftIcon: "catalog-search-left-icon"
          }}
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
  const location = useLocation();
  const zh = locale === "zh";
  const terminology = publicResourceTerminologyCopy(locale);
  const [locationReady, setLocationReady] = useState(false);
  const [searchPending, setSearchPending] = useState(false);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [clientSearch, setClientSearch] = useState<{
    locale: "zh" | "en";
    query: string;
    search: GlobalSearchResponse | null;
    error: boolean;
    pending: boolean;
  } | null>(null);
  const lastTrackedSearch = useRef<string | undefined>(undefined);
  const locationQuery = new URLSearchParams(location.search).get("q")?.trim() ?? "";
  const currentQuery = locationReady ? locationQuery : query;
  const loaderMatchesCurrentQuery = query === currentQuery;
  const clientSearchMatches =
    clientSearch?.locale === locale && clientSearch.query === currentQuery;
  const resolvedSearch = loaderMatchesCurrentQuery
    ? search
    : clientSearchMatches
      ? clientSearch.search
      : null;
  const requestPending = Boolean(
    currentQuery &&
      !loaderMatchesCurrentQuery &&
      (!clientSearchMatches || clientSearch?.pending),
  );
  const searchFailed = Boolean(
    currentQuery && clientSearchMatches && clientSearch?.error,
  );
  const searchSummary = resolvedSearch
    ? zh
      ? `${resolvedSearch.counts.api} ${terminology.apiProducts} · ${resolvedSearch.counts.endpoint} ${terminology.endpoints} · ${resolvedSearch.counts.schema} ${terminology.schemas}`
      : `${resolvedSearch.counts.api} ${terminology.apiProducts} · ${resolvedSearch.counts.endpoint} ${terminology.endpoints.toLowerCase()} · ${resolvedSearch.counts.schema} ${terminology.schemas.toLowerCase()}`
    : `${String(apis.length).padStart(2, "0")} ${terminology.apiProducts}`;

  useEffect(() => {
    setLocationReady(true);
  }, []);

  useEffect(() => {
    if (!currentQuery || !resolvedSearch) return;
    const key = `${locale}:${currentQuery}:${resolvedSearch.total}`;
    if (lastTrackedSearch.current === key) return;
    lastTrackedSearch.current = key;
    trackCatalogSearchViewed({
      locale,
      query: currentQuery,
      resultCount: resolvedSearch.total,
    });
  }, [currentQuery, locale, resolvedSearch]);

  useEffect(() => {
    if (!currentQuery || loaderMatchesCurrentQuery) return;

    const controller = new AbortController();
    setClientSearch({
      locale,
      query: currentQuery,
      search: null,
      error: false,
      pending: true,
    });

    void fetchCatalogSearch(currentQuery, locale, controller.signal)
      .then((nextSearch) => {
        setClientSearch({
          locale,
          query: currentQuery,
          search: nextSearch,
          error: false,
          pending: false,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setClientSearch({
          locale,
          query: currentQuery,
          search: null,
          error: true,
          pending: false,
        });
      });

    return () => controller.abort();
  }, [currentQuery, loaderMatchesCurrentQuery, locale, searchAttempt]);

  useEffect(() => {
    const existing = document.head.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    );

    if (currentQuery) {
      const robots = existing ?? document.createElement("meta");
      robots.name = "robots";
      robots.content = "noindex,follow";
      robots.dataset.catalogSearch = "true";
      if (!existing) document.head.append(robots);
      return;
    }

    if (existing?.dataset.catalogSearch === "true") existing.remove();
  }, [currentQuery]);

  return (
    <SiteShell locale={locale}>
      <main className="catalog-page">
        <header className="registry-header">
          <div className="registry-intro">
            <p className="registry-label">PONTX / PONTXSPEC REGISTRY</p>
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
              query={currentQuery}
              requestPending={requestPending}
              summary={searchSummary}
              onPendingChange={setSearchPending}
            />
          </div>

          <div
            id="catalog-search-results"
            className="catalog-results-frame"
            aria-busy={searchPending}
          >
            {searchFailed ? (
              <div className="catalog-empty" role="status">
                <strong>{zh ? "搜索暂时不可用" : "Search is temporarily unavailable"}</strong>
                <p>{zh ? "请稍后重试。" : "Please try again in a moment."}</p>
                <button
                  type="button"
                  className="button"
                  onClick={() => setSearchAttempt((attempt) => attempt + 1)}
                >
                  {zh ? "重新搜索" : "Retry search"}
                </button>
              </div>
            ) : resolvedSearch ? (
              <Suspense
                fallback={(
                  <div className="catalog-empty" role="status">
                    {zh ? "正在载入搜索结果…" : "Loading search results…"}
                  </div>
                )}
              >
                <GlobalSearchResults
                  search={resolvedSearch}
                  locale={locale}
                />
              </Suspense>
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
