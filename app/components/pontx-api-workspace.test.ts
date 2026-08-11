import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import {
  isOAuthAuthorizationDisabled,
  OAuthToolbar
} from "./pontx-api-workspace";

describe("OAuthToolbar", () => {
  it("keeps authorization disabled until the callback URL is registered", () => {
    expect(isOAuthAuthorizationDisabled({
      busy: false,
      clientId: "client-id",
      requiresRedirectRegistration: true,
      redirectUriRegistered: false
    })).toBe(true);

    expect(isOAuthAuthorizationDisabled({
      busy: false,
      clientId: "client-id",
      requiresRedirectRegistration: true,
      redirectUriRegistered: true
    })).toBe(false);
  });

  it.each([
    ["zh" as const, "我已在开发者中心登记上述回调地址"],
    ["en" as const, "I registered the callback URL above"]
  ])("renders the expanded callback registration guide in %s", (locale, confirmation) => {
    const api = getCatalogApi("dida365");
    const scheme = api?.auth.find((candidate) => candidate.type === "oauth2");
    expect(scheme).toBeDefined();

    const html = renderToStaticMarkup(createElement(OAuthToolbar, {
      scheme: scheme!,
      locale,
      requiredScopes: ["tasks:read"],
      state: { status: "idle" },
      onAuthorize: vi.fn(),
      onClear: vi.fn()
    }));

    expect(html).toContain('class="oauth-credential-guide" open=""');
    expect(html).toContain(confirmation);
    expect(html).toContain('class="oauth-callback-panel"');
    expect(html).toContain("/oauth/callback");
    expect(html).toContain(locale === "zh" ? "复制地址" : "Copy URL");
    expect(html).toContain("invalid_request");
  });
});
