import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { SchemaProvider } from "@pontx/shadcn-ui";
import { SchemaViewer } from "@pontx/shadcn-ui/schema-viewer";
import type { CatalogApi, CatalogSchema, Locale } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { ResourceDirectoryNavigation } from "~/components/resource-directory-navigation";
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
      <div className="schema-reference-grid">
        <aside className="schema-directory">
          <ResourceDirectoryNavigation locale={locale} api={api} active="schemas" />
          <nav
            className="schema-directory-list"
            aria-label={zh ? "数据结构目录" : "Schema directory"}
          >
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

        <section className="schema-reference-content">
          <header className="schema-reference-header">
            <p className="registry-label">OPENAPI / COMPONENTS / SCHEMAS</p>
            <h1>{localize(schema.title, locale)}</h1>
            <code>{schema.name}</code>
            <p>{localize(schema.description, locale)}</p>
          </header>
          <div className="schema-viewer-panel">
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
          </div>
        </section>
      </div>
    </main>
  );
}
