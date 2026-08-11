import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { SchemaProvider } from "@pontx/shadcn-ui";
import { SchemaViewer } from "@pontx/shadcn-ui/schema-viewer";
import type { CatalogApi, CatalogSchema, Locale } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { apiWorkspaceNavigationCopy } from "~/lib/i18n";
import { ResourceNavigation } from "~/components/resource-navigation";

export function SchemaReference({
  locale,
  api,
  schema
}: {
  locale: Locale;
  api: CatalogApi;
  schema: CatalogSchema;
}) {
  const zh = locale === "zh";
  const workspaceCopy = apiWorkspaceNavigationCopy(locale);
  const [isHydrated, setIsHydrated] = useState(false);
  const components = useMemo(
    () => ({
      schemas: Object.fromEntries(
        api.schemas.map((catalogSchema) => [
          catalogSchema.name,
          catalogSchema.localizedSchema?.[locale] ?? catalogSchema.schema
        ])
      )
    }),
    [api.schemas, locale]
  );
  const viewerSchema = useMemo(
    () => ({ ...(schema.localizedSchema?.[locale] ?? schema.schema), components }),
    [components, locale, schema.localizedSchema, schema.schema]
  );

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <main className="schema-reference">
      <ResourceNavigation locale={locale} api={api} active="schemas" />
      <header className="schema-reference-header">
        <p className="registry-label">OPENAPI / COMPONENTS / SCHEMAS</p>
        <h1>{localize(schema.title, locale)}</h1>
        <code>{schema.name}</code>
        <p>{localize(schema.description, locale)}</p>
      </header>

      <div className="schema-reference-grid">
        <aside className="schema-directory">
          <div className="pontx-pane-label">
            <span>{zh ? "数据结构" : "Schemas"}</span>
            <strong>{api.schemas.length}</strong>
          </div>
          <nav aria-label={zh ? "数据结构目录" : "Schema directory"}>
            {api.schemas.map((item) => (
              <Link
                className={item.name === schema.name ? "is-active" : undefined}
                key={item.name}
                to={`/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(item.name)}`}
                reloadDocument
              >
                <strong>{localize(item.title, locale)}</strong>
                <code>{item.name}</code>
              </Link>
            ))}
          </nav>
        </aside>

        <section className="schema-viewer-panel">
          {isHydrated ? (
            <SchemaProvider components={components}>
              <SchemaViewer
                name={schema.name}
                schema={viewerSchema}
                hideHeader
                defaultExpandedDepth={2}
                className="hub-schema-viewer"
              />
            </SchemaProvider>
          ) : (
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
          )}
        </section>

        <aside className="schema-facts">
          <p className="registry-label">SCHEMA INDEX</p>
          <dl>
            <div><dt>API</dt><dd>{api.name}</dd></div>
            <div><dt>{zh ? "类型" : "Type"}</dt><dd>{schema.type}</dd></div>
            <div><dt>{zh ? "字段" : "Properties"}</dt><dd>{schema.properties.length}</dd></div>
            <div><dt>{zh ? "必填字段" : "Required"}</dt><dd>{schema.required.length}</dd></div>
          </dl>
          <Link
            to={`/${locale}/apis/${api.slug}/${api.operations[0].slug}`}
            reloadDocument
          >
            {workspaceCopy.openRelatedEndpoint} <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
    </main>
  );
}
