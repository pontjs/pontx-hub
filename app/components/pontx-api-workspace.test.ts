import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { toPontxApi } from "~/lib/catalog/pontx-adapter";
import {
  ApiOverviewActions,
  isOAuthAuthorizationDisabled,
  OAuthToolbar,
  withoutHostManagedOAuthScheme
} from "./pontx-api-workspace";

describe("ApiOverviewActions", () => {
  it.each([
    ["zh" as const, "浏览全部接口", "立即试用"],
    ["en" as const, "Browse all endpoints", "Try it now"]
  ])("promotes the full endpoint workspace before quick call in %s", (locale, workspaceLabel, quickCallLabel) => {
    const html = renderToStaticMarkup(createElement(ApiOverviewActions, {
      locale,
      apiSlug: "dida365",
      operationSlug: "get-user-projects",
      quickCallAction: quickCallLabel
    }));

    expect(html).toContain(
      `<a class="button button-dark" href="/${locale}/apis/dida365/get-user-projects">${workspaceLabel}</a>`
    );
    expect(html).toContain(
      `<a class="button" href="#quick-call">${quickCallLabel}</a>`
    );
    expect(html.indexOf(workspaceLabel)).toBeLessThan(html.indexOf(quickCallLabel));
  });
});

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

  it("removes only the OAuth scheme managed by the Hub", () => {
    const api = getCatalogApi("dida365")!;
    const adapted = toPontxApi(api, api.operations[0], "en");
    const pontxApi = withoutHostManagedOAuthScheme({
      ...adapted,
      securitySchemes: {
        ...adapted.securitySchemes,
        InternalKey: adapted.securitySchemes!.OAuth2
      }
    }, "OAuth2");

    expect(pontxApi.securitySchemes).not.toHaveProperty("OAuth2");
    expect(pontxApi.securitySchemes).toHaveProperty("InternalKey");
  });

  it("omits the Authentication card when OAuth is the only scheme", () => {
    const api = getCatalogApi("dida365")!;
    const stripped = withoutHostManagedOAuthScheme(
      toPontxApi(api, api.operations[0], "en"),
      "OAuth2"
    );

    expect(stripped.securitySchemes).toBeUndefined();
  });

  it.each([
    ["zh" as const, "授权成功", "访问令牌已保存在当前浏览器会话中"],
    ["en" as const, "Authorization successful", "The access token is saved in this browser session"]
  ])("shows a visible successful authorization notice in %s", (locale, title, description) => {
    const api = getCatalogApi("dida365");
    const scheme = api?.auth.find((candidate) => candidate.type === "oauth2");
    expect(scheme).toBeDefined();

    const html = renderToStaticMarkup(createElement(OAuthToolbar, {
      scheme: scheme!,
      locale,
      requiredScopes: ["tasks:read"],
      state: { status: "authorized", scopes: ["tasks:read"] },
      onAuthorize: vi.fn(),
      onClear: vi.fn()
    }));

    expect(html).toContain('class="oauth-result-notice oauth-result-success"');
    expect(html).toContain('role="status"');
    expect(html).toContain(title);
    expect(html).toContain(description);
  });

  it.each([
    ["zh" as const, "授权未完成"],
    ["en" as const, "Authorization failed"]
  ])("shows a visible failed authorization notice in %s", (locale, title) => {
    const api = getCatalogApi("dida365");
    const scheme = api?.auth.find((candidate) => candidate.type === "oauth2");
    expect(scheme).toBeDefined();

    const html = renderToStaticMarkup(createElement(OAuthToolbar, {
      scheme: scheme!,
      locale,
      requiredScopes: ["tasks:read"],
      state: { status: "error", error: "Provider rejected the authorization request" },
      onAuthorize: vi.fn(),
      onClear: vi.fn()
    }));

    expect(html).toContain('class="oauth-result-notice oauth-result-error"');
    expect(html).toContain('role="alert"');
    expect(html).toContain(title);
    expect(html).toContain("Provider rejected the authorization request");
  });
});
