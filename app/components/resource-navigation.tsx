import { Link } from "react-router";
import type { CatalogApi, Locale } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";

export function ResourceNavigation({
  locale,
  api,
  active
}: {
  locale: Locale;
  api: CatalogApi;
  active: "docs" | "schemas" | "sdk";
}) {
  const zh = locale === "zh";
  const defaultOperation = api.operations[0]?.slug;

  return (
    <nav className="resource-navigation" aria-label={zh ? "API 上下文导航" : "API context navigation"}>
      <div className="resource-navigation-path">
        <Link to={`/${locale}`} className="resource-back">
          <span aria-hidden="true">←</span>
          {zh ? "全部 API" : "All APIs"}
        </Link>
        <span aria-hidden="true">/</span>
        <strong>{localize(api.title, locale)}</strong>
      </div>
      <div className="resource-navigation-tabs">
        {defaultOperation ? (
          <Link
            to={`/${locale}/apis/${api.slug}/${defaultOperation}`}
            className={active === "docs" ? "is-active" : undefined}
            reloadDocument
          >
            {zh ? "接口文档" : "Endpoints"}
          </Link>
        ) : null}
        {api.schemas[0] ? (
          <Link
            to={`/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(api.schemas[0].name)}`}
            className={active === "schemas" ? "is-active" : undefined}
            reloadDocument
          >
            {zh ? "数据结构" : "Schemas"}
            <span>{api.schemas.length}</span>
          </Link>
        ) : null}
        <Link
          to={`/${locale}/sdks/${api.slug}`}
          className={active === "sdk" ? "is-active" : undefined}
        >
          SDK
        </Link>
      </div>
    </nav>
  );
}
