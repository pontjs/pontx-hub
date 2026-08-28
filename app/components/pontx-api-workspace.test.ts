import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ApiMenuItem } from "@pontx/shadcn-ui/api-directory";
import { ApiDocumentation } from "@pontx/shadcn-ui/api-documentation";
import { getCatalogApi, getPontxSpec } from "~/lib/catalog/catalog.server";
import { pontxApiView } from "~/lib/catalog/pontx-view";
import { localize } from "~/lib/catalog/types";
import {
  ApiOverviewActions,
  ApiOverviewFacts,
  codeGenScenariosForLocale,
  CredentialSetupGuide,
  getStandaloneCredentialGuideSchemes,
  isOAuthAuthorizationDisabled,
  isOAuthExecutionBlocked,
  OperationTaskSelect,
  OAuthToolbar,
  withoutHostManagedOAuthScheme,
  WorkspaceTaskRegion
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

describe("WorkspaceTaskRegion", () => {
  it.each([
    ["zh" as const, "鉴权设置", "先完成当前浏览器会话的凭证与授权设置，再进入请求调试。"],
    ["en" as const, "Authentication", "Set up credentials and authorization for this browser session before debugging the request."]
  ])("labels the authorization boundary in %s", (locale, title, description) => {
    const html = renderToStaticMarkup(createElement(
      WorkspaceTaskRegion,
      { locale, kind: "authentication" },
      createElement("div", null, "Credential controls")
    ));

    expect(html).toContain('class="workspace-task-region workspace-task-region-authentication"');
    expect(html).toContain('aria-labelledby="workspace-authentication-heading"');
    expect(html).toContain(`<h2 id="workspace-authentication-heading">${title}</h2>`);
    expect(html).toContain(description);
    expect(html).toContain("Credential controls");
  });

  it.each([
    ["zh" as const, true, "请求调试", "检查成功示例，在 Playground 中调整请求参数，然后执行调用。"],
    ["en" as const, true, "Request debugging", "Review the successful example, adjust request details in the Playground, then execute the call."],
    ["zh" as const, false, "请求预览", "检查成功示例与生成的请求；此接口当前不支持在线调用。"],
    ["en" as const, false, "Request preview", "Review the successful example and generated request; online execution is unavailable for this endpoint."]
  ])("labels the request boundary in %s when availability is %s", (locale, requestAvailable, title, description) => {
    const html = renderToStaticMarkup(createElement(
      WorkspaceTaskRegion,
      { locale, kind: "request", requestAvailable },
      createElement("div", null, "Request controls")
    ));

    expect(html).toContain('class="workspace-task-region workspace-task-region-request"');
    expect(html).toContain('aria-labelledby="workspace-request-heading"');
    expect(html).toContain(`<h2 id="workspace-request-heading">${title}</h2>`);
    expect(html).toContain(description);
  });
});

function endpointView(apiSlug: string, operationIndex = 0) {
  const api = getCatalogApi(apiSlug)!;
  return pontxApiView(getPontxSpec(apiSlug, "en")!, api.operations[operationIndex]);
}

describe("Endpoint description rendering", () => {
  it("renders the Amazon SQS description markup through the shared Markdown viewer", () => {
    const api = getCatalogApi("amazon-sqs")!;
    const operationIndex = api.operations.findIndex(
      (operation) => operation.slug === "list-queues"
    );
    const endpoint = endpointView(api.slug, operationIndex);
    const descriptionOnlyEndpoint = { ...endpoint };
    delete descriptionOnlyEndpoint.requestBody;
    const html = renderToStaticMarkup(createElement(ApiDocumentation, {
      api: {
        ...descriptionOnlyEndpoint,
        parameters: [],
        responses: {},
        components: { schemas: {} }
      },
      locale: "en"
    }));

    expect(operationIndex).toBeGreaterThanOrEqual(0);
    expect(html).toMatch(/<code[^>]*>QueueNamePrefix<\/code>/);
    expect(html).toContain(
      'href="https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-customer-managed-policy-examples.html#grant-cross-account-permissions-to-role-and-user-name"'
    );
    expect(html).toContain("<blockquote");
    expect(html).not.toContain("&lt;p&gt;Returns a list of your queues");
  });
});

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

describe("Endpoint directory metadata", () => {
  it.each([
    ["zh" as const, "获取最新汇率"],
    ["en" as const, "Get latest exchange rates"]
  ])("renders the localized PontxSpec summary as a readable label in %s", (locale, label) => {
    const spec = getPontxSpec("frankfurter", locale)!;
    const [name, endpoint] = Object.entries(spec.apis).find(
      ([, candidate]) => candidate.operationId === "getLatestRates"
    )!;
    const html = renderToStaticMarkup(createElement(ApiMenuItem, {
      api: { ...endpoint, name }
    }));

    expect(endpoint.title).toBeUndefined();
    expect(endpoint.summary).toBe(label);
    expect(html).toContain("getLatestRates");
    expect(html).toContain(label);
  });
});

describe("ApiOverviewActions", () => {
  it.each([
    ["zh" as const, "浏览全部接口", "立即试用"],
    ["en" as const, "Browse all endpoints", "Try it now"]
  ])("promotes the full endpoint workspace before quick call in %s", (locale, workspaceLabel, quickCallLabel) => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(ApiOverviewActions, {
        locale,
        apiSlug: "dida365",
        operationSlug: "get-user-projects",
        quickCallAction: quickCallLabel
      })
    ));

    expect(html).toContain(
      `<a class="button button-dark" href="/${locale}/apis/dida365/get-user-projects"`
    );
    expect(html).toContain(`>${workspaceLabel}</a>`);
    expect(html).toContain(
      `<a class="button" href="#quick-call">${quickCallLabel}</a>`
    );
    expect(html.indexOf(workspaceLabel)).toBeLessThan(html.indexOf(quickCallLabel));
  });

  it("links a published product Skill from the API overview", () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(ApiOverviewActions, {
        locale: "zh",
        apiSlug: "dida365",
        operationSlug: "get-user-projects",
        quickCallAction: "立即试用",
        skillName: "pontx-dida365"
      })
    ));

    expect(html).toContain(
      '<a class="button" href="/zh/skills/pontx-dida365"'
    );
    expect(html).toContain('>安装产品 Skill</a>');
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

describe("CredentialSetupGuide", () => {
  const scheme = {
    id: "apiKey",
    type: "apiKey" as const,
    name: "apikey",
    in: "query" as const,
    envVar: "PONTX_TWELVE_DATA_API_KEY",
    description: {
      zh: "Twelve Data API Key。",
      en: "Twelve Data API key."
    },
    credentialGuide: {
      url: "https://twelvedata.com/account/api-keys",
      title: {
        zh: "获取 Twelve Data API Key",
        en: "Get a Twelve Data API key"
      },
      steps: [
        { zh: "注册或登录账户。", en: "Create an account or sign in." },
        { zh: "打开 API Keys 页面。", en: "Open the API Keys page." },
        { zh: "复制并粘贴 Key。", en: "Copy and paste the key." }
      ]
    }
  };

  it.each([
    ["zh" as const, "获取 Twelve Data API Key", "打开官方获取/配置指引", "Pontx 不会保存你的凭据"],
    ["en" as const, "Get a Twelve Data API key", "Open official setup guidance", "Pontx never stores your credential"]
  ])("renders a localized, official, session-safe API key path in %s", (locale, title, action, safety) => {
    const html = renderToStaticMarkup(createElement(CredentialSetupGuide, {
      apiSlug: "twelve-data-forex",
      scheme,
      locale
    }));

    expect(html).toContain("credential-setup-guide");
    expect(html).toContain('data-state="open"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("lucide-chevron-down");
    expect(html).toContain(title);
    expect(html).toContain(action);
    expect(html).toContain(safety);
    expect(html).toContain('href="https://twelvedata.com/account/api-keys"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).toContain(">01<");
    expect(html).toContain(">03<");
  });

  it("keeps guides visible when an API overview quick start is public or execution is disabled", () => {
    const publicQuickStart = getStandaloneCredentialGuideSchemes({
      auth: [scheme],
      operationSecurity: [],
      guided: true,
      playgroundAvailable: false
    });
    const disabledAuthenticatedEndpoint = getStandaloneCredentialGuideSchemes({
      auth: [scheme],
      operationSecurity: [{ schemeId: scheme.id, scopes: [] }],
      guided: false,
      playgroundAvailable: false
    });
    const authenticatedEndpointBeforePlayground = getStandaloneCredentialGuideSchemes({
      auth: [scheme],
      operationSecurity: [{ schemeId: scheme.id, scopes: [] }],
      guided: false,
      playgroundAvailable: true
    });

    expect(publicQuickStart.map((candidate) => candidate.id)).toEqual([scheme.id]);
    expect(disabledAuthenticatedEndpoint.map((candidate) => candidate.id)).toEqual([scheme.id]);
    expect(authenticatedEndpointBeforePlayground.map((candidate) => candidate.id)).toEqual([scheme.id]);
  });

  it("does not duplicate a guide already rendered in the Playground or OAuth toolbar", () => {
    expect(getStandaloneCredentialGuideSchemes({
      auth: [scheme],
      operationSecurity: [{ schemeId: scheme.id, scopes: [] }],
      guided: true,
      playgroundAvailable: true
    })).toEqual([]);

    const oauthScheme = {
      ...scheme,
      id: "OAuth2",
      type: "oauth2" as const,
      flows: { authorizationCode: { authorizationUrl: "https://example.com/oauth", tokenUrl: "https://example.com/token", scopes: {} } }
    };
    expect(getStandaloneCredentialGuideSchemes({
      auth: [oauthScheme],
      operationSecurity: [{ schemeId: oauthScheme.id, scopes: [] }],
      guided: true,
      playgroundAvailable: true,
      handledOAuthSchemeId: oauthScheme.id
    })).toEqual([]);
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
