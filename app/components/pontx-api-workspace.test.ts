import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { getCatalogApi, getPontxSpec } from "~/lib/catalog/catalog.server";
import { pontxApiView } from "~/lib/catalog/pontx-view";
import { localize } from "~/lib/catalog/types";
import {
  ApiOverviewActions,
  ApiOverviewFacts,
  codeGenScenariosForLocale,
  isOAuthAuthorizationDisabled,
  isOAuthExecutionBlocked,
  OperationTaskSelect,
  OAuthToolbar,
  withoutHostManagedOAuthScheme
} from "./pontx-api-workspace";

describe("Unified SDK code scenario naming", () => {
  it.each([
    ["zh" as const, "统一 SDK"],
    ["en" as const, "Unified SDK"]
  ])("localizes the product-level SDK label in %s", (locale, label) => {
    expect(codeGenScenariosForLocale(locale)).toContainEqual({
      id: "typescript-sdk",
      label,
      language: "typescript"
    });
  });
});

function endpointView(apiSlug: string, operationIndex = 0) {
  const api = getCatalogApi(apiSlug)!;
  return pontxApiView(getPontxSpec(apiSlug, "en")!, api.operations[operationIndex]);
}

function renderOverviewFacts(apiSlug: string, locale: "zh" | "en") {
  const api = getCatalogApi(apiSlug);
  if (!api) throw new Error(`Expected catalog API: ${apiSlug}`);
  const operationSlug = api.quickStart?.operationSlug ?? api.operations[0].slug;

  return {
    api,
    operationSlug,
    html: renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(ApiOverviewFacts, { locale, api, operationSlug })
    ))
  };
}

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

  it("links a published product Skill from the API overview", () => {
    const html = renderToStaticMarkup(createElement(ApiOverviewActions, {
      locale: "zh",
      apiSlug: "dida365",
      operationSlug: "get-user-projects",
      quickCallAction: "立即试用",
      skillName: "pontx-dida365"
    }));

    expect(html).toContain(
      '<a class="button" href="/zh/skills/pontx-dida365">安装产品 Skill</a>'
    );
  });
});

describe("ApiOverviewFacts", () => {
  it("links every actionable Chinese fact to its matching resource", () => {
    const { api, operationSlug, html } = renderOverviewFacts("dida365", "zh");
    const firstSchema = api.schemas[0];

    expect(html).toContain(`href="/zh/apis/dida365/${operationSlug}"`);
    expect(html).toContain(`aria-label="打开 ${localize(api.title, "zh")} 接口目录"`);
    expect(html).toContain(`href="/zh/apis/dida365/schemas/${encodeURIComponent(firstSchema.name)}"`);
    expect(html).toContain(`aria-label="打开 ${localize(api.title, "zh")} 数据结构目录"`);
    expect(html).toContain('href="#quick-call"');
    expect(html).toContain(`aria-label="跳到 ${localize(api.title, "zh")} 在线调用"`);
    expect(html).toContain('href="/zh/sdks/dida365"');
    expect(html).toContain(`aria-label="打开 ${localize(api.title, "zh")} SDK 页面"`);
    expect(html).toContain(api.sdkStatus === "published" ? `v${api.sdkVersion}` : "计划中");
  });

  it("keeps English endpoint, schema, live-call, and published SDK facts navigable", () => {
    const { api, operationSlug, html } = renderOverviewFacts("frankfurter-v2", "en");

    expect(html).toContain(`href="/en/apis/frankfurter-v2/${operationSlug}"`);
    expect(html).toContain(`aria-label="Open the ${localize(api.title, "en")} endpoint directory"`);
    expect(html).toContain(`href="/en/apis/frankfurter-v2/schemas/${encodeURIComponent(api.schemas[0].name)}"`);
    expect(html).toContain(`aria-label="Open the ${localize(api.title, "en")} schema directory"`);
    expect(html).toContain(`aria-label="Jump to ${localize(api.title, "en")} live calls"`);
    expect(html).toContain('href="/en/sdks/frankfurter-v2"');
    expect(html).toContain(`aria-label="Open the ${localize(api.title, "en")} SDK page"`);
    expect(html).toContain(`v${api.sdkVersion}`);
    expect(html.match(/class="api-overview-fact-link"/g)).toHaveLength(4);
  });
});

describe("OperationTaskSelect", () => {
  it("renders the current task with the shared accessible Select", () => {
    const api = getCatalogApi("dida365")!;
    const operation = api.operations.find((candidate) => candidate.slug === "get-user-projects")!;
    const html = renderToStaticMarkup(createElement(OperationTaskSelect, {
      locale: "zh",
      apiSlug: api.slug,
      operations: api.operations,
      value: operation.slug,
      onValueChange: vi.fn()
    }));

    expect(html).toContain('id="api-task-select-label-dida365"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain("获取项目列表");
    expect(html).toContain('<select aria-hidden="true"');
    expect(html).not.toContain('<option');
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

  it("blocks provider execution only when the selected endpoint requires an unauthorised OAuth flow", () => {
    const input = {
      schemeId: "OAuth2",
      hasSupportedFlow: true,
      operationSecurity: [{ schemeId: "OAuth2", scopes: ["tasks:read"] }],
      executionEnabled: true
    };

    expect(isOAuthExecutionBlocked(input)).toBe(true);
    expect(isOAuthExecutionBlocked({ ...input, accessToken: "session-token" })).toBe(false);
    expect(isOAuthExecutionBlocked({ ...input, executionEnabled: false })).toBe(false);
    expect(isOAuthExecutionBlocked({
      ...input,
      operationSecurity: [{ schemeId: "ApiKey", scopes: [] }]
    })).toBe(false);
  });

  it.each([
    ["zh" as const, "试用前需完成 OAuth 授权", "授权成功前不会向供应商发送请求"],
    ["en" as const, "Authorize OAuth before trying this endpoint", "No request is sent to the provider until authorization succeeds"]
  ])("opens the Playground prerequisite and explains the execution gate in %s", (locale, title, description) => {
    const api = getCatalogApi("dida365");
    const scheme = api?.auth.find((candidate) => candidate.type === "oauth2");
    expect(scheme).toBeDefined();

    const html = renderToStaticMarkup(createElement(OAuthToolbar, {
      scheme: scheme!,
      locale,
      requiredScopes: ["tasks:read"],
      state: { status: "idle" },
      onAuthorize: vi.fn(),
      onClear: vi.fn(),
      executionRequired: true
    }));

    expect(html).toContain('class="oauth-execution-prerequisite"');
    expect(html).toContain('role="status"');
    expect(html).toContain(title);
    expect(html).toContain(description);
    expect(html).toContain('class="oauth-toolbar" open=""');
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

  it("uses the shared Select for multiple OAuth flows", () => {
    const api = getCatalogApi("dida365");
    const originalScheme = api?.auth.find((candidate) => candidate.type === "oauth2");
    expect(originalScheme).toBeDefined();

    const scheme = {
      ...originalScheme!,
      flows: {
        ...originalScheme!.flows,
        clientCredentials: {
          tokenUrl: "https://example.com/token",
          scopes: {}
        }
      }
    };
    const html = renderToStaticMarkup(createElement(OAuthToolbar, {
      scheme,
      locale: "en",
      requiredScopes: [],
      state: { status: "idle" },
      onAuthorize: vi.fn(),
      onClear: vi.fn()
    }));

    expect(html).toContain("oauth-select-trigger");
    expect(html).toContain('role="combobox"');
    expect(html).toContain('<select aria-hidden="true"');
    expect(html).not.toContain('<option');
  });

  it("removes only the OAuth scheme managed by the Hub", () => {
    const api = getCatalogApi("dida365")!;
    const adapted = endpointView("dida365");
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
      endpointView("dida365"),
      "OAuth2"
    );

    expect(stripped.securitySchemes).toBeUndefined();
  });

  it.each([
    ["zh" as const, "已授权成功", "访问令牌已保存在当前浏览器会话中"],
    ["en" as const, "Authorization successful", "The access token is saved in this browser session"]
  ])("merges the successful authorization status into the OAuth card in %s", (locale, title, description) => {
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

    expect(html).toContain('class="oauth-toolbar oauth-toolbar-authorized"');
    expect(html).toContain('oauth-toolbar-heading-status oauth-toolbar-heading-status-success');
    expect(html).toContain('role="status"');
    expect(html).toContain(title);
    expect(html).toContain(description);
    expect(html).not.toContain("oauth-result-success");
    expect(html).not.toContain("oauth-execution-prerequisite");
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
