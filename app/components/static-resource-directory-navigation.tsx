import { Link } from "react-router";
import type {
  CatalogApiContext,
  CatalogOperation,
  Locale
} from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";

const visibleResourceLimit = 100;

function includeActiveOperation(
  operations: CatalogApiContext["operations"],
  activeOperation?: CatalogOperation
) {
  const visible = operations.slice(0, visibleResourceLimit);
  if (
    activeOperation &&
    !visible.some((operation) => operation.slug === activeOperation.slug)
  ) {
    return [activeOperation, ...visible.slice(0, visibleResourceLimit - 1)];
  }
  return visible;
}

export function StaticResourceDirectoryNavigation({
  locale,
  api,
  activeOperation,
  activeSchemaName,
  onLoadDirectory
}: {
  locale: Locale;
  api: CatalogApiContext;
  activeOperation?: CatalogOperation;
  activeSchemaName?: string;
  onLoadDirectory?: () => void;
}) {
  const zh = locale === "zh";
  const endpointCount = api.endpointCount ?? api.operations.length;
  const schemaCount = api.schemaCount ?? api.schemas.length;
  const operations = includeActiveOperation(api.operations, activeOperation);
  const schemas = api.schemas.slice(0, visibleResourceLimit);
  const activeSchema = activeSchemaName
    ? api.schemas.find((schema) => schema.name === activeSchemaName)
    : undefined;
  const visibleSchemas = activeSchema && !schemas.some((schema) => schema.name === activeSchema.name)
    ? [activeSchema, ...schemas.slice(0, visibleResourceLimit - 1)]
    : schemas;
  const incomplete =
    api.operations.length < endpointCount || api.schemas.length < schemaCount;

  return (
    <div
      className="resource-directory-navigation static-resource-directory"
      role="group"
      aria-label={zh ? "API 参考目录" : "API reference directory"}
    >
      <details className="resource-directory-group" open={!activeSchemaName}>
        <summary aria-current={!activeSchemaName ? "page" : undefined}>
          <span>{zh ? "接口" : "Endpoints"}</span>
          <strong>{endpointCount}</strong>
        </summary>
        <div className="resource-directory-group-content">
          <nav className="pontx-directory-flat" aria-label={zh ? "接口目录" : "Endpoint directory"}>
            {operations.map((operation) => (
              <Link
                className={!operation.method ? "pontx-directory-flat-title-only" : undefined}
                key={operation.slug}
                to={`/${locale}/apis/${api.slug}/${operation.slug}`}
                aria-current={activeOperation?.slug === operation.slug ? "page" : undefined}
              >
                {operation.method ? <small>{operation.method}</small> : null}
                <span className="pontx-directory-flat-copy">
                  <code className="pontx-directory-flat-name">
                    {operation.operationId}
                  </code>
                  <span className="pontx-directory-flat-description">
                    {localize(operation.title, locale)}
                  </span>
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </details>

      {schemaCount ? (
        <details className="resource-directory-group" open={Boolean(activeSchemaName)}>
          <summary aria-current={activeSchemaName ? "page" : undefined}>
            <span>{zh ? "数据结构" : "Schemas"}</span>
            <strong>{schemaCount}</strong>
          </summary>
          <div className="resource-directory-group-content">
            <nav className="schema-directory-list" aria-label={zh ? "数据结构目录" : "Schema directory"}>
              {visibleSchemas.map((schema) => (
                <Link
                  className={schema.name === activeSchemaName ? "is-active" : undefined}
                  key={schema.name}
                  to={`/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`}
                  aria-current={schema.name === activeSchemaName ? "page" : undefined}
                >
                  <code>{schema.name}</code>
                  <span>{localize(schema.title, locale)}</span>
                </Link>
              ))}
            </nav>
          </div>
        </details>
      ) : null}

      {incomplete && onLoadDirectory ? (
        <button
          className="static-resource-directory-load"
          type="button"
          onClick={onLoadDirectory}
        >
          {zh ? "加载完整目录" : "Load full directory"}
        </button>
      ) : null}
    </div>
  );
}
