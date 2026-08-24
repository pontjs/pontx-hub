import type { Route } from "./+types/api-detail";
import { useOutletContext } from "react-router";
import { PontxApiWorkspace } from "~/components/pontx-api-workspace";
import { SiteShell } from "~/components/site-shell";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { getEndpointMetadata } from "~/lib/catalog/metadata.server";
import type { CatalogOperation } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";
import { breadcrumbList, localizedAlternates } from "~/lib/seo";
import type { ApiLayoutContext } from "./api-layout";
import { withCurrentOperation } from "~/lib/catalog/page-context";

function quickStartScore(operation: CatalogOperation): number {
  const required = operation.parameters.filter((parameter) => parameter.required);
  const hasReadyExamples = required.every(
    (parameter) =>
      parameter.default !== undefined ||
      parameter.example !== undefined ||
      Boolean(parameter.examples?.length)
  );
  return (
    (operation.method === "GET" ? 20 : 0) +
    (operation.proxyEnabled ? 10 : 0) +
    (hasReadyExamples ? 8 : 0) +
    (required.length === 0 ? 4 : 0) +
    (operation.deprecated ? -20 : 0)
  );
}

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const api = getCatalogApi(params.apiSlug ?? "");
  if (!api) throw new Response("API not found", { status: 404 });
  const operation =
    api.operations.find(
      (candidate) => candidate.slug === api.quickStart?.operationSlug
    ) ??
    [...api.operations].sort(
      (left, right) => quickStartScore(right) - quickStartScore(left)
    )[0];
  if (!operation) throw new Response("Endpoint not found", { status: 404 });
  const detail = getEndpointMetadata(api.slug, operation.slug, locale, {
    includeDirectory: false
  });
  if (!detail) {
    throw new Response("Product metadata not found", { status: 500 });
  }
  return {
    ...detail,
    topics: api.operations.slice(0, 6).map((item) => localize(item.title, locale))
  };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: "API not found — Pontx Hub" }];
  const { locale, product: api } = data;
  const apiTitle = localize(api.title, locale);
  const title = locale === "zh"
    ? `${apiTitle}：在线试用、接口文档与 SDK`
    : `${apiTitle}: Try the API, Explore Endpoints, and Use the SDK`;
  const description = localize(api.summary, locale);
  const canonical = siteUrl(`/${locale}/apis/${api.slug}`);
  const topics = [api.name, api.provider, apiTitle, ...data.topics];
  return [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: topics.join(", ") },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonical },
    { property: "og:site_name", content: "Pontx Hub" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    ...localizedAlternates(`/apis/${api.slug}`),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebAPI",
            name: apiTitle,
            description,
            url: canonical,
            provider: { "@type": "Organization", name: api.provider },
            documentation: siteUrl(`/${locale}/apis/${api.slug}/${data.endpoint.slug}`),
            sameAs: api.attributionUrl
          },
          breadcrumbList(locale, [
            { name: locale === "zh" ? "API 目录" : "API Catalog", path: "" },
            { name: apiTitle, path: `/apis/${api.slug}` }
          ])
        ]
      }
    }
  ];
}

export function headers() {
  return cacheHeaders();
}

export default function ApiDetail({ loaderData }: Route.ComponentProps) {
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
        variant="guided"
      />
    </SiteShell>
  );
}
