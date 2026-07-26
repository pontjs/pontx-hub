import type { Route } from "./+types/operation-detail";
import { MethodBadge } from "~/components/method-badge";
import { PlaygroundPanel } from "~/components/playground-panel";
import { SiteShell } from "~/components/site-shell";
import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import {
  credentialEnvVar,
  localize,
  type CatalogParameter
} from "~/lib/catalog/types";
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
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "article" },
    { tagName: "link", rel: "canonical", href: siteUrl(path) },
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

function ParameterSchema({
  parameter,
  locale
}: {
  parameter: CatalogParameter;
  locale: "zh" | "en";
}) {
  const zh = locale === "zh";
  return (
    <article className="schema-field">
      <div className="schema-field-heading">
        <code>{parameter.name}</code>
        <span className="schema-type">{parameter.type}</span>
        <span className="schema-location">{parameter.in}</span>
        {parameter.required ? (
          <span className="schema-required">{zh ? "必填" : "required"}</span>
        ) : null}
      </div>
      {parameter.description ? (
        <p>{localize(parameter.description, locale)}</p>
      ) : null}
      {parameter.example !== undefined ? (
        <pre className="schema-example">
          <code>{JSON.stringify(parameter.example, null, 2)}</code>
        </pre>
      ) : null}
    </article>
  );
}

export default function OperationDetail({
  loaderData
}: Route.ComponentProps) {
  const { locale, api, operation } = loaderData;
  const zh = locale === "zh";
  const usageMethod = operation.operationId
    .split(/[/-]/g)
    .map((part, index) =>
      index === 0 ? part : `${part[0]?.toUpperCase()}${part.slice(1)}`
    )
    .join("");
  const usage = `import { createClient } from "${api.packageName}";

const client = createClient({
  token: process.env.${credentialEnvVar(api.auth[0])}
});

const result = await client.${usageMethod}({
  // Typed parameters from the approved OAS
});`;

  return (
    <SiteShell locale={locale}>
      <main>
        <header
          className="detail-hero"
          style={{ "--api-accent": api.accent } as React.CSSProperties}
        >
          <p className="detail-kicker">
            {api.provider} / {operation.tag} / {operation.operationId}
          </p>
          <div className="operation-heading">
            <MethodBadge method={operation.method} />
            <h1>{localize(operation.title, locale)}</h1>
          </div>
          <p>{localize(operation.description, locale)}</p>
          <div className="endpoint-line">
            <MethodBadge method={operation.method} compact />
            <code>{api.servers[0].url}{operation.path}</code>
          </div>
        </header>

        <div className="operation-grid">
          <article className="operation-docs">
            <section>
              <h2>{zh ? "参数" : "Parameters"}</h2>
              {operation.parameters.length ? (
                <div className="schema-card" aria-label={zh ? "参数 Schema" : "Parameter schema"}>
                  <div className="schema-card-bar">
                    <span>{zh ? "请求 Schema" : "Request schema"}</span>
                    <code>application/json</code>
                  </div>
                  <div className="schema-fields">
                    {operation.parameters.map((parameter) => (
                      <ParameterSchema
                        key={`${parameter.in}-${parameter.name}`}
                        parameter={parameter}
                        locale={locale}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p>{zh ? "该 Operation 没有请求参数。" : "This operation has no request parameters."}</p>
              )}
            </section>

            <section>
              <h2>{zh ? "响应示例" : "Response example"}</h2>
              <pre className="code-block">
                <code>{JSON.stringify(operation.responseExample ?? {}, null, 2)}</code>
              </pre>
            </section>

            {api.sdkStatus === "published" ? (
              <section>
                <h2>{zh ? "TypeScript SDK" : "TypeScript SDK"}</h2>
                <pre className="code-block">
                  <code>{usage}</code>
                </pre>
              </section>
            ) : null}
          </article>

          <PlaygroundPanel locale={locale} api={api} operation={operation} />
        </div>
      </main>
    </SiteShell>
  );
}
