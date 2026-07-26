import { Form } from "react-router";
import type { Route } from "./+types/catalog";
import { ApiCard } from "~/components/api-card";
import { SiteShell } from "~/components/site-shell";
import { listCatalogSummaries } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { requireLocale, siteUrl } from "~/lib/http";

export function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const apis = listCatalogSummaries().filter((api) => {
    if (!query) return true;
    return [
      api.name,
      api.provider,
      api.category,
      localize(api.title, locale),
      localize(api.summary, locale)
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
  });
  return { locale, query, apis };
}

export function meta({ data }: Route.MetaArgs) {
  const locale = data?.locale ?? "zh";
  const title =
    locale === "zh"
      ? "API 目录 — Pontx Hub"
      : "API Catalog — Pontx Hub";
  return [
    { title },
    {
      name: "description",
      content:
        locale === "zh"
          ? "浏览经过筛选的 OpenAPI 文档、TypeScript SDK 和 Agent 调用能力。"
          : "Browse curated OpenAPI references, TypeScript SDKs, and agent-ready workflows."
    },
    ...(data?.query ? [{ name: "robots", content: "noindex,follow" }] : []),
    { tagName: "link", rel: "canonical", href: siteUrl(`/${locale}/apis`) }
  ];
}

export default function Catalog({ loaderData }: Route.ComponentProps) {
  const { locale, query, apis } = loaderData;
  const zh = locale === "zh";

  return (
    <SiteShell locale={locale}>
      <main>
        <header className="catalog-hero">
          <p className="eyebrow">API Atlas / {String(apis.length).padStart(2, "0")}</p>
          <h1>{zh ? "常用 API，一处读懂。" : "The APIs you reach for, in one place."}</h1>
          <p>
            {zh
              ? "每个 API 都经过来源、鉴权、调试边界和 SDK 发布检查。"
              : "Every API is reviewed for provenance, auth, debugging boundaries, and SDK delivery."}
          </p>
        </header>
        <section className="section">
          <Form className="catalog-toolbar" method="get">
            <input
              name="q"
              defaultValue={query}
              placeholder={zh ? "搜索 Provider、分类或能力…" : "Search provider, category, or capability…"}
              aria-label={zh ? "搜索 API" : "Search APIs"}
            />
            <span>
              {apis.length} {zh ? "个结果" : "results"}
            </span>
          </Form>
          <div className="api-grid">
            {apis.map((api, index) => (
              <ApiCard key={api.slug} api={api} locale={locale} index={index} />
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
