import { useState } from "react";
import { Link, redirect } from "react-router";
import type { Route } from "./+types/saved-apis";
import { FavoriteEndpointButton } from "~/components/favorite-endpoint-button";
import { MethodBadge } from "~/components/method-badge";
import { SiteShell } from "~/components/site-shell";
import { listFavoriteEndpoints } from "~/lib/accounts/favorites.server";
import { loadAccountsViewer } from "~/lib/accounts/viewer.server";
import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { requireLocale } from "~/lib/http";

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const accounts = await loadAccountsViewer(request);
  if (!accounts.enabled) throw new Response("Not found", { status: 404 });
  if (!accounts.viewer) {
    const path = `/${locale}/account/saved`;
    throw redirect(`/${locale}/sign-in?returnTo=${encodeURIComponent(path)}`);
  }
  const favorites = await listFavoriteEndpoints(request);
  const available = favorites.flatMap((favorite) => {
    const match = getCatalogOperation(favorite.apiSlug, favorite.operationSlug);
    return match ? [{ ...favorite, ...match }] : [];
  });
  const unavailable = favorites.filter(
    (favorite) => !getCatalogOperation(favorite.apiSlug, favorite.operationSlug)
  );
  return { locale, available, unavailable };
}

export function meta({ data }: Route.MetaArgs) {
  const zh = data?.locale !== "en";
  return [
    { title: zh ? "已收藏的接口 — Pontx Hub" : "Saved Endpoints — Pontx Hub" },
    {
      name: "description",
      content: zh
        ? "管理你在 Pontx Hub 收藏的接口。"
        : "Manage Endpoints saved to your Pontx Hub account."
    },
    { name: "robots", content: "noindex,nofollow" }
  ];
}

export function headers() {
  return { "Cache-Control": "private, no-store" };
}

export default function SavedApis({ loaderData }: Route.ComponentProps) {
  const { locale, available, unavailable } = loaderData;
  const zh = locale === "zh";
  const [savedEndpoints, setSavedEndpoints] = useState(available);
  const [unavailableEndpoints, setUnavailableEndpoints] = useState(unavailable);
  return (
    <SiteShell locale={locale}>
      <main className="saved-apis-page">
        <header className="saved-apis-header">
          <p className="account-eyebrow">PONTX / SAVED</p>
          <h1>{zh ? "你的接口书架" : "Your Endpoint shelf"}</h1>
          <p>
            {zh
              ? "跨设备同步常用接口。认证密钥与 OAuth Token 始终只保存在当前会话中。"
              : "Keep useful Endpoints in sync across devices. API keys and OAuth tokens always stay in this browser session."}
          </p>
        </header>
        <nav
          className="account-section-nav"
          aria-label={locale === "zh" ? "账户内容" : "Account content"}
        >
          <Link to={`/${locale}/account/saved`} aria-current="page">
            {locale === "zh" ? "收藏的接口" : "Saved Endpoints"}
          </Link>
          <Link to={`/${locale}/account/history`}>
            {locale === "zh" ? "调试历史" : "Playground history"}
          </Link>
        </nav>
        {savedEndpoints.length ? (
          <section className="search-result-group" aria-labelledby="saved-endpoints-heading">
            <header>
              <h2 id="saved-endpoints-heading">{zh ? "收藏的接口" : "Saved Endpoints"}</h2>
              <span>{savedEndpoints.length}</span>
            </header>
            <div className="search-result-list">
              {savedEndpoints.map(({ api, operation }) => (
                <div className="search-result-item" key={`${api.slug}/${operation.slug}`}>
                  <Link
                    className="search-result-row"
                    to={`/${locale}/apis/${api.slug}/${operation.slug}`}
                  >
                    <MethodBadge method={operation.method} compact />
                    <div className="search-result-main">
                      <div>
                        <strong>{localize(operation.title, locale)}</strong>
                        <code>{operation.operationId}</code>
                      </div>
                      <p>{localize(operation.description, locale)}</p>
                    </div>
                    <div className="search-result-context">
                      <span>{localize(api.title, locale)}</span>
                      <code>{operation.method} {operation.path}</code>
                    </div>
                    <span className="search-result-arrow" aria-hidden="true">→</span>
                  </Link>
                  <FavoriteEndpointButton
                    apiSlug={api.slug}
                    operationSlug={operation.slug}
                    endpointLabel={localize(operation.title, locale)}
                    locale={locale}
                    initialFavorite
                    compact
                    onChange={(saved) => {
                      if (!saved) {
                        setSavedEndpoints((current) => current.filter(
                          (item) => item.api.slug !== api.slug || item.operation.slug !== operation.slug
                        ));
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="saved-apis-empty">
            <strong>{zh ? "还没有收藏接口" : "No saved Endpoints yet"}</strong>
            <p>{zh ? "搜索或打开一个接口，然后选择星标。" : "Search for or open an Endpoint, then use its star."}</p>
            <a className="button button-dark" href={`/${locale}`}>{zh ? "浏览 API 目录" : "Browse API catalog"}</a>
          </section>
        )}
        {unavailableEndpoints.length ? (
          <section className="saved-apis-unavailable">
            <h2>{zh ? "暂不可用" : "Unavailable"}</h2>
            <p>{zh ? "这些接口已不在当前目录中，但你仍可移除收藏记录。" : "These Endpoints are no longer in the catalog, but you can still remove their saved records."}</p>
            {unavailableEndpoints.map((favorite) => (
              <p key={`${favorite.apiSlug}/${favorite.operationSlug}`}>
                <code>{favorite.apiSlug}/{favorite.operationSlug}</code>{" "}
                <FavoriteEndpointButton
                  {...favorite}
                  endpointLabel={`${favorite.apiSlug}/${favorite.operationSlug}`}
                  locale={locale}
                  initialFavorite
                  onChange={(saved) => {
                    if (!saved) {
                      setUnavailableEndpoints((current) => current.filter(
                        (item) => item.apiSlug !== favorite.apiSlug || item.operationSlug !== favorite.operationSlug
                      ));
                    }
                  }}
                />
              </p>
            ))}
          </section>
        ) : null}
      </main>
    </SiteShell>
  );
}
