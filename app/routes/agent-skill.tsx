import type { Route } from "./+types/agent-skill";
import { SiteShell } from "~/components/site-shell";
import { cacheHeaders, requireLocale, siteUrl } from "~/lib/http";
import { localizedAlternates } from "~/lib/seo";
import { CodeBlock } from "~/components/code-block";
import { agentSkillHeroCopy } from "~/lib/i18n";
import { Link } from "react-router";

export function loader({ params }: Route.LoaderArgs) {
  return { locale: requireLocale(params.locale) };
}

export function meta({ data }: Route.MetaArgs) {
  const locale = data?.locale ?? "zh";
  const title = locale === "zh"
    ? "Pontx Hub 通用 Skill — 跨 API 发现与安全集成"
    : "Pontx Hub Universal Skill — API Discovery and Safe Integration";
  const description =
    locale === "zh"
      ? "Pontx Hub 通用 Skill 负责跨 API 搜索、契约检查、请求预演、安全调用，并按需引导 Agent 安装产品专属 Skill。"
      : "The Pontx Hub universal Skill handles catalog-wide API search, contract inspection, request preview, safe calls, and product Skill discovery.";
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
          <p className="eyebrow">Universal skill / Every curated API</p>
          <h1>{heroCopy.heading}</h1>
          <p>
            {zh
              ? "统一 Skill 负责跨 API 搜索、契约检查、请求预演和安全调用，并帮助 Agent 找到需要的产品 Skill。产品 Skill 再补充特定 API 的集成流程、最佳实践和注意事项；两者都通过统一 CLI 使用同一份实时目录。"
              : "The universal Skill handles catalog-wide search, contract inspection, request preview, safe calls, and product Skill discovery. Product Skills add provider-specific integration flows, best practices, and caveats; both use the universal CLI and the same live catalog."}
          </p>
          <div className="hero-actions">
            <Link className="button button-dark" to={`/${locale}/skills`}>
              {zh ? "浏览全部技能" : "Browse all Skills"}
            </Link>
          </div>
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
        <section className="section">
          <div className="section-heading">
            <h2>{zh ? "按需安装产品 Skill" : "Add a product Skill when needed"}</h2>
            <p>
              {zh
                ? "先用统一 Skill 找到合适的 API；需要供应商特有的集成步骤时，再安装对应产品 Skill。Endpoint、参数和 Schema 始终从当前目录读取，不会复制到 Skill 中。"
                : "Start with the universal Skill to choose an API, then add its product Skill when provider-specific integration guidance is useful. Endpoints, parameters, and Schemas stay in the live catalog instead of being copied into a Skill."}
            </p>
          </div>
          <CodeBlock
            code={`pontx-hub skill list\npontx-hub skill install <api-slug>\npontx-hub sdk <api-slug>`}
            language="shell"
            label={zh ? "发现并安装" : "Discover and install"}
            copyLabel={copyLabel}
            copiedLabel={copiedLabel}
            copyFailedLabel={copyFailedLabel}
          />
        </section>
      </main>
    </SiteShell>
  );
}
