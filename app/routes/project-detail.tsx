import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useNavigation
} from "react-router";
import type { Route } from "./+types/project-detail";
import { AccountWorkspaceShell } from "~/components/account-workspace-shell";
import { CodeBlock } from "~/components/code-block";
import {
  projectAgentConfiguration,
  validateProjectAutomationSettings
} from "~/lib/accounts/projects";
import {
  getProjectForUser,
  listProjectsForUser,
  updateProjectAutomationForUser
} from "~/lib/accounts/projects.server";
import { requireAccountUserId } from "~/lib/accounts/session.server";
import { loadAccountsViewer } from "~/lib/accounts/viewer.server";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { requireLocale } from "~/lib/http";
import { listSkillSummaries } from "~/lib/product-skills.server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type ProjectWorkspaceTab = "overview" | "agent" | "automation";

export function projectWorkspaceTab(value: string | null): ProjectWorkspaceTab {
  return value === "agent" || value === "automation" ? value : "overview";
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const projectId = params.projectId;
  if (!projectId || !UUID_PATTERN.test(projectId)) throw new Response("Not found", { status: 404 });
  const accounts = await loadAccountsViewer(request);
  if (!accounts.enabled) throw new Response("Not found", { status: 404 });
  if (!accounts.viewer) {
    const path = `/${locale}/account/projects/${projectId}`;
    throw redirect(`/${locale}/sign-in?returnTo=${encodeURIComponent(path)}`);
  }
  const project = await getProjectForUser(accounts.viewer.id, projectId);
  if (!project) throw new Response("Not found", { status: 404 });
  const projects = await listProjectsForUser(accounts.viewer.id);
  const url = new URL(request.url);
  const skillNames = new Map(
    listSkillSummaries().flatMap((skill) => skill.apiSlug ? [[skill.apiSlug, skill.name]] : [])
  );
  const apis = project.apiSlugs.flatMap((slug) => {
    const api = getCatalogApi(slug);
    return api ? [{
      slug: api.slug,
      title: api.title,
      summary: api.summary,
      operationCount: api.operations.length,
      skillName: skillNames.get(api.slug)
    }] : [];
  });
  return {
    locale,
    viewer: accounts.viewer,
    projects: projects.map(({ id, name, isPersonal }) => ({ id, name, isPersonal })),
    tab: projectWorkspaceTab(url.searchParams.get("tab")),
    saved: url.searchParams.get("saved") === "1",
    project: {
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString()
    },
    apis
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const locale = requireLocale(params.locale);
  const projectId = params.projectId;
  if (!projectId || !UUID_PATTERN.test(projectId)) return data({ error: "not_found" }, { status: 404 });
  if (!sameOrigin(request)) return data({ error: "invalid_origin" }, { status: 403 });
  const userId = await requireAccountUserId(request);
  const formData = await request.formData();
  const result = validateProjectAutomationSettings({
    automationEnabled: formData.get("automationEnabled"),
    readOnlyMode: formData.get("readOnlyMode")
  });
  if (!result.success) return data({ error: result.code }, { status: 422 });
  const updated = await updateProjectAutomationForUser(userId, projectId, result.data);
  if (!updated) return data({ error: "not_found" }, { status: 404 });
  throw redirect(`/${locale}/account/projects/${projectId}?tab=automation&saved=1`);
}

export function meta({ data }: Route.MetaArgs) {
  const zh = data?.locale !== "en";
  const projectName = data?.project.name ?? (zh ? "项目" : "Project");
  return [
    { title: `${projectName} — ${zh ? "我的项目" : "My projects"} — Pontx Hub` },
    {
      name: "description",
      content: zh
        ? "查看项目的 Agent 接入流程并配置自动化安全策略。"
        : "Review Agent setup and configure automation safety policy for this project."
    },
    { name: "robots", content: "noindex,nofollow" }
  ];
}

export function headers() {
  return { "Cache-Control": "private, no-store" };
}

export default function ProjectDetail({ loaderData }: Route.ComponentProps) {
  const { locale, project, projects, viewer, apis, saved, tab } = loaderData;
  const zh = locale === "zh";
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const saving = navigation.state !== "idle";
  const installCommands = [
    "pnpm add -g @pontx/hub-cli",
    "pontx-hub skill install",
    ...apis.flatMap(({ slug, skillName }) => skillName ? [`pontx-hub skill install ${slug}`] : [])
  ].join("\n");
  const config = JSON.stringify(projectAgentConfiguration({
    id: project.id,
    apiSlugs: project.apiSlugs,
    automationEnabled: project.automationEnabled,
    readOnlyMode: project.readOnlyMode
  }), null, 2);

  return (
    <AccountWorkspaceShell
      locale={locale}
      projects={projects}
      activeProjectId={project.id}
      current={tab}
      viewer={viewer}
    >
      <main className="project-workspace">
        <header className="project-workspace-hero">
          <Link to={`/${locale}/account/projects`}>← {zh ? "返回我的项目" : "Back to my projects"}</Link>
          <div>
            <p className="account-eyebrow">PONTX / PROJECT / {project.id.slice(0, 8)}</p>
            <h1>{project.name}</h1>
            <p>{project.description || (zh ? "这个项目还没有说明。" : "This project has no notes yet.")}</p>
          </div>
          <dl>
            <div><dt>{zh ? "API 范围" : "API scope"}</dt><dd>{apis.length}</dd></div>
            <div><dt>{zh ? "Agent 接入" : "Agent setup"}</dt><dd>{zh ? "可开始" : "Ready"}</dd></div>
            <div><dt>{zh ? "自动化" : "Automation"}</dt><dd>{project.automationEnabled ? (zh ? "已就绪" : "Ready") : (zh ? "已暂停" : "Paused")}</dd></div>
          </dl>
        </header>

        {tab === "overview" ? <section className="project-workspace-section" id="overview" aria-labelledby="overview-heading">
          <header>
            <p>01 / SCOPE</p>
            <h2 id="overview-heading">{zh ? "项目里的 API" : "APIs in this project"}</h2>
            <span>{zh ? "Agent 和自动化只在这个范围内工作。" : "Agent and automation stay inside this scope."}</span>
          </header>
          <div className="project-scope-grid">
            {apis.map((api) => (
              <article key={api.slug}>
                <div><span>{api.slug}</span><strong>{api.operationCount} {zh ? "个接口" : "Endpoints"}</strong></div>
                <h3>{localize(api.title, locale)}</h3>
                <p>{localize(api.summary, locale)}</p>
                <div className="project-scope-actions">
                  <Link to={`/${locale}/apis/${api.slug}`}>{zh ? "查看 API" : "View API"} ↗</Link>
                  {api.skillName ? <Link to={`/${locale}/skills/${api.skillName}`}>{zh ? "产品 Skill" : "Product Skill"} ↗</Link> : null}
                </div>
              </article>
            ))}
          </div>
        </section> : null}

        {tab === "agent" ? <section className="project-workspace-section project-agent-section" id="agent-setup" aria-labelledby="agent-heading">
          <header>
            <p>02 / AGENT SETUP</p>
            <h2 id="agent-heading">{zh ? "把 Agent 接到这个项目" : "Connect an Agent to this project"}</h2>
            <span>{zh ? "统一 Skill 负责发现与安全调用，产品 Skill 补充各 API 的接入细节。" : "The universal Skill handles discovery and safe calls; product Skills add API-specific guidance."}</span>
          </header>
          <div className="project-agent-grid">
            <ol>
              <li><span>1</span><div><strong>{zh ? "安装统一入口" : "Install the shared entry point"}</strong><p>{zh ? "安装 Hub CLI、通用 Skill 和项目需要的产品 Skill。" : "Install the Hub CLI, universal Skill, and the product Skills this project needs."}</p></div></li>
              <li><span>2</span><div><strong>{zh ? "保存项目配置" : "Save project configuration"}</strong><p>{zh ? "把右侧 JSON 保存为 pontx.project.json；里面没有凭据。" : "Save the JSON at right as pontx.project.json. It contains no credentials."}</p></div></li>
              <li><span>3</span><div><strong>{zh ? "凭据留在本地" : "Keep credentials local"}</strong><p>{zh ? "API Key 与 OAuth Token 只从本地环境或当前浏览器会话读取。" : "API keys and OAuth tokens come only from the local environment or current browser session."}</p></div></li>
            </ol>
            <div>
              <CodeBlock code={installCommands} language="shell" label={zh ? "安装命令" : "Install commands"} copyLabel={zh ? "复制" : "Copy"} copiedLabel={zh ? "已复制" : "Copied"} copyFailedLabel={zh ? "复制失败" : "Copy failed"} />
              <CodeBlock className="code-frame-spaced" code={config} language="json" label="pontx.project.json" copyLabel={zh ? "复制" : "Copy"} copiedLabel={zh ? "已复制" : "Copied"} copyFailedLabel={zh ? "复制失败" : "Copy failed"} />
            </div>
          </div>
        </section> : null}

        {tab === "automation" ? <section className="project-workspace-section project-automation-section" id="automation" aria-labelledby="automation-heading">
          <header>
            <p>03 / AUTOMATION</p>
            <h2 id="automation-heading">{zh ? "自动化设置" : "Automation settings"}</h2>
            <span>{zh ? "策略会进入项目配置；Pontx 云端不会代管第三方凭据，也不会绕过写操作确认。" : "Policy is included in project config. Pontx never stores provider credentials or bypasses mutation confirmation."}</span>
          </header>
          <Form method="post" className="project-automation-form">
            <div className="automation-master-row">
              <div>
                <strong>{zh ? "为此项目启用自动化策略" : "Enable automation policy for this project"}</strong>
                <p>{zh ? "启用后，Agent 可按下方策略处理只读接口；它不会在 Pontx 服务器上自动运行。" : "When enabled, an Agent may handle read-only Endpoints under the policy below. Nothing runs automatically on Pontx servers."}</p>
              </div>
              <label className="project-switch">
                <input type="checkbox" name="automationEnabled" defaultChecked={project.automationEnabled} />
                <span aria-hidden="true" />
                <b>{zh ? "启用" : "Enable"}</b>
              </label>
            </div>
            <fieldset>
              <legend>{zh ? "只读接口策略" : "Read-only Endpoint policy"}</legend>
              <label className="automation-option">
                <input type="radio" name="readOnlyMode" value="preview" defaultChecked={project.readOnlyMode === "preview"} />
                <span><strong>{zh ? "每次停在预演" : "Stop after every preview"}</strong><small>{zh ? "Agent 生成完整请求，等待你明确执行。" : "The Agent prepares the full request and waits for explicit execution."}</small></span>
              </label>
              <label className="automation-option">
                <input type="radio" name="readOnlyMode" value="execute_after_preview" defaultChecked={project.readOnlyMode === "execute_after_preview"} />
                <span><strong>{zh ? "预演通过后执行只读请求" : "Run read-only calls after preview"}</strong><small>{zh ? "仅限目录明确标记为只读且可调用的接口。" : "Only for callable Endpoints explicitly marked read-only in the catalog."}</small></span>
              </label>
            </fieldset>
            <div className="automation-locked-row">
              <span aria-hidden="true">⌁</span>
              <div><strong>{zh ? "写操作：始终需要确认" : "Mutations: confirmation always required"}</strong><p>{zh ? "创建、修改、删除等请求不能由项目设置解锁。" : "Project settings cannot unlock create, update, or delete requests."}</p></div>
              <b>{zh ? "固定" : "Locked"}</b>
            </div>
            {saved ? <p className="project-form-success" role="status">{zh ? "自动化策略已保存。" : "Automation policy saved."}</p> : null}
            {actionData?.error ? <p className="project-form-error" role="alert">{zh ? "设置无法保存，请刷新后重试。" : "Settings could not be saved. Refresh and try again."}</p> : null}
            <button className="button button-dark" type="submit" disabled={saving}>
              {saving ? (zh ? "正在保存…" : "Saving…") : (zh ? "保存自动化设置" : "Save automation settings")}
            </button>
          </Form>
        </section> : null}
      </main>
    </AccountWorkspaceShell>
  );
}
