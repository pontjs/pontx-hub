import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useNavigation
} from "react-router";
import type { Route } from "./+types/projects";
import { AccountSectionNavigation } from "~/components/account-section-navigation";
import { SiteShell } from "~/components/site-shell";
import { loadAccountsViewer } from "~/lib/accounts/viewer.server";
import {
  createProjectForUser,
  listProjectsForUser
} from "~/lib/accounts/projects.server";
import {
  PROJECT_API_LIMIT,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  validateProjectDraft
} from "~/lib/accounts/projects";
import { requireAccountUserId } from "~/lib/accounts/session.server";
import { listCatalogSummaries } from "~/lib/catalog/catalog.server";
import { localize } from "~/lib/catalog/types";
import { requireLocale } from "~/lib/http";

function sameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const accounts = await loadAccountsViewer(request);
  if (!accounts.enabled) throw new Response("Not found", { status: 404 });
  if (!accounts.viewer) {
    const path = `/${locale}/account/projects`;
    throw redirect(`/${locale}/sign-in?returnTo=${encodeURIComponent(path)}`);
  }
  const catalog = listCatalogSummaries();
  const projects = await listProjectsForUser(accounts.viewer.id);
  return {
    locale,
    catalog,
    projects: projects.map((project) => ({
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString()
    }))
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const locale = requireLocale(params.locale);
  if (!sameOrigin(request)) return data({ error: "invalid_origin" }, { status: 403 });
  const userId = await requireAccountUserId(request);
  const formData = await request.formData();
  const catalog = listCatalogSummaries();
  const result = validateProjectDraft({
    name: formData.get("name"),
    description: formData.get("description"),
    apiSlugs: formData.getAll("apiSlug")
  }, new Set(catalog.map(({ slug }) => slug)));
  if (!result.success) return data({ error: result.code }, { status: 422 });
  const projectId = await createProjectForUser(userId, result.data);
  throw redirect(`/${locale}/account/projects/${projectId}`);
}

export function meta({ data }: Route.MetaArgs) {
  const zh = data?.locale !== "en";
  return [
    { title: zh ? "我的项目 — Pontx Hub" : "My projects — Pontx Hub" },
    {
      name: "description",
      content: zh
        ? "在一个项目工作区里管理 API、Agent 接入与自动化策略。"
        : "Manage APIs, Agent setup, and automation policies in one project workspace."
    },
    { name: "robots", content: "noindex,nofollow" }
  ];
}

export function headers() {
  return { "Cache-Control": "private, no-store" };
}

const errorCopy: Record<string, readonly [string, string]> = {
  invalid_project_name: ["请输入 1–80 个字符的项目名称。", "Enter a project name between 1 and 80 characters."],
  invalid_project_description: ["项目说明不能超过 280 个字符。", "Project notes cannot exceed 280 characters."],
  invalid_project_apis: [`请为项目选择 1–${PROJECT_API_LIMIT} 个 API。`, `Choose between 1 and ${PROJECT_API_LIMIT} APIs.`],
  unknown_project_api: ["所选 API 已不在当前目录中，请重新选择。", "A selected API is no longer in the catalog. Choose again."],
  invalid_origin: ["页面来源校验失败，请刷新后重试。", "The page origin could not be verified. Refresh and try again."]
};

export default function Projects({ loaderData }: Route.ComponentProps) {
  const { locale, catalog, projects } = loaderData;
  const zh = locale === "zh";
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const creating = navigation.state !== "idle" && navigation.formData?.get("intent") === "create";
  const apiBySlug = new Map(catalog.map((api) => [api.slug, api]));
  const error = actionData?.error && errorCopy[actionData.error]
    ? errorCopy[actionData.error][zh ? 0 : 1]
    : undefined;

  return (
    <SiteShell locale={locale}>
      <main className="projects-page">
        <header className="projects-hero">
          <div>
            <p className="account-eyebrow">PONTX / PROJECTS</p>
            <h1>{zh ? "我的项目" : "My projects"}</h1>
            <p>
              {zh
                ? "先选项目，再在同一个工作区完成 Agent 接入和自动化设置。项目只保存 API 范围与安全策略，不保存任何第三方凭据。"
                : "Choose a project, then finish Agent setup and automation policy in one workspace. Projects store API scope and safety policy, never third-party credentials."}
            </p>
          </div>
          <aside>
            <strong>{zh ? "统一工作区" : "One workspace"}</strong>
            <span>{zh ? "项目 → Agent 接入 → 自动化" : "Project → Agent setup → Automation"}</span>
          </aside>
        </header>
        <AccountSectionNavigation locale={locale} current="projects" />

        <div className="projects-layout">
          <section className="project-list-section" aria-labelledby="project-list-heading">
            <header className="project-section-heading">
              <div>
                <p>01 / {zh ? "选择项目" : "Choose a project"}</p>
                <h2 id="project-list-heading">{zh ? "项目列表" : "Project list"}</h2>
              </div>
              <span>{projects.length}</span>
            </header>
            {projects.length ? (
              <div className="project-card-list">
                {projects.map((project) => (
                  <Link
                    className="project-card"
                    key={project.id}
                    to={`/${locale}/account/projects/${project.id}`}
                  >
                    <div className="project-card-index" aria-hidden="true">
                      {String(projects.indexOf(project) + 1).padStart(2, "0")}
                    </div>
                    <div className="project-card-main">
                      <h3>{project.name}</h3>
                      <p>{project.description || (zh ? "尚未添加项目说明。" : "No project notes yet.")}</p>
                      <div className="project-api-tags">
                        {project.apiSlugs.slice(0, 4).map((slug) => (
                          <span key={slug}>{apiBySlug.get(slug)?.title[locale] ?? slug}</span>
                        ))}
                        {project.apiSlugs.length > 4 ? <span>+{project.apiSlugs.length - 4}</span> : null}
                      </div>
                    </div>
                    <div className="project-card-status">
                      <span data-active={project.automationEnabled || undefined} />
                      {project.automationEnabled
                        ? zh ? "自动化已就绪" : "Automation ready"
                        : zh ? "自动化已暂停" : "Automation paused"}
                    </div>
                    <span className="project-card-arrow" aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="projects-empty">
                <strong>{zh ? "先建立第一个项目" : "Create your first project"}</strong>
                <p>{zh ? "选出项目会使用的 API，接入命令与安全策略会自动归到项目里。" : "Choose the APIs your project uses; setup commands and safety policy will stay with it."}</p>
                <a href="#new-project">{zh ? "开始创建 ↓" : "Start creating ↓"}</a>
              </div>
            )}
          </section>

          <section className="project-create-panel" id="new-project" aria-labelledby="new-project-heading">
            <p>02 / {zh ? "新建项目" : "New project"}</p>
            <h2 id="new-project-heading">{zh ? "圈定一次，后面都在这里" : "Define it once, keep work together"}</h2>
            <Form method="post">
              <input type="hidden" name="intent" value="create" />
              <label>
                <span>{zh ? "项目名称" : "Project name"}</span>
                <input
                  name="name"
                  maxLength={PROJECT_NAME_MAX_LENGTH}
                  required
                  placeholder={zh ? "例如：结算汇率监控" : "e.g. Settlement FX monitor"}
                />
              </label>
              <label>
                <span>{zh ? "项目说明（可选）" : "Project notes (optional)"}</span>
                <textarea
                  name="description"
                  maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
                  rows={3}
                  placeholder={zh ? "记录这个项目的目标，不要填写密钥。" : "Describe the goal. Do not enter credentials."}
                />
              </label>
              <fieldset className="project-api-picker">
                <legend>{zh ? `选择 API（最多 ${PROJECT_API_LIMIT} 个）` : `Choose APIs (up to ${PROJECT_API_LIMIT})`}</legend>
                <div>
                  {catalog.map((api) => (
                    <label key={api.slug}>
                      <input type="checkbox" name="apiSlug" value={api.slug} />
                      <span>
                        <strong>{localize(api.title, locale)}</strong>
                        <small>{api.slug}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {error ? <p className="project-form-error" role="alert">{error}</p> : null}
              <button className="button button-dark" type="submit" disabled={creating}>
                {creating
                  ? zh ? "正在创建…" : "Creating…"
                  : zh ? "创建并进入项目" : "Create and open project"}
              </button>
            </Form>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
