import type { Route } from "./+types/operation-detail";
import { useOutletContext } from "react-router";
import { PontxApiWorkspace } from "~/components/pontx-api-workspace";
import { SiteShell } from "~/components/site-shell";
import { getEndpointMetadata } from "~/lib/catalog/metadata.server";
import { localize } from "~/lib/catalog/types";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";
import { breadcrumbList, localizedAlternates } from "~/lib/seo";
import type { ApiLayoutContext } from "./api-layout";
import { withCurrentOperation } from "~/lib/catalog/page-context";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const detail = getEndpointMetadata(
    params.apiSlug ?? "",
    params.operationSlug ?? "",
    locale,
    { includeDirectory: false }
  );
  if (!detail) throw new Response("Operation not found", { status: 404 });
  return detail;
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: "Operation not found — Pontx Hub" }];
  const { locale, product: api, endpoint: operation } = data;
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
    ...localizedAlternates(`/apis/${api.slug}/${operation.slug}`),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [{
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
        }, breadcrumbList(locale, [
          { name: locale === "zh" ? "API 目录" : "API Catalog", path: "" },
          { name: api.name, path: `/apis/${api.slug}` },
          { name: localize(operation.title, locale), path: `/apis/${api.slug}/${operation.slug}` }
        ])]
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
  const { locale, api, skillName } = useOutletContext<ApiLayoutContext>();
  const { pontxSpec: spec, endpoint: operation } = loaderData;

  return (
    <SiteShell locale={locale}>
      <PontxApiWorkspace
        locale={locale}
        api={withCurrentOperation(api, operation)}
        spec={spec}
        operation={operation}
        skillName={skillName}
      />
    </SiteShell>
  );
}
