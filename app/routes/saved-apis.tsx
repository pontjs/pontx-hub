import { redirect } from "react-router";
import type { Route } from "./+types/saved-apis";
import { ApiCard } from "~/components/api-card";
import { SiteShell } from "~/components/site-shell";
import { listFavoriteApiSlugs } from "~/lib/accounts/favorites.server";
import { loadAccountsViewer } from "~/lib/accounts/viewer.server";
import { listCatalogSummaries } from "~/lib/catalog/catalog.server";
import { requireLocale } from "~/lib/http";

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const accounts = await loadAccountsViewer(request);
  if (!accounts.enabled) throw new Response("Not found", { status: 404 });
  if (!accounts.viewer) {
    const path = `/${locale}/account/saved`;
    throw redirect(`/${locale}/sign-in?returnTo=${encodeURIComponent(path)}`);
  }
  const favoriteApiSlugs = await listFavoriteApiSlugs(request);
  const catalog = listCatalogSummaries();
  const available = favoriteApiSlugs
    .map((slug) => catalog.find((api) => api.slug === slug))
    .filter((api): api is (typeof catalog)[number] => Boolean(api));
  const unavailable = favoriteApiSlugs.filter(
    (slug) => !catalog.some((api) => api.slug === slug)
  );
  return { locale, available, unavailable };
}

export function meta({ data }: Route.MetaArgs) {
  const zh = data?.locale !== "en";
  return [
    { title: zh ? "已收藏的 API — Pontx Hub" : "Saved APIs — Pontx Hub" },
    {
      name: "description",
      content: zh ? "管理你在 Pontx Hub 收藏的 API。" : "Manage APIs saved to your Pontx Hub account."
    },
    { name: "robots", content: "noindex,nofollow" }
  ];
}

export default function SavedApis({ loaderData }: Route.ComponentProps) {
  const { locale, available, unavailable } = loaderData;
  const zh = locale === "zh";
  return (
    <SiteShell locale={locale}>
      <main className="saved-apis-page">
        <header className="saved-apis-header">
          <p className="account-eyebrow">PONTX / SAVED</p>
          <h1>{zh ? "你的 API 书架" : "Your API shelf"}</h1>
          <p>
            {zh
              ? "跨设备同步常用 API。认证密钥与 OAuth Token 始终只保存在当前会话中。"
              : "Keep useful APIs in sync across devices. API keys and OAuth tokens always stay in this browser session."}
          </p>
        </header>
        {available.length ? (
          <div className="api-grid saved-apis-grid">
            {available.map((api, index) => (
              <ApiCard
                key={api.slug}
                api={api}
                locale={locale}
                index={index}
                initialFavorite
              />
            ))}
          </div>
        ) : (
          <section className="saved-apis-empty">
            <strong>{zh ? "还没有收藏 API" : "No saved APIs yet"}</strong>
            <p>{zh ? "回到目录，在想保留的 API 卡片上选择星标。" : "Return to the catalog and use the star on any API card."}</p>
            <a className="button button-dark" href={`/${locale}`}>{zh ? "浏览 API 目录" : "Browse API catalog"}</a>
          </section>
        )}
        {unavailable.length ? (
          <section className="saved-apis-unavailable">
            <h2>{zh ? "暂不可用" : "Unavailable"}</h2>
            <p>{zh ? "这些 API 已不在当前目录中，但收藏记录仍被保留。" : "These APIs are no longer in the catalog, but their saved records are retained."}</p>
            <code>{unavailable.join(", ")}</code>
          </section>
        ) : null}
      </main>
    </SiteShell>
  );
}
