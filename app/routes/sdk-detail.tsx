import type { Route } from "./+types/sdk-detail";
import { SiteShell } from "~/components/site-shell";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";
import { localizedAlternates } from "~/lib/seo";
import { ResourceNavigation } from "~/components/resource-navigation";
import { CodeBlock } from "~/components/code-block";
import { hubCliCommand } from "~/lib/hub-cli-command";
import type { CatalogApi } from "~/lib/catalog/types";

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
    { property: "og:site_name", content: "Pontx Hub" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    ...localizedAlternates(`/sdks/${data.api.slug}`),
    ...(data.api.sdkStatus === "published" ? [{
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: data.api.packageName,
        description,
        url: canonical,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Node.js",
        softwareVersion: data.api.sdkVersion,
        downloadUrl: `https://www.npmjs.com/package/${data.api.packageName}`,
        isPartOf: {
          "@type": "WebSite",
          name: "Pontx Hub",
          url: siteUrl(`/${data.locale}`)
        }
      }
    }] : [])
  ];
}

export function sdkUsageExamples(api: CatalogApi) {
  if (api.sdkExamples) return api.sdkExamples;

  const moduleName = api.operations[0]?.tag
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, character: string) => character.toUpperCase());
  const cliOperation = api.operations[0];
  return {
    typescript: `import client from "${api.packageName}";

// Generated methods are typed from the approved OAS version.
const result = await client.${moduleName}.${api.operations[0]?.operationId}({});`,
    cli: cliOperation
      ? `pnpm add --global @pontx/hub-cli\n\n# ${api.name} / ${cliOperation.operationId}\n${hubCliCommand(api.slug, cliOperation)}`
      : "pnpm add --global @pontx/hub-cli"
  };
}

export function headers() {
  return cacheHeaders();
}

export default function SdkDetail({ loaderData }: Route.ComponentProps) {
  const { locale, api } = loaderData;
  const zh = locale === "zh";
  const published = api.sdkStatus === "published";
  const install = `pnpm add ${api.packageName}`;
  const examples = sdkUsageExamples(api);
  const hasDedicatedCliExample = Boolean(api.sdkExamples);
  const usage = examples.typescript;
  const npmUrl = `https://www.npmjs.com/package/${api.packageName}`;
  const cliUsage = examples.cli;
  const codeBlockCopy = zh ? "复制" : "Copy";
  const codeBlockCopied = zh ? "已复制" : "Copied";
  const codeBlockCopyFailed = zh ? "复制失败" : "Copy failed";

  return (
    <SiteShell locale={locale}>
      <ResourceNavigation locale={locale} api={api} active="sdk" />
      <main className="detail-page sdk-page">
        <header className="detail-hero">
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
            <div className="hero-actions detail-actions">
              <a
                className="button button-dark"
                href={npmUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${zh ? "在 npm 打开" : "Open on npm"} ${api.packageName}`}
              >
                {zh ? "在 npm 查看" : "Open on npm"} <span aria-hidden="true">↗</span>
              </a>
            </div>
          ) : null}
          <div className="detail-meta">
            <span>{published ? `v${api.sdkVersion}` : zh ? "即将发布" : "Coming soon"}</span>
            <span>Node.js ≥ 18</span>
            <span>ESM + CommonJS</span>
            <span>TypeScript declarations</span>
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
              <CodeBlock code={install} language="shell" label={zh ? "安装 SDK" : "Install SDK"} copyLabel={codeBlockCopy} copiedLabel={codeBlockCopied} copyFailedLabel={codeBlockCopyFailed} />
              <CodeBlock className="code-frame-spaced" code={usage} language="typescript" label={zh ? "TypeScript 调用" : "TypeScript usage"} copyLabel={codeBlockCopy} copiedLabel={codeBlockCopied} copyFailedLabel={codeBlockCopyFailed} />
              <div className="section-heading" style={{ marginTop: 32 }}>
                <h2>{zh ? "命令行调用" : "Command-line access"}</h2>
                <p>{hasDedicatedCliExample
                  ? zh
                    ? "此 npm 包同时发布面向该 API 的独立 CLI；先用 dry-run 检查参数，再按供应商要求提供自己的凭证。"
                    : "This npm package also publishes a dedicated CLI for the API. Use dry-run to inspect parameters, then supply your own provider credentials when required."
                  : zh
                    ? "Pontx Hub CLI 先选择 API 产品，再按 controller 与接口名称调用。没有 controller 分组的 API 产品可直接写接口名称。"
                    : "Pontx Hub CLI selects the API product first, then calls an endpoint by controller and name. API products without a controller group use the endpoint name directly."}</p>
              </div>
              <CodeBlock code={cliUsage} language="shell" label={hasDedicatedCliExample ? (zh ? "独立 API CLI" : "Dedicated API CLI") : "Pontx Hub CLI"} copyLabel={codeBlockCopy} copiedLabel={codeBlockCopied} copyFailedLabel={codeBlockCopyFailed} />
            </>
          ) : null}
        </section>
      </main>
    </SiteShell>
  );
}
