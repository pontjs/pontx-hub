import { lazy, Suspense, useMemo, useState } from "react";
import type { PontxSpec } from "@pontx/spec";
import type { CatalogApiContext, CatalogSchema, Locale } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { StaticResourceDirectoryNavigation } from "~/components/static-resource-directory-navigation";
import { ResourceNavigation } from "~/components/resource-navigation";

const DeferredSchemaViewer = lazy(() => import("~/components/deferred-schema-viewer"));

export function SchemaReference({
  locale,
  api,
  spec,
  schema,
  skillName,
  onLoadDirectory
}: {
  locale: Locale;
  api: CatalogApiContext;
  spec: PontxSpec;
  schema: CatalogSchema;
  skillName?: string;
  onLoadDirectory?: () => void;
}) {
  const zh = locale === "zh";
  const [viewerOpen, setViewerOpen] = useState(false);
  const components = useMemo(
    () => ({ schemas: spec.components?.schemas ?? {} }),
    [spec.components?.schemas]
  );
  const viewerSchema = useMemo(
    () => ({
      ...(components.schemas[schema.name] ??
        schema.localizedSchema?.[locale] ??
        schema.schema),
      components
    }),
    [components, locale, schema.localizedSchema, schema.name, schema.schema]
  );

  return (
    <main className="schema-reference">
      <ResourceNavigation
        locale={locale}
        api={api}
        active="schemas"
        skillName={skillName}
      />
      <div className="schema-reference-grid">
        <aside
          className="schema-directory"
          aria-label={zh ? "API 参考目录" : "API reference directory"}
        >
          <StaticResourceDirectoryNavigation
            locale={locale}
            api={api}
            activeSchemaName={schema.name}
            onLoadDirectory={onLoadDirectory}
          />
        </aside>

        <section className="schema-reference-content">
          <header className="schema-reference-header">
            <p className="registry-label">OPENAPI / COMPONENTS / SCHEMAS</p>
            <h1>{localize(schema.title, locale)}</h1>
            <code>{schema.name}</code>
            <p>{localize(schema.description, locale)}</p>
          </header>
          <div className="schema-viewer-panel">
            {viewerOpen ? (
              <Suspense fallback={<SchemaFallback locale={locale} schema={schema} />}>
                <DeferredSchemaViewer
                  components={components}
                  name={schema.name}
                  schema={viewerSchema}
                />
              </Suspense>
            ) : (
              <>
                <SchemaFallback locale={locale} schema={schema} />
                <div className="pontx-interactive-docs-action">
                  <button
                    className="interactive-docs-button"
                    type="button"
                    onClick={() => setViewerOpen(true)}
                  >
                    {zh ? "加载交互式 Schema Viewer" : "Load interactive Schema Viewer"}
                  </button>
                  <p>
                    {zh
                      ? "展开和搜索能力仅在需要时下载。"
                      : "Expansion and search code downloads only when requested."}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SchemaFallback({ locale, schema }: { locale: Locale; schema: CatalogSchema }) {
  const zh = locale === "zh";
  return (
    <div className="schema-fallback">
      <div className="schema-fallback-heading">
        <span>{schema.type}</span>
        <strong>{schema.properties.length}</strong>
        <small>{zh ? "字段" : "properties"}</small>
      </div>
      {schema.properties.map((property) => (
        <div className="schema-property-row" key={property.name}>
          <code>{property.name}</code>
          <span>{property.ref ?? property.type}</span>
          <b>{property.required ? (zh ? "必填" : "required") : ""}</b>
          <p>{property.description ? localize(property.description, locale) : ""}</p>
        </div>
      ))}
    </div>
  );
}
