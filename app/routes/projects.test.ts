import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { getCatalogApi, listCatalogSummaries } from "~/lib/catalog/catalog.server";
import ProjectDetail, { action as projectAction } from "./project-detail";
import Projects, { action as projectsAction } from "./projects";

const projectId = "11111111-1111-4111-8111-111111111111";

function renderPage(element: ReactNode, path: string) {
  const router = createMemoryRouter([{ path: "*", element }], { initialEntries: [path] });
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

describe("project account workspace", () => {
  it("makes projects the parent of Agent setup and automation settings", () => {
    const api = getCatalogApi("dida365");
    if (!api) throw new Error("Expected Dida365 metadata");
    const html = renderPage(createElement(ProjectDetail, {
      loaderData: {
        locale: "zh",
        saved: false,
        project: {
          id: projectId,
          name: "任务同步助手",
          description: "把任务同步到团队工作流。",
          apiSlugs: [api.slug],
          automationEnabled: true,
          readOnlyMode: "execute_after_preview",
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString()
        },
        apis: [{
          slug: api.slug,
          title: api.title,
          summary: api.summary,
          operationCount: api.operations.length,
          skillName: "pontx-dida365"
        }]
      }
    } as never), `/zh/account/projects/${projectId}`);
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

    expect(html).toContain("返回我的项目");
    expect(html).toContain("项目概览");
    expect(html).toContain("Agent 接入");
    expect(html).toContain("自动化设置");
    expect(text).toContain("pontx-hub skill install dida365");
    expect(html).toContain("pontx.project.json");
    expect(html).toContain("mutations");
    expect(html).toContain("confirm");
    expect(html).toContain('name="automationEnabled"');
    expect(html).toContain('name="readOnlyMode"');
    expect(html).toContain("写操作：始终需要确认");
  });

  it("renders an English project list, creation form, and project destination", () => {
    const catalog = listCatalogSummaries();
    const html = renderPage(createElement(Projects, {
      loaderData: {
        locale: "en",
        catalog,
        projects: [{
          id: projectId,
          name: "Settlement monitor",
          description: "Monitor currency settlement inputs.",
          apiSlugs: [catalog[0].slug],
          automationEnabled: false,
          readOnlyMode: "preview",
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString()
        }]
      }
    } as never), "/en/account/projects");

    expect(html).toContain("My projects");
    expect(html).toContain("Agent setup");
    expect(html).toContain("Automation");
    expect(html).toContain(`href="/en/account/projects/${projectId}"`);
    expect(html).toContain('name="apiSlug"');
    expect(html).toContain("Create and open project");
  });

  it("rejects cross-origin project mutations before reading a session", async () => {
    const listResponse = await projectsAction({
      params: { locale: "en" },
      request: new Request("https://pontx.dev/en/account/projects", {
        method: "POST",
        headers: { Origin: "https://evil.example" }
      })
    } as never);
    const detailResponse = await projectAction({
      params: { locale: "en", projectId },
      request: new Request(`https://pontx.dev/en/account/projects/${projectId}`, {
        method: "POST",
        headers: { Origin: "https://evil.example" }
      })
    } as never);

    expect(listResponse.init?.status).toBe(403);
    expect(detailResponse.init?.status).toBe(403);
    expect(listResponse.data).toEqual({ error: "invalid_origin" });
    expect(detailResponse.data).toEqual({ error: "invalid_origin" });
  });
});
