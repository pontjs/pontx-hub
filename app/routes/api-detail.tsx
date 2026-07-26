import { Link } from "react-router";
import type { Route } from "./+types/api-detail";
import { MethodBadge } from "~/components/method-badge";
import { SiteShell } from "~/components/site-shell";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const api = getCatalogApi(params.apiSlug ?? "");
  if (!api) throw new Response("API not found", { status: 404 });
  return { locale, api };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: "API not found — Pontx Hub" }];
  const { api, locale } = data;
  const title = `${localize(api.title, locale)} — Pontx Hub`;
  const description = localize(api.summary, locale);
  const url = siteUrl(`/${locale}/apis/${api.slug}`);
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "article" },
    { property: "og:url", content: url },
    { tagName: "link", rel: "canonical", href: url },
    {
      tagName: "link",
      rel: "alternate",
      hrefLang: "zh-CN",
      href: siteUrl(`/zh/apis/${api.slug}`)
    },
    {
      tagName: "link",
      rel: "alternate",
      hrefLang: "en",
      href: siteUrl(`/en/apis/${api.slug}`)
    }
  ];
}

export function headers() {
  return cacheHeaders();
}

export default function ApiDetail({ loaderData }: Route.ComponentProps) {
  const { locale, api } = loaderData;
  const zh = locale === "zh";
  const tags = [...new Set(api.operations.map((operation) => operation.tag))];

  return (
    <SiteShell locale={locale}>
      <main>
        <header
          className="detail-hero"
          style={{ "--api-accent": api.accent } as React.CSSProperties}
        >
          <p className="detail-kicker">
            <span className="provider-monogram">{api.provider.slice(0, 2)}</span>
            {api.provider} / {api.category}
          </p>
          <h1>{localize(api.title, locale)}</h1>
          <p>{localize(api.summary, locale)}</p>
          <div className="detail-meta">
            <span>{api.operations.length} operations</span>
            <span>{api.servers[0]?.url}</span>
            <Link to={`/${locale}/sdks/${api.slug}`}>{api.packageName}</Link>
            <a href={api.attributionUrl} rel="noreferrer" target="_blank">
              {api.license} ↗
            </a>
          </div>
        </header>

        <div className="reference-layout">
          <aside className="reference-nav">
            <h2>{zh ? "标签" : "Tags"}</h2>
            <ul>
              {tags.map((tag) => (
                <li key={tag}>
                  <a href={`#${tag.toLowerCase().replaceAll(" ", "-")}`}>
                    <strong>{tag}</strong>
                    <small>
                      {api.operations.filter((operation) => operation.tag === tag).length}{" "}
                      operations
                    </small>
                  </a>
                </li>
              ))}
            </ul>
          </aside>
          <div className="reference-content">
            {tags.map((tag) => (
              <section id={tag.toLowerCase().replaceAll(" ", "-")} key={tag}>
                <h2>{tag}</h2>
                {api.operations
                  .filter((operation) => operation.tag === tag)
                  .map((operation) => (
                    <Link
                      className="operation-row"
                      key={operation.slug}
                      to={`/${locale}/apis/${api.slug}/${operation.slug}`}
                    >
                      <MethodBadge method={operation.method} compact />
                      <span>
                        <h3>{localize(operation.title, locale)}</h3>
                        <code>{operation.path}</code>
                      </span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  ))}
              </section>
            ))}
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
