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
  });

  it("keeps the inverse language target localized", () => {
    const html = renderShell("en", "/en/agent-skill");

    expect(html).toContain('href="/zh/agent-skill"');
    expect(html).toContain('aria-label="Switch to Chinese"');
    expect(html).toContain('<span>中文</span>');
  });
});
