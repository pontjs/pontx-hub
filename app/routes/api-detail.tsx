import type { Route } from "./+types/api-detail";
import { PontxApiWorkspace } from "~/components/pontx-api-workspace";
import { SiteShell } from "~/components/site-shell";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import type { CatalogOperation } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { accountAwareCacheHeaders, requireLocale, siteUrl } from "~/lib/http";
import { breadcrumbList, localizedAlternates } from "~/lib/seo";
import { FavoriteApiButton } from "~/components/favorite-api-button";
import { listFavoriteApiSlugs } from "~/lib/accounts/favorites.server";

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

export async function loader({ params, request }: Route.LoaderArgs) {
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
  const favoriteApiSlugs = await listFavoriteApiSlugs(request);
  return { locale, api, operation, favorite: favoriteApiSlugs.includes(api.slug) };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: "API not found — Pontx Hub" }];
  const { locale, api } = data;
  const apiTitle = localize(api.title, locale);
  const title = locale === "zh"
    ? `${apiTitle}：在线试用、接口文档与 SDK`
    : `${apiTitle}: Try the API, Explore Endpoints, and Use the SDK`;
  const description = localize(api.summary, locale);
  const canonical = siteUrl(`/${locale}/apis/${api.slug}`);
  const topics = [api.name, api.provider, apiTitle, ...api.operations.slice(0, 6).map((item) => localize(item.title, locale))];
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
            documentation: siteUrl(`/${locale}/apis/${api.slug}/${api.operations[0]?.slug ?? ""}`),
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
  return accountAwareCacheHeaders();
}

export default function ApiDetail({ loaderData }: Route.ComponentProps) {
  const { locale, api, operation, favorite } = loaderData;
  return (
    <SiteShell locale={locale}>
      <div className="api-favorite-toolbar">
        <FavoriteApiButton apiSlug={api.slug} locale={locale} initialFavorite={favorite} />
      </div>
      <PontxApiWorkspace
        locale={locale}
        api={api}
        operation={operation}
        variant="guided"
      />
    </SiteShell>
  );
}
