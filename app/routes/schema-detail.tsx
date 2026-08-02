import type { Route } from "./+types/schema-detail";
import { SchemaReference } from "~/components/schema-reference";
import { SiteShell } from "~/components/site-shell";
import { getCatalogSchema } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const match = getCatalogSchema(params.apiSlug ?? "", params.schemaName ?? "");
  if (!match) throw new Response("Schema not found", { status: 404 });
  return { locale, ...match };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: "Schema not found — Pontx Hub" }];
  const { locale, api, schema } = data;
  const title = `${localize(schema.title, locale)} (${schema.name}) — ${api.name}`;
  const description = localize(schema.description, locale);
  const path = `/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`;
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { tagName: "link", rel: "canonical", href: siteUrl(path) },
    {
      tagName: "link",
      rel: "alternate",
      hrefLang: "zh-CN",
      href: siteUrl(`/zh/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`)
    },
    {
      tagName: "link",
      rel: "alternate",
      hrefLang: "en",
      href: siteUrl(`/en/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`)
    },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: title,
        description,
        isPartOf: {
          "@type": "WebSite",
          name: "Pontx Hub",
          url: siteUrl(`/${locale}`)
        }
      }
    }
  ];
}

export function headers() {
  return cacheHeaders();
}

export default function SchemaDetail({ loaderData }: Route.ComponentProps) {
  const { locale, api, schema } = loaderData;
  return (
    <SiteShell locale={locale}>
      <SchemaReference locale={locale} api={api} schema={schema} />
    </SiteShell>
  );
}
