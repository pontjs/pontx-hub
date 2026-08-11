import { Link } from "react-router";
import type { CatalogApi, Locale } from "~/lib/catalog/types";
import { apiWorkspaceNavigationCopy } from "~/lib/i18n";

export function ResourceDirectoryNavigation({
  locale,
  api,
  active
}: {
  locale: Locale;
  api: CatalogApi;
  active: "endpoints" | "schemas";
}) {
  const zh = locale === "zh";
  const workspaceCopy = apiWorkspaceNavigationCopy(locale);
  const defaultOperation = api.operations[0];
  const defaultSchema = api.schemas[0];
  const endpointContent = (
    <>
      <span>{workspaceCopy.endpointTab}</span>
      <strong>{api.operations.length}</strong>
    </>
  );
  const schemaContent = (
    <>
      <span>{zh ? "数据结构" : "Schemas"}</span>
      <strong>{api.schemas.length}</strong>
    </>
  );

  return (
    <nav
      className="resource-directory-navigation"
      aria-label={zh ? "API 参考分组" : "API reference sections"}
    >
      {active === "endpoints" ? (
        <span className="is-active" aria-current="page">
          {endpointContent}
        </span>
      ) : defaultOperation ? (
        <Link
          to={`/${locale}/apis/${api.slug}/${defaultOperation.slug}`}
          reloadDocument
        >
          {endpointContent}
        </Link>
      ) : null}
      {defaultSchema ? active === "schemas" ? (
        <span className="is-active" aria-current="page">
          {schemaContent}
        </span>
      ) : (
        <Link
          to={`/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(defaultSchema.name)}`}
          reloadDocument
        >
          {schemaContent}
        </Link>
      ) : null}
    </nav>
  );
}
