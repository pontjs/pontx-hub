import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { SiteShell } from "./site-shell";

function renderShell(locale: "zh" | "en", path: string) {
  const router = createMemoryRouter([
    {
      id: "root",
      path: "*",
      element: createElement(
        SiteShell,
        {
          locale,
          children: createElement("main", null, "Content")
        }
      )
    }
  ], { initialEntries: [path] });

  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

describe("site language switcher", () => {
  it("uses a dedicated icon and an accessible English switch label", () => {
    const html = renderShell("zh", "/zh/apis/dida365?q=tasks");

    expect(html).toContain('href="/en/apis/dida365?q=tasks"');
    expect(html).toContain('class="language-link"');
    expect(html).toContain('aria-label="切换到英文"');
    expect(html).toContain('title="切换到英文"');
    expect(html.match(/class="language-icon"/g)).toHaveLength(2);
    expect(html).toContain('<span>English</span>');
    expect(html).toContain('href="/zh/docs"');

    const desktopNav = html.slice(
      html.indexOf('<nav aria-label="主导航">'),
      html.indexOf('</nav>', html.indexOf('<nav aria-label="主导航">'))
    );
    expect(desktopNav).toMatch(/class="[^"]*ai-assistant-trigger[^"]*"/);
    expect(desktopNav).toContain('title="AI 助手"');
    const primaryHrefs = [...desktopNav.matchAll(/<a[^>]+href="([^"]+)"/g)]
      .map((match) => match[1]);
    expect(primaryHrefs.slice(0, 4)).toEqual([
      "/zh",
      "/zh/skills/pontx-hub",
      "/zh/docs",
      "https://github.com/pontjs/pontx-hub"
    ]);
  });

  it("keeps the inverse language target localized", () => {
    const html = renderShell("en", "/en/skills/pontx-hub");

    expect(html).toContain('href="/zh/skills/pontx-hub"');
    expect(html).toContain('aria-label="Switch to Chinese"');
    expect(html).toContain('<span>中文</span>');
    expect(html).toContain('href="/en/docs"');
  });
});
