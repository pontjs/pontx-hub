import type { Route } from "./+types/schema-detail";
import { SchemaReference } from "~/components/schema-reference";
import { SiteShell } from "~/components/site-shell";
import { getCatalogSchema, getPontxSpec } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";
import { breadcrumbList, localizedAlternates } from "~/lib/seo";

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const match = getCatalogSchema(params.apiSlug ?? "", params.schemaName ?? "");
  if (!match) throw new Response("Schema not found", { status: 404 });
  const spec = getPontxSpec(match.api.slug, locale);
  if (!spec) throw new Response("PontxSpec not found", { status: 500 });
  return { locale, spec, ...match };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: "Schema not found — Pontx Hub" }];
  const { locale, api, schema } = data;
  const localizedTitle = localize(schema.title, locale);
  const title = localizedTitle === schema.name
    ? `${schema.name} Schema — ${api.name}`
    : `${localizedTitle} (${schema.name}) — ${api.name}`;
  const description = localize(schema.description, locale);
  const path = `/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`;
  const canonical = siteUrl(path);
  const keywords = [api.name, api.provider, schema.name, schema.type, ...schema.properties.map((property) => property.name)];
  return [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords.join(", ") },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "article" },
    { property: "og:url", content: canonical },
    { property: "og:site_name", content: "Pontx Hub" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    ...localizedAlternates(`/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [{
          "@type": "TechArticle",
          headline: title,
          description,
          url: canonical,
          identifier: schema.name,
          keywords,
          about: { "@type": "Thing", name: api.name },
          isPartOf: {
            "@type": "WebSite",
            name: "Pontx Hub",
            url: siteUrl(`/${locale}`)
          }
        }, breadcrumbList(locale, [
          { name: locale === "zh" ? "API 目录" : "API Catalog", path: "" },
          { name: api.name, path: `/apis/${api.slug}` },
          { name: schema.name, path: `/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}` }
        ])]
      }
    }
  ];
}

export function headers() {
  return cacheHeaders();
}

export default function SchemaDetail({ loaderData }: Route.ComponentProps) {
  const { locale, api, spec, schema } = loaderData;
  return (
    <SiteShell locale={locale}>
      <SchemaReference locale={locale} api={api} spec={spec} schema={schema} />
    </SiteShell>
  );
}
