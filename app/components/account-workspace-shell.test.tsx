import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AccountWorkspaceShell } from "./account-workspace-shell";

const projects = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Jason's workspace", isPersonal: true },
  { id: "22222222-2222-4222-8222-222222222222", name: "Payments", isPersonal: false }
];

function render(current: "agent" | "saved" = "agent") {
  return renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: [`/zh/account/projects/${projects[0].id}?tab=${current}`] },
    createElement(AccountWorkspaceShell, {
      locale: "zh",
      projects,
      activeProjectId: projects[0].id,
      current,
      viewer: { name: "Jason", image: null },
      children: createElement("main", null, "Workspace content")
    })
  ));
}

describe("account workspace shell", () => {
  it("uses one global project switcher for project, account, language, and sign-out actions", () => {
    const html = render();

    expect(html).toContain("当前项目");
    expect(html).toContain("Jason&#x27;s workspace");
    expect(html).toContain("切换项目");
    expect(html).toContain("创建新项目");
    expect(html).toContain("项目与设置");
    expect(html).toContain("Switch to English");
    expect(html).toContain("退出登录");
    expect(html).toContain(`href="/zh/account/projects/${projects[1].id}?tab=overview"`);
  });

  it("keeps Agent and automation inside the active project navigation", () => {
    const html = render("agent");
    const sidebar = html.slice(
      html.indexOf('class="account-workbench-sidebar"'),
      html.indexOf('class="account-workbench-content"')
    );

    expect(sidebar).toContain(`href="/zh/account/projects/${projects[0].id}?tab=agent" aria-current="page"`);
    expect(sidebar).toContain(`href="/zh/account/projects/${projects[0].id}?tab=automation"`);
    expect(sidebar).not.toContain('class="account-navigation"');
  });
});
