import { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { ApiDirectory } from "@pontx/shadcn-ui/api-directory";
import type { PontxAPI, PontxSpec } from "@pontx/spec";
import type {
  CatalogApi,
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
  api: CatalogApi;
  spec: PontxSpec;
  activeOperation?: CatalogOperation;
  activeSchemaName?: string;
}) {
  const navigate = useNavigate();
  const zh = locale === "zh";
  const workspaceCopy = apiWorkspaceNavigationCopy(locale);
  const spec = useMemo(
    () => pontxDirectorySpec(canonicalSpec, api.operations),
    [api.operations, canonicalSpec]
  );
  const untaggedOperations = api.operations.filter((operation) => !operation.tag);
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
          <strong aria-label={zh ? `${api.operations.length} 个接口` : `${api.operations.length} endpoints`}>
            {api.operations.length}
          </strong>
        </summary>
        <div className="resource-directory-group-content">
          {untaggedOperations.length ? (
            <nav className="pontx-directory-flat" aria-label={zh ? "未分组接口" : "Ungrouped endpoints"}>
              {untaggedOperations.map((operation) => (
                <Link
                  key={operation.operationId}
                  to={`/${locale}/apis/${api.slug}/${operation.slug}`}
                  aria-current={activeOperation?.slug === operation.slug ? "page" : undefined}
                >
                  {operation.method ? <small>{operation.method}</small> : null}
                  <span>{localize(operation.title, locale)}</span>
                </Link>
              ))}
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

      {api.schemas.length > 0 ? (
        <details
          className="resource-directory-group"
          open={activeGroup === "schemas"}
        >
          <summary aria-current={activeGroup === "schemas" ? "page" : undefined}>
            <span>{zh ? "数据结构" : "Schemas"}</span>
            <strong aria-label={zh ? `${api.schemas.length} 个数据结构` : `${api.schemas.length} schemas`}>
              {api.schemas.length}
            </strong>
          </summary>
          <div className="resource-directory-group-content">
            <nav
              className="schema-directory-list"
              aria-label={zh ? "数据结构目录" : "Schema directory"}
            >
              {api.schemas.map((schema) => {
                const active = schema.name === activeSchemaName;
                return (
                  <Link
                    className={active ? "is-active" : undefined}
                    key={schema.name}
                    to={`/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`}
                    aria-current={active ? "page" : undefined}
                    reloadDocument
                  >
                    <strong>{localize(schema.title, locale)}</strong>
                    <code>{schema.name}</code>
                  </Link>
                );
              })}
            </nav>
          </div>
        </details>
      ) : null}
    </div>
  );
}
