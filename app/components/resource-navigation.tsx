import { Link } from "react-router";
import type { CatalogApi, Locale } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { apiWorkspaceNavigationCopy } from "~/lib/i18n";

export function ResourceNavigation({
  locale,
  api,
  active
}: {
  locale: Locale;
  api: CatalogApi;
  active: "overview" | "docs" | "schemas" | "sdk";
}) {
  const zh = locale === "zh";
  const workspaceCopy = apiWorkspaceNavigationCopy(locale);
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
        <Link
          to={`/${locale}/apis/${api.slug}`}
          className={active === "overview" ? "is-active" : undefined}
          aria-current={active === "overview" ? "page" : undefined}
        >
          {zh ? "概览" : "Overview"}
        </Link>
        {defaultOperation ? (
          <Link
            to={`/${locale}/apis/${api.slug}/${defaultOperation}`}
            className={`resource-navigation-mobile-link${active === "docs" ? " is-active" : ""}`}
            aria-current={active === "docs" ? "page" : undefined}
            reloadDocument
          >
            {workspaceCopy.endpointTab}
          </Link>
        ) : null}
        {api.schemas[0] ? (
          <Link
            to={`/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(api.schemas[0].name)}`}
            className={`resource-navigation-mobile-link${active === "schemas" ? " is-active" : ""}`}
            aria-current={active === "schemas" ? "page" : undefined}
            reloadDocument
          >
            {zh ? "数据结构" : "Schemas"}
            <span>{api.schemas.length}</span>
          </Link>
        ) : null}
        <Link
          to={`/${locale}/sdks/${api.slug}`}
          className={active === "sdk" ? "is-active" : undefined}
          aria-current={active === "sdk" ? "page" : undefined}
        >
          SDK
        </Link>
      </div>
    </nav>
  );
}
