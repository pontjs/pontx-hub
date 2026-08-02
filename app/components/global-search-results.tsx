import { Link } from "react-router";
import type {
  GlobalSearchKind,
  GlobalSearchMatchField,
  GlobalSearchResponse,
  GlobalSearchResult,
  Locale
} from "~/lib/catalog/types";

const kinds: GlobalSearchKind[] = ["api", "endpoint", "schema"];

function kindLabel(kind: GlobalSearchKind, locale: Locale): string {
  const labels = {
    api: { zh: "API", en: "APIs" },
    endpoint: { zh: "接口", en: "Endpoints" },
    schema: { zh: "数据结构", en: "Schemas" }
  };
  return labels[kind][locale];
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

function ResultBadge({ result }: { result: GlobalSearchResult }) {
  if (result.kind === "endpoint") {
    return <span className={`search-method method-${result.method.toLowerCase()}`}>{result.method}</span>;
  }
  return (
    <span className={`search-kind search-kind-${result.kind}`}>
      {result.kind === "api" ? "API" : "{}"}
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
  locale
}: {
  search: GlobalSearchResponse;
  locale: Locale;
}) {
  const zh = locale === "zh";

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
        <span>{zh ? "全局结果" : "Global results"}</span>
        <strong>{search.total}</strong>
        <span className="search-mode">
          {zh ? "混合语义检索" : "Hybrid semantic"}
        </span>
        <code>{search.query}</code>
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
                <Link
                  className="search-result-row"
                  key={result.id}
                  to={result.href}
                  reloadDocument
                >
                  <ResultBadge result={result} />
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
                  </div>
                  <div className="search-result-context">
                    <span>{result.apiTitle}</span>
                    <code>{resultMeta(result, locale)}</code>
                    <small>
                      {result.match.mode} · {result.match.fields
                        .slice(0, 3)
                        .map((field) => matchFieldLabel(field, locale))
                        .join(" / ")}
                    </small>
                  </div>
                  <span className="search-result-arrow" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
