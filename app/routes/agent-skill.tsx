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
    ? "Pontx Hub Agent Skill — Agent API 工作流"
    : "Pontx Hub Agent Skill — Agent API Workflow";
  const description =
    locale === "zh"
      ? "Pontx Hub Skill 为 Agent 定义 API 发现、契约检查、请求预演、授权调用与类型化集成的统一工作流。"
      : "Pontx Hub Skill defines one agent workflow for API discovery, contract inspection, request preview, authorized calls, and type-safe integration.";
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
              ? "Skill 是 Agent 的 API 操作规范：它规定何时搜索并检查契约、如何预演真实请求、何时必须取得用户授权，以及如何把验证结果转成生产集成。统一 CLI 是执行这套规范的工具。"
              : "The Skill is an API operating protocol for agents: it defines when to search and inspect contracts, how to preview the resolved request, when user authorization is mandatory, and how to turn verified results into production integration. The universal CLI executes that protocol."}
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
