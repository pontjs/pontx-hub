import type { Route } from "./+types/operation-detail";
import { PontxApiWorkspace } from "~/components/pontx-api-workspace";
import { SiteShell } from "~/components/site-shell";
import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const match = getCatalogOperation(
    params.apiSlug ?? "",
    params.operationSlug ?? ""
  );
  if (!match) throw new Response("Operation not found", { status: 404 });
  return { locale, ...match };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: "Operation not found — Pontx Hub" }];
  const { locale, api, operation } = data;
  const title = `${localize(operation.title, locale)} — ${api.name}`;
  const description = localize(operation.description, locale);
  const path = `/${locale}/apis/${api.slug}/${operation.slug}`;
  const schemaNames = [
    operation.requestBody?.schemaName,
    ...operation.responses.map((response) => response.schemaName)
  ].filter((name): name is string => Boolean(name));
  const keywords = [
    api.name,
    api.provider,
    operation.operationId,
    operation.method,
    operation.path,
    ...schemaNames
  ];
  const canonical = siteUrl(path);
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
    {
      tagName: "link",
      rel: "alternate",
      hrefLang: "zh-CN",
      href: siteUrl(`/zh/apis/${api.slug}/${operation.slug}`)
    },
    {
      tagName: "link",
      rel: "alternate",
      hrefLang: "en",
      href: siteUrl(`/en/apis/${api.slug}/${operation.slug}`)
    },
    {
      tagName: "link",
      rel: "alternate",
      hrefLang: "x-default",
      href: siteUrl(`/en/apis/${api.slug}/${operation.slug}`)
    },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: title,
        description,
        url: canonical,
        identifier: operation.operationId,
        articleSection: `${operation.method} ${operation.path}`,
        keywords,
        about: [
          { "@type": "Thing", name: api.name },
          ...schemaNames.map((name) => ({ "@type": "Thing", name }))
        ],
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

export default function OperationDetail({
  loaderData
}: Route.ComponentProps) {
  const { locale, api, operation } = loaderData;

  return (
    <SiteShell locale={locale}>
      <PontxApiWorkspace locale={locale} api={api} operation={operation} />
    </SiteShell>
  );
}
