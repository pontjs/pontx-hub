import type { Route } from "./+types/sdk-detail";
import { SiteShell } from "~/components/site-shell";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { requireLocale, siteUrl } from "~/lib/http";

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const api = getCatalogApi(params.apiSlug ?? "");
  if (!api) throw new Response("SDK not found", { status: 404 });
  return { locale, api };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: "SDK not found — Pontx Hub" }];
  const title = `${data.api.packageName} — TypeScript SDK`;
  const description = data.locale === "zh"
    ? `${localize(data.api.title, data.locale)} 的 TypeScript 与 Node.js SDK 集成说明。`
    : `Install and use the operator-maintained TypeScript and Node.js SDK for ${data.api.name}.`;
  const canonical = siteUrl(`/${data.locale}/sdks/${data.api.slug}`);
  return [
    { title },
    { name: "description", content: description },
    ...(data.api.sdkStatus === "planned" ? [{ name: "robots", content: "noindex,follow" }] : []),
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonical },
    { name: "twitter:card", content: "summary" },
    { tagName: "link", rel: "canonical", href: canonical },
    { tagName: "link", rel: "alternate", hrefLang: "zh-CN", href: siteUrl(`/zh/sdks/${data.api.slug}`) },
    { tagName: "link", rel: "alternate", hrefLang: "en", href: siteUrl(`/en/sdks/${data.api.slug}`) },
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: siteUrl(`/en/sdks/${data.api.slug}`) }
  ];
}

export default function SdkDetail({ loaderData }: Route.ComponentProps) {
  const { locale, api } = loaderData;
  const zh = locale === "zh";
  const published = api.sdkStatus === "published";
  const install = `pnpm add ${api.packageName}`;
  const moduleName = api.operations[0]?.tag
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, character: string) => character.toUpperCase());
  const usage = `import client from "${api.packageName}";

// Generated methods are typed from the approved OAS version.
const result = await client.${moduleName}.${api.operations[0]?.operationId}({});`;
  const npmUrl = `https://www.npmjs.com/package/${api.packageName}`;
  const cliName = api.slug === "frankfurter" ? "currency" : api.slug === "dida365" ? "dida" : api.slug;

  return (
    <SiteShell locale={locale}>
      <main>
        <header
          className="detail-hero"
          style={{ "--api-accent": api.accent } as React.CSSProperties}
        >
          <p className="eyebrow">TypeScript / Node.js SDK</p>
          <h1>{api.packageName}</h1>
          <p>
            {zh
              ? published
                ? `${localize(api.title, locale)} 的运营方发布 SDK。文档与包版本共同绑定到批准的 OAS。`
                : `${localize(api.title, locale)} 的 SDK 正在由 Pontx 生成器构建，文档已绑定到批准的 OAS。`
              : published
                ? `The operator-published SDK for ${localize(api.title, locale)}. Documentation and package releases share the same approved OAS.`
                : `The SDK for ${localize(api.title, locale)} is being built with Pontx; its documentation is already bound to the approved OAS.`}
          </p>
          {published ? (
            <a
              className="npm-registry-link"
              href={npmUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${zh ? "在 npm 打开" : "Open on npm"} ${api.packageName}`}
            >
              <span>npm registry</span>
              <code>{npmUrl}</code>
              <strong>{zh ? "打开 npm 主页" : "Open npm page"} ↗</strong>
            </a>
          ) : null}
          <div className="detail-meta">
            <span>{published ? `v${api.sdkVersion}` : zh ? "即将发布" : "Coming soon"}</span>
            <span>Node.js ≥ 18</span>
            <span>ESM + CommonJS</span>
            <span>TypeScript declarations</span>
            <a href={`/${locale}/apis/${api.slug}/${api.operations[0]?.slug}`}>{zh ? "API 文档" : "API docs"}</a>
          </div>
        </header>
        <section className="section">
          <div className="section-heading">
            <h2>{zh ? "安装并调用" : "Install and call"}</h2>
            <p>
              {zh
                ? published
                  ? "SDK 由 Pontx 生成器产生，并在发布前完成类型检查与构建验证。"
                  : "该 API 的 SDK 尚未发布到 npm；你仍可使用文档和在线调试。"
                : published
                  ? "The SDK is produced by Pontx and typechecked and built before publication."
                  : "This SDK is not yet published to npm; the documentation and playground are available now."}
            </p>
          </div>
          {published ? (
            <>
              <pre className="code-block">
                <code>{install}</code>
              </pre>
              <pre className="code-block" style={{ marginTop: 18 }}>
                <code>{usage}</code>
              </pre>
              <div className="section-heading" style={{ marginTop: 32 }}>
                <h2>{zh ? "命令行调用" : "Command-line access"}</h2>
                <p>{zh ? "同一个 npm 包包含对应 API 的专用 CLI；Pontx Hub CLI 可用于跨 API 搜索。" : "The same npm package includes a dedicated API CLI; use Pontx Hub CLI for cross-API discovery."}</p>
              </div>
              <pre className="code-block"><code>{`npm install --global ${api.packageName}\n${cliName} --help\n\n# Cross-API search\nnpm install --global @pontx/hub-cli\npontx-hub search "${api.name}"`}</code></pre>
            </>
          ) : null}
        </section>
      </main>
    </SiteShell>
  );
}
