import { Link } from "react-router";
import type { CatalogApiContext, Locale } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { apiWorkspaceNavigationCopy } from "~/lib/i18n";

export function ResourceNavigation({
  locale,
  api,
  active,
  skillName
}: {
  locale: Locale;
  api: CatalogApiContext;
  active: "overview" | "docs" | "schemas" | "sdk" | "skill";
  skillName?: string;
}) {
  const zh = locale === "zh";
  const workspaceCopy = apiWorkspaceNavigationCopy(locale);
  const defaultOperation = api.operations[0]?.slug;
  const directoryLinkClass = (section: "docs" | "schemas") =>
    active === "skill"
      ? undefined
      : `resource-navigation-mobile-link${active === section ? " is-active" : ""}`;

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
            className={directoryLinkClass("docs")}
            aria-current={active === "docs" ? "page" : undefined}
          >
            {workspaceCopy.endpointTab}
          </Link>
        ) : null}
        {api.schemas[0] ? (
          <Link
            to={`/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(api.schemas[0].name)}`}
            className={directoryLinkClass("schemas")}
            aria-current={active === "schemas" ? "page" : undefined}
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
        {skillName ? (
          <Link
            to={`/${locale}/skills/${skillName}`}
            className={active === "skill" ? "is-active" : undefined}
            aria-current={active === "skill" ? "page" : undefined}
          >
            Skill
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
