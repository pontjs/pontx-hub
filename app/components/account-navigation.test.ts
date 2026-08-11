import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { AccountNavigation } from "./account-navigation";

function renderAccountNavigation({
  locale,
  image
}: {
  locale: "zh" | "en";
  image?: string | null;
}) {
  const router = createMemoryRouter([
    {
      id: "root",
      path: "*",
      element: createElement(AccountNavigation, { locale })
    }
  ], {
    initialEntries: [`/${locale}`],
    hydrationData: {
      loaderData: {
        root: {
          accounts: {
            enabled: true,
            viewer: {
              id: "viewer-1",
              name: "Jason Huang",
              email: "jason@example.com",
              image
            }
          }
        }
      }
    }
  });

  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

describe("account navigation", () => {
  it("uses the provider avatar as the account popover trigger", () => {
    const html = renderAccountNavigation({
      locale: "zh",
      image: "https://avatars.githubusercontent.com/u/1?v=4"
    });

    expect(html).toContain('class="account-navigation"');
    expect(html).toContain('aria-label="打开账户菜单: Jason Huang"');
    expect(html).toContain('class="account-avatar-image"');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain('href="/zh/account/saved"');
    expect(html).toContain("收藏的 API");
    expect(html).toContain('href="/zh/account/history"');
    expect(html).toContain("调试历史");
    expect(html).toContain("退出");
    expect(html).not.toContain("jason@example.com");
  });

  it("falls back to an initial and keeps English account actions inside the popover", () => {
    const html = renderAccountNavigation({ locale: "en", image: null });

    expect(html).toContain('aria-label="Open account menu: Jason Huang"');
    expect(html).toContain('class="account-avatar-fallback">J</span>');
    expect(html).toContain("Saved APIs");
    expect(html).toContain("Playground history");
    expect(html).toContain("Sign out");
    expect(html).not.toContain("account-saved-link");
    expect(html).not.toContain("account-history-link");
  });
});
