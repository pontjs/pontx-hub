import { Link } from "react-router";
import type {
  GlobalSearchKind,
  GlobalSearchMatchField,
  GlobalSearchResponse,
  GlobalSearchResult,
  Locale
} from "~/lib/catalog/types";
import { FavoriteApiButton } from "~/components/favorite-api-button";
import { publicResourceTerminologyCopy } from "~/lib/i18n";

const kinds: GlobalSearchKind[] = ["api", "endpoint", "schema"];

function kindLabel(kind: GlobalSearchKind, locale: Locale): string {
  const terminology = publicResourceTerminologyCopy(locale);
  const labels = {
    api: terminology.apiProducts,
    endpoint: terminology.endpoints,
    schema: terminology.schemas
  };
  return labels[kind];
}

function resultMeta(result: GlobalSearchResult, locale: Locale): string {
  if (result.kind === "api") {
    return locale === "zh"
      ? `${result.endpointCount} 个接口 · ${result.schemaCount} 个数据结构`
      : `${result.endpointCount} endpoints · ${result.schemaCount} schemas`;
  }
  if (result.kind === "endpoint") {
    return `${result.method} ${result.path}`;
  }
  return locale === "zh"
    ? `${result.schemaType} · ${result.propertyCount} 个字段`
    : `${result.schemaType} · ${result.propertyCount} properties`;
}

function ResultBadge({ result, locale }: { result: GlobalSearchResult; locale: Locale }) {
  if (result.kind === "endpoint") {
    return <span className={`search-method method-${result.method.toLowerCase()}`}>{result.method}</span>;
  }
  const terminology = publicResourceTerminologyCopy(locale);
  return (
    <span className={`search-kind search-kind-${result.kind}`}>
      {result.kind === "api" ? terminology.apiBadge : "{}"}
    </span>
  );
}

function matchFieldLabel(field: GlobalSearchMatchField, locale: Locale): string {
  const labels: Record<GlobalSearchMatchField, { zh: string; en: string }> = {
    product: { zh: "产品", en: "product" },
    title: { zh: "标题", en: "title" },
    description: { zh: "描述", en: "description" },
    path: { zh: "路径", en: "path" },
    parameter: { zh: "参数", en: "parameter" },
    request: { zh: "入参", en: "request" },
    response: { zh: "出参", en: "response" },
    schema: { zh: "结构", en: "schema" },
    property: { zh: "字段", en: "property" }
  };
  return labels[field][locale];
}

export function GlobalSearchResults({
  search,
  locale,
  favoriteApiSlugs = []
}: {
  search: GlobalSearchResponse;
  locale: Locale;
  favoriteApiSlugs?: string[];
}) {
  const zh = locale === "zh";
  const terminology = publicResourceTerminologyCopy(locale);

  if (search.total === 0) {
    return (
      <div className="catalog-empty">
        <strong>{zh ? "没有找到匹配内容" : "No matching resources"}</strong>
        <p>
          {zh
            ? "可搜索产品名称、接口路径、operationId、数据结构或字段名。"
            : "Try a product name, endpoint path, operationId, schema, or property name."}
        </p>
        <Link to={`/${locale}`}>{zh ? "返回 API 目录" : "Back to API catalog"}</Link>
      </div>
    );
  }

  return (
    <div className="global-search-results">
      <div className="search-summary">
        <div>
          <strong>{zh ? `找到 ${search.total} 个结果` : `${search.total} results`}</strong>
          <span>{zh ? "按相关性分组" : "Grouped by relevance"}</span>
        </div>
        <Link to={`/${locale}`} className="search-clear">{zh ? "清除搜索" : "Clear search"} ×</Link>
      </div>
      {kinds.map((kind) => {
        const results = search.items.filter((result) => result.kind === kind);
        if (results.length === 0) return null;
        return (
          <section className="search-result-group" key={kind}>
            <header>
              <h2>{kindLabel(kind, locale)}</h2>
              <span>{search.counts[kind]}</span>
            </header>
            <div className="search-result-list">
              {results.map((result) => (
                <div className="search-result-item" key={result.id}>
                  <Link className="search-result-row" to={result.href}>
                  <ResultBadge result={result} locale={locale} />
                  <div className="search-result-main">
                    <div>
                      <strong>{result.title}</strong>
                      <code>{
                        result.kind === "endpoint"
                          ? result.operationId
                          : result.kind === "schema"
                            ? result.schemaName
                            : result.apiSlug
                      }</code>
                    </div>
                    <p>{result.description}</p>
                    <small className="search-match-reason">
                      {zh ? "匹配" : "Matched"} · {result.match.fields
                        .slice(0, 3)
                        .map((field) => matchFieldLabel(field, locale))
                        .join(" / ")}
                    </small>
                  </div>
                  <div className="search-result-context">
                    <span>{result.kind === "api" ? terminology.apiProduct : result.apiTitle}</span>
                    <code>{resultMeta(result, locale)}</code>
                  </div>
                  <span className="search-result-arrow" aria-hidden="true">→</span>
                  </Link>
                  {result.kind === "api" ? (
                    <FavoriteApiButton
                      apiSlug={result.apiSlug}
                      locale={locale}
                      initialFavorite={favoriteApiSlugs.includes(result.apiSlug)}
                      compact
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
