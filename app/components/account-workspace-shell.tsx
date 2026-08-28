import {
  Bot,
  Bookmark,
  Check,
  ChevronDown,
  FolderKanban,
  Grid2X2,
  History,
  Languages,
  LogOut,
  Plus,
  Settings,
  Workflow
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { SiteShell } from "~/components/site-shell";
import { alternateLocaleHref, alternateLocaleUrl } from "~/lib/i18n";
import type { Locale } from "~/lib/catalog/types";

export type AccountWorkspaceProject = {
  id: string;
  name: string;
  isPersonal: boolean;
};

export type AccountWorkspaceSection =
  | "overview"
  | "agent"
  | "automation"
  | "projects"
  | "saved"
  | "history";

type AccountWorkspaceViewer = {
  name: string;
  image?: string | null;
};

const copy = {
  zh: {
    workspace: "个人工作台",
    currentProject: "当前项目",
    projectFeatures: "项目功能",
    accountContent: "账户内容",
    overview: "项目概览",
    agent: "Agent 接入",
    automation: "自动化设置",
    projects: "所有项目",
    saved: "收藏的接口",
    history: "调试历史",
    switchProject: "切换项目",
    createProject: "创建新项目",
    manageProjects: "项目与设置",
    account: "当前账号",
    language: "Switch to English",
    signOut: "退出登录",
    signingOut: "正在退出…",
    openMenu: "打开项目与账号菜单",
    personal: "个人空间"
  },
  en: {
    workspace: "Personal workspace",
    currentProject: "Current project",
    projectFeatures: "Project features",
    accountContent: "Account content",
    overview: "Project overview",
    agent: "Agent setup",
    automation: "Automation settings",
    projects: "All projects",
    saved: "Saved Endpoints",
    history: "Playground history",
    switchProject: "Switch project",
    createProject: "Create project",
    manageProjects: "Projects & settings",
    account: "Signed in as",
    language: "切换到中文",
    signOut: "Sign out",
    signingOut: "Signing out…",
    openMenu: "Open project and account menu",
    personal: "Personal"
  }
} satisfies Record<Locale, Record<string, string>>;

function ProjectMark({ name }: { name: string }) {
  return <span className="workspace-project-mark" aria-hidden="true">{name.trim().slice(0, 1).toLocaleUpperCase() || "P"}</span>;
}

export function AccountWorkspaceShell({
  locale,
  projects,
  activeProjectId,
  current,
  viewer,
  children
}: {
  locale: Locale;
  projects: AccountWorkspaceProject[];
  activeProjectId?: string;
  current: AccountWorkspaceSection;
  viewer: AccountWorkspaceViewer;
  children: React.ReactNode;
}) {
  const text = copy[locale];
  const location = useLocation();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const activeProject = projects.find(({ id }) => id === activeProjectId) ?? projects[0];
  const nextLocale = locale === "zh" ? "en" : "zh";
  const languageTarget = alternateLocaleHref(
    location.pathname,
    location.search,
    location.hash,
    nextLocale,
    hydrated
  );

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!detailsRef.current?.contains(event.target as Node)) detailsRef.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const closeMenu = () => detailsRef.current?.removeAttribute("open");
  const signOut = async () => {
    setSigningOut(true);
    const { authClient } = await import("~/lib/accounts/auth-client");
    const result = await authClient.signOut();
    if (result.error) {
      setSigningOut(false);
      return;
    }
    window.location.assign(`/${locale}`);
  };
  const projectPath = activeProject
    ? `/${locale}/account/projects/${activeProject.id}`
    : `/${locale}/account/projects`;

  return (
    <SiteShell locale={locale}>
      <div className="account-workbench">
        <aside className="account-workbench-sidebar" aria-label={text.workspace}>
          <div className="account-workbench-heading">
            <span>PONTX</span>
            <strong>{text.workspace}</strong>
          </div>

          <details
            className="workspace-switcher"
            ref={detailsRef}
            onKeyDown={(event) => {
              if (event.key !== "Escape" || !detailsRef.current?.open) return;
              event.preventDefault();
              closeMenu();
              summaryRef.current?.focus();
            }}
          >
            <summary ref={summaryRef} aria-label={text.openMenu}>
              <ProjectMark name={activeProject?.name ?? text.workspace} />
              <span>
                <small>{text.currentProject}</small>
                <strong>{activeProject?.name ?? text.workspace}</strong>
              </span>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <div className="workspace-switcher-menu">
              <header>
                <span className="workspace-account-avatar" aria-hidden="true">
                  {viewer.image ? <img src={viewer.image} alt="" referrerPolicy="no-referrer" /> : viewer.name.slice(0, 1).toLocaleUpperCase()}
                </span>
                <span><small>{text.account}</small><strong>{viewer.name}</strong></span>
              </header>

              <section aria-label={text.switchProject}>
                <p>{text.switchProject}</p>
                <div className="workspace-project-options">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      to={`/${locale}/account/projects/${project.id}?tab=overview`}
                      aria-current={project.id === activeProject?.id ? "true" : undefined}
                      onClick={closeMenu}
                    >
                      <ProjectMark name={project.name} />
                      <span><strong>{project.name}</strong>{project.isPersonal ? <small>{text.personal}</small> : null}</span>
                      {project.id === activeProject?.id ? <Check size={14} aria-hidden="true" /> : null}
                    </Link>
                  ))}
                </div>
                <Link className="workspace-menu-action" to={`/${locale}/account/projects#new-project`} onClick={closeMenu}>
                  <Plus size={15} aria-hidden="true" />{text.createProject}
                </Link>
              </section>

              <nav aria-label={locale === "zh" ? "工作台设置" : "Workspace settings"}>
                <Link to={`/${locale}/account/projects`} onClick={closeMenu}>
                  <Settings size={16} aria-hidden="true" />{text.manageProjects}
                </Link>
                <a
                  href={languageTarget}
                  hrefLang={nextLocale === "zh" ? "zh-CN" : "en"}
                  onClick={(event) => {
                    event.preventDefault();
                    window.location.assign(alternateLocaleUrl(
                      window.location.pathname,
                      window.location.search,
                      window.location.hash,
                      nextLocale
                    ));
                  }}
                >
                  <Languages size={16} aria-hidden="true" />{text.language}
                </a>
                <button type="button" disabled={signingOut} onClick={() => void signOut()}>
                  <LogOut size={16} aria-hidden="true" />{signingOut ? text.signingOut : text.signOut}
                </button>
              </nav>
            </div>
          </details>

          <nav className="account-workbench-navigation" aria-label={text.workspace}>
            {activeProject ? (
              <section>
                <p>{text.projectFeatures}</p>
                <Link to={`${projectPath}?tab=overview`} aria-current={current === "overview" ? "page" : undefined}>
                  <Grid2X2 size={16} aria-hidden="true" />{text.overview}
                </Link>
                <Link to={`${projectPath}?tab=agent`} aria-current={current === "agent" ? "page" : undefined}>
                  <Bot size={16} aria-hidden="true" />{text.agent}
                </Link>
                <Link to={`${projectPath}?tab=automation`} aria-current={current === "automation" ? "page" : undefined}>
                  <Workflow size={16} aria-hidden="true" />{text.automation}
                </Link>
              </section>
            ) : null}
            <section>
              <p>{text.accountContent}</p>
              <Link to={`/${locale}/account/projects`} aria-current={current === "projects" ? "page" : undefined}>
                <FolderKanban size={16} aria-hidden="true" />{text.projects}
              </Link>
              <Link to={`/${locale}/account/saved`} aria-current={current === "saved" ? "page" : undefined}>
                <Bookmark size={16} aria-hidden="true" />{text.saved}
              </Link>
              <Link to={`/${locale}/account/history`} aria-current={current === "history" ? "page" : undefined}>
                <History size={16} aria-hidden="true" />{text.history}
              </Link>
            </section>
          </nav>
        </aside>
        <div className="account-workbench-content">{children}</div>
      </div>
    </SiteShell>
  );
}
