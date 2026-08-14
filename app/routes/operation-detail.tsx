import type { Route } from "./+types/operation-detail";
import type { EndpointPlaygroundHistoryEntry } from "~/components/endpoint-playground-history";
import { PontxApiWorkspace } from "~/components/pontx-api-workspace";
import { SiteShell } from "~/components/site-shell";
import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import { isFavoriteEndpoint } from "~/lib/accounts/favorites";
import { listFavoriteEndpointsForUser } from "~/lib/accounts/favorites.server";
import { listPlaygroundHistoryForOperationForUser } from "~/lib/accounts/playground-history.server";
import { loadAccountsViewer } from "~/lib/accounts/viewer.server";
import { localize } from "~/lib/catalog/types";
import { accountAwareCacheHeaders, requireLocale, siteUrl } from "~/lib/http";
import { breadcrumbList, localizedAlternates } from "~/lib/seo";

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const match = getCatalogOperation(
    params.apiSlug ?? "",
    params.operationSlug ?? ""
  );
  if (!match) throw new Response("Operation not found", { status: 404 });
  const accounts = await loadAccountsViewer(request);
  const [favoritesResult, historyResult] = accounts.viewer
    ? await Promise.allSettled([
        listFavoriteEndpointsForUser(accounts.viewer.id),
        listPlaygroundHistoryForOperationForUser(
          accounts.viewer.id,
          match.api.slug,
          match.operation.slug,
          3
        )
      ])
    : [undefined, undefined];
  const favorites = favoritesResult?.status === "fulfilled"
    ? favoritesResult.value
    : [];
  const approvedServerIds = new Set(
    match.operation.serverIds.length
      ? match.operation.serverIds
      : match.api.servers.map((server) => server.id)
  );
  const playgroundHistory: EndpointPlaygroundHistoryEntry[] =
    historyResult?.status === "fulfilled"
      ? historyResult.value.flatMap((entry) => {
          const server = match.api.servers.find(
            (candidate) =>
              candidate.id === entry.serverId &&
              approvedServerIds.has(candidate.id)
          );
          return server ? [{
            id: entry.id,
            serverId: entry.serverId,
            pathValues: entry.path,
            queryValues: entry.query,
            headerValues: entry.headers,
            requestBody: entry.requestBody,
            hasRequestBody: entry.hasRequestBody,
            omittedFields: entry.omittedFields,
            responseStatus: entry.responseStatus,
            durationMs: entry.durationMs,
            createdAt: entry.createdAt.toISOString()
          }] : [];
        })
      : [];
  return {
    locale,
    ...match,
    favorite: isFavoriteEndpoint(
      favorites,
      match.api.slug,
      match.operation.slug
    ),
    playgroundHistoryEnabled:
      Boolean(accounts.viewer) && historyResult?.status === "fulfilled",
    playgroundHistory
  };
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
  return accountAwareCacheHeaders();
}

export default function OperationDetail({
  loaderData
}: Route.ComponentProps) {
  const {
    locale,
    api,
    operation,
    favorite,
    playgroundHistoryEnabled,
    playgroundHistory
  } = loaderData;

  return (
    <SiteShell locale={locale}>
      <PontxApiWorkspace
        locale={locale}
        api={api}
        operation={operation}
        initialFavorite={favorite}
        playgroundHistoryEnabled={playgroundHistoryEnabled}
        initialPlaygroundHistory={playgroundHistory}
      />
    </SiteShell>
  );
}
