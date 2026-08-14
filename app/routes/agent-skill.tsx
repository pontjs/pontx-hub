import type { Route } from "./+types/agent-skill";
import { SiteShell } from "~/components/site-shell";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";
import { localizedAlternates } from "~/lib/seo";
import { CodeBlock } from "~/components/code-block";
import { agentSkillHeroCopy } from "~/lib/i18n";

export function loader({ params }: Route.LoaderArgs) {
  return { locale: requireLocale(params.locale) };
}

export function meta({ data }: Route.MetaArgs) {
  const locale = data?.locale ?? "zh";
  const title = locale === "zh"
    ? "Pontx Hub Agent Skill — API 智能体技能"
    : "Pontx Hub Agent Skill — API Discovery and Execution";
  const description =
    locale === "zh"
      ? "让 Agent 使用独立的 pontx-hub CLI 语义搜索产品、接口、入参与出参，并安全预演与调用 API。"
      : "Teach agents to semantically search products, endpoints, inputs, outputs, and schemas, then safely preview and call APIs with the standalone pontx-hub CLI.";
  const canonical = siteUrl(`/${locale}/skills/pontx-hub`);
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonical },
    { property: "og:site_name", content: "Pontx Hub" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    ...localizedAlternates("/skills/pontx-hub"),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Pontx Hub Agent Skill",
        description,
        url: canonical,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Cross-platform",
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

export default function AgentSkill({ loaderData }: Route.ComponentProps) {
  const { locale } = loaderData;
  const zh = locale === "zh";
  const heroCopy = agentSkillHeroCopy(locale);
  const workflow = `pontx-hub search "把欧元换算成美元的接口" --locale zh --json
pontx-hub show endpoint:frankfurter/get-latest-rates
pontx-hub show schema:frankfurter/ExchangeRateResponse
pontx-hub frankfurter preview 'Exchange Rates' getLatestRates --base USD
# GET can run after the user asks for execution.
pontx-hub frankfurter call 'Exchange Rates' getLatestRates --base USD`;
  const copyLabel = zh ? "复制" : "Copy";
  const copiedLabel = zh ? "已复制" : "Copied";
  const copyFailedLabel = zh ? "复制失败" : "Copy failed";

  return (
    <SiteShell locale={locale}>
      <main className="detail-page agent-skill-page">
        <header className="detail-hero">
          <p className="eyebrow">One skill / Every curated API</p>
          <h1>{heroCopy.heading}</h1>
          <p>
            {zh
              ? "Skill 不把所有文档塞进上下文，而是教 Agent 通过 CLI 语义检索产品、入参、出参与数据结构，再按需阅读、预演与调用。"
              : "The Skill does not stuff every API into context. It teaches the agent to semantically retrieve product, input, output, and schema metadata before inspecting, previewing, and calling on demand."}
          </p>
        </header>
        <section className="section">
          <div className="section-heading">
            <h2>{zh ? "安装一次" : "Install once"}</h2>
            <p>
              {zh
                ? "Hub Skill 始终要求先预演；写操作必须由用户明确确认。"
                : "The Hub Skill always previews first, and mutations require explicit user confirmation."}
            </p>
          </div>
          <CodeBlock code={`pnpm add -g @pontx/hub-cli\npontx-hub skill install`} language="shell" label={zh ? "安装" : "Install"} copyLabel={copyLabel} copiedLabel={copiedLabel} copyFailedLabel={copyFailedLabel} />
          <CodeBlock className="code-frame-spaced" code={`npx skills add https://github.com/pontjs/pontx-hub --skill pontx-hub`} language="shell" label={zh ? "通过 Agent Skills 安装" : "Install with Agent Skills"} copyLabel={copyLabel} copiedLabel={copiedLabel} copyFailedLabel={copyFailedLabel} />
          <CodeBlock className="code-frame-spaced" code={workflow} language="shell" label={zh ? "安全调用流程" : "Safe call workflow"} copyLabel={copyLabel} copiedLabel={copiedLabel} copyFailedLabel={copyFailedLabel} />
        </section>
      </main>
    </SiteShell>
  );
}
