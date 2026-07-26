import type { Route } from "./+types/agent-skill";
import { SiteShell } from "~/components/site-shell";
import { requireLocale, siteUrl } from "~/lib/http";

export function loader({ params }: Route.LoaderArgs) {
  return { locale: requireLocale(params.locale) };
}

export function meta({ data }: Route.MetaArgs) {
  const locale = data?.locale ?? "zh";
  return [
    {
      title:
        locale === "zh"
          ? "Pontx Hub Agent Skill"
          : "Pontx Hub Agent Skill"
    },
    {
      name: "description",
      content:
        locale === "zh"
          ? "让 Agent 使用 pontx hub CLI 搜索、预演和调用精选 API。"
          : "Teach agents to search, preview, and call curated APIs with the pontx hub CLI."
    },
    {
      tagName: "link",
      rel: "canonical",
      href: siteUrl(`/${locale}/agent-skill`)
    }
  ];
}

export default function AgentSkill({ loaderData }: Route.ComponentProps) {
  const { locale } = loaderData;
  const zh = locale === "zh";
  const workflow = `pontx hub search "repository"
pontx hub show-api github.repos.get
pontx hub call github.repos.get --owner octocat --repo Hello-World --dry-run
# Only call after the user reviews the preview.
pontx hub call github.repos.get --owner octocat --repo Hello-World`;

  return (
    <SiteShell locale={locale}>
      <main>
        <header className="detail-hero" style={{ "--api-accent": "#d7ff43" } as React.CSSProperties}>
          <p className="eyebrow">One skill / Every curated API</p>
          <h1>{zh ? "给 Agent 一张可靠的 API 地图。" : "Give your agent a reliable API map."}</h1>
          <p>
            {zh
              ? "Skill 不把所有文档塞进上下文，而是教 Agent 通过 CLI 按需搜索、阅读、预演与调用。"
              : "The Skill does not stuff every API into context. It teaches the agent to discover, inspect, preview, and call on demand."}
          </p>
        </header>
        <section className="section">
          <div className="section-heading">
            <h2>{zh ? "安装一次" : "Install once"}</h2>
            <p>
              {zh
                ? "Hub Skill 始终要求先 dry-run；写操作必须由用户明确确认。"
                : "The Hub Skill always previews first, and mutations require explicit user confirmation."}
            </p>
          </div>
          <pre className="code-block">
            <code>pontx hub skill install</code>
          </pre>
          <pre className="code-block" style={{ marginTop: 18 }}>
            <code>{workflow}</code>
          </pre>
        </section>
      </main>
    </SiteShell>
  );
}
