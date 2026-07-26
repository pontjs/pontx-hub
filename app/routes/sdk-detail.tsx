import type { Route } from "./+types/sdk-detail";
import { SiteShell } from "~/components/site-shell";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { credentialEnvVar, localize } from "~/lib/catalog/types";
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
  return [
    { title },
    {
      name: "description",
      content: `Install and use the operator-maintained SDK for ${data.api.name}.`
    },
    {
      tagName: "link",
      rel: "canonical",
      href: siteUrl(`/${data.locale}/sdks/${data.api.slug}`)
    }
  ];
}

export default function SdkDetail({ loaderData }: Route.ComponentProps) {
  const { locale, api } = loaderData;
  const zh = locale === "zh";
  const install = `pnpm add ${api.packageName}`;
  const usage = `import { createClient } from "${api.packageName}";

const client = createClient({
  token: process.env.${credentialEnvVar(api.auth[0])}
});

// Generated methods are typed from the approved OAS version.
const result = await client.${api.operations[0]?.operationId
    .replaceAll("/", ".")
    .replaceAll("-", "_")}({});`;

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
              ? `${localize(api.title, locale)} 的运营方预发布 SDK。文档与包版本共同绑定到批准的 OAS。`
              : `The operator-published SDK for ${localize(api.title, locale)}. Documentation and package releases share the same approved OAS.`}
          </p>
          <div className="detail-meta">
            <span>v{api.sdkVersion}</span>
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
                ? "SDK 由 Pontx 生成器产生，并在发布前完成类型检查与构建验证。"
                : "The SDK is produced by Pontx and typechecked and built before publication."}
            </p>
          </div>
          <pre className="code-block">
            <code>{install}</code>
          </pre>
          <pre className="code-block" style={{ marginTop: 18 }}>
            <code>{usage}</code>
          </pre>
        </section>
      </main>
    </SiteShell>
  );
}
