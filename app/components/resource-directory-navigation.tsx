import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiDirectory } from "@pontx/shadcn-ui/api-directory";
import type { PontxAPI, PontxSpec } from "@pontx/spec";
import type {
  CatalogApiContext,
  CatalogOperation,
  Locale
} from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { canonicalApiKey, pontxDirectorySpec } from "~/lib/catalog/pontx-view";
import { apiWorkspaceNavigationCopy } from "~/lib/i18n";

export function ResourceDirectoryNavigation({
  locale,
  api,
  spec: canonicalSpec,
  activeOperation,
  activeSchemaName
}: {
  locale: Locale;
  api: CatalogApiContext;
  spec: PontxSpec;
  activeOperation?: CatalogOperation;
  activeSchemaName?: string;
}) {
  const navigate = useNavigate();
  const zh = locale === "zh";
  const workspaceCopy = apiWorkspaceNavigationCopy(locale);
  const spec = useMemo(
    () => pontxDirectorySpec(canonicalSpec, api.operations, locale),
    [api.operations, canonicalSpec, locale]
  );
  const untaggedOperations = api.operations.filter((operation) => !operation.tag);
  const endpointCount = api.endpointCount ?? api.operations.length;
  const schemaCount = api.schemaCount ?? api.schemas.length;
  const [schemaQuery, setSchemaQuery] = useState("");
  const visibleSchemas = useMemo(() => {
    const query = schemaQuery.trim().toLocaleLowerCase();
    const matches = query
      ? api.schemas.filter((schema) =>
          `${schema.name} ${localize(schema.title, locale)}`
            .toLocaleLowerCase()
            .includes(query)
        )
      : api.schemas;
    const firstPage = matches.slice(0, 100);
    const activeSchema = activeSchemaName
      ? matches.find((schema) => schema.name === activeSchemaName)
      : undefined;
    return activeSchema && !firstPage.some((schema) => schema.name === activeSchema.name)
      ? [activeSchema, ...firstPage.slice(0, 99)]
      : firstPage;
  }, [activeSchemaName, api.schemas, locale, schemaQuery]);
  const activeGroup = activeSchemaName ? "schemas" : "endpoints";
  const selectedApiName = activeOperation
    ? canonicalApiKey(spec, activeOperation)
    : undefined;

  const handleApiSelect = useCallback(
    (_apiName: string, selectedApi: PontxAPI) => {
      const operationSlug = (
        selectedApi as PontxAPI & {
          ext?: { operationSlug?: string };
        }
      ).ext?.operationSlug;
      if (operationSlug) {
        navigate(`/${locale}/apis/${api.slug}/${operationSlug}`);
      }
    },
    [api.slug, locale, navigate]
  );

  return (
    <div
      className="resource-directory-navigation"
      role="group"
      aria-label={zh ? "API 参考目录" : "API reference directory"}
    >
      <details
        className="resource-directory-group"
        open={activeGroup === "endpoints"}
      >
        <summary aria-current={activeGroup === "endpoints" ? "page" : undefined}>
          <span>{workspaceCopy.endpointTab}</span>
          <strong aria-label={zh ? `${endpointCount} 个接口` : `${endpointCount} endpoints`}>
            {endpointCount}
          </strong>
        </summary>
        <div className="resource-directory-group-content">
          {untaggedOperations.length ? (
            <nav className="pontx-directory-flat" aria-label={zh ? "未分组接口" : "Ungrouped endpoints"}>
              {untaggedOperations.map((operation) => {
                const operationTitle = localize(operation.title, locale).trim();
                const showOperationTitle = operationTitle !== operation.operationId;
                return (
                  <Link
                    key={operation.operationId}
                    to={`/${locale}/apis/${api.slug}/${operation.slug}`}
                    aria-current={activeOperation?.slug === operation.slug ? "page" : undefined}
                    className={operation.method ? undefined : "pontx-directory-flat-title-only"}
                  >
                    {operation.method ? <small>{operation.method}</small> : null}
                    <span className="pontx-directory-flat-copy">
                      <code
                        className="pontx-directory-flat-name"
                        title={operation.operationId}
                      >
                        {operation.operationId}
                      </code>
                      {showOperationTitle ? (
                        <span
                          className="pontx-directory-flat-description"
                          title={operationTitle}
                        >
                          {operationTitle}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </nav>
          ) : null}
          {api.operations.some((operation) => operation.tag) ? (
          <ApiDirectory
            locale={locale === "zh" ? "zh-CN" : "en"}
            spec={spec}
            selectedApiName={selectedApiName}
            onApiSelect={handleApiSelect}
            defaultExpandedTags={activeOperation?.tag ? [activeOperation.tag] : []}
            searchPlaceholder={zh ? "搜索接口…" : "Search endpoints…"}
            className="pontx-directory"
          />
          ) : null}
        </div>
      </details>

      {schemaCount > 0 ? (
        <details
          className="resource-directory-group"
          open={activeGroup === "schemas"}
        >
          <summary aria-current={activeGroup === "schemas" ? "page" : undefined}>
            <span>{zh ? "数据结构" : "Schemas"}</span>
            <strong aria-label={zh ? `${schemaCount} 个数据结构` : `${schemaCount} schemas`}>
              {schemaCount}
            </strong>
          </summary>
          <div className="resource-directory-group-content">
            {api.schemas.length > 100 ? (
              <label className="schema-directory-search">
                <span className="sr-only">
                  {zh ? "搜索数据结构" : "Search schemas"}
                </span>
                <input
                  type="search"
                  value={schemaQuery}
                  onChange={(event) => setSchemaQuery(event.currentTarget.value)}
                  placeholder={zh ? "搜索数据结构…" : "Search schemas…"}
                />
              </label>
            ) : null}
            <nav
              className="schema-directory-list"
              aria-label={zh ? "数据结构目录" : "Schema directory"}
            >
              {visibleSchemas.map((schema) => {
                const active = schema.name === activeSchemaName;
                const schemaTitle = localize(schema.title, locale).trim();
                const schemaLabel = schemaTitle && schemaTitle !== schema.name
                  ? schemaTitle
                  : undefined;
                return (
                  <Link
                    className={active ? "is-active" : undefined}
                    key={schema.name}
                    to={`/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <code title={schema.name}>{schema.name}</code>
                    {schemaLabel ? <span title={schemaLabel}>{schemaLabel}</span> : null}
                  </Link>
                );
              })}
            </nav>
            {visibleSchemas.length < api.schemas.length ? (
              <p className="schema-directory-limit" role="status">
                {zh
                  ? `显示 ${visibleSchemas.length} 项，输入名称可查找全部 ${schemaCount} 项`
                  : `Showing ${visibleSchemas.length}; search by name across all ${schemaCount}`}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
