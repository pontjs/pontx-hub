import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ApiDirectory } from "@pontx/shadcn-ui/api-directory";
import { ApiDocumentation } from "@pontx/shadcn-ui/api-documentation";
import type {
  AuthData,
  CodeGenRequest,
  CodeGenScenario,
  PlaygroundExecutionResult,
  PlaygroundRequest
} from "@pontx/shadcn-ui";
import type { PontxAPI } from "@pontx/spec";
import {
  pontxOperationName,
  toPontxApi,
  toPontxSpec
} from "~/lib/catalog/pontx-adapter";
import type {
  CatalogApi,
  CatalogOperation,
  Locale
} from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { installPlaygroundSessionStorageBridge } from "~/lib/playground/session-storage";
import { getPlaygroundAvailability } from "~/lib/playground/availability";
import { DocumentationEvidence, OperationSeoContent } from "~/components/operation-seo-content";
import { ResourceNavigation } from "~/components/resource-navigation";
import {
  pkceChallenge,
  postOAuthToken,
  randomOAuthValue,
  waitForOAuthPopup,
  type OAuthClientCredentials,
  type OAuthTokenSet
} from "~/lib/oauth/client";
import { hubCliSnippet } from "~/lib/hub-cli-command";

type OAuthAuthorizeInput = {
  schemeName: string;
  flow: "authorizationCode" | "clientCredentials";
  clientId: string;
  clientSecret?: string;
  scopes: string[];
};

type OAuthUiState = {
  status: "idle" | "authorizing" | "authorized" | "refreshing" | "error";
  scopes?: string[];
  expiresAt?: number;
  error?: string;
};

export function isOAuthAuthorizationDisabled({
  busy,
  clientId,
  requiresRedirectRegistration,
  redirectUriRegistered
}: {
  busy: boolean;
  clientId: string;
  requiresRedirectRegistration: boolean;
  redirectUriRegistered: boolean;
}) {
  return busy || !clientId || (requiresRedirectRegistration && !redirectUriRegistered);
}

export function OAuthToolbar({
  scheme,
  locale,
  requiredScopes,
  state,
  onAuthorize,
  onClear
}: {
  scheme: Extract<CatalogApi["auth"][number], { type: "oauth2" }>;
  locale: Locale;
  requiredScopes: string[];
  state: OAuthUiState;
  onAuthorize: (input: OAuthAuthorizeInput) => Promise<void>;
  onClear: () => void;
}) {
  const flows = Object.keys(scheme.flows ?? {}).filter(
    (flow): flow is OAuthAuthorizeInput["flow"] =>
      flow === "authorizationCode" || flow === "clientCredentials"
  );
  const [flow, setFlow] = useState<OAuthAuthorizeInput["flow"]>(flows[0] ?? "authorizationCode");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUriRegistered, setRedirectUriRegistered] = useState(false);
  const flowScopes = scheme.flows?.[flow]?.scopes ?? {};
  const [scopes, setScopes] = useState(requiredScopes);
  if (!flows.length) return null;
  const busy = state.status === "authorizing" || state.status === "refreshing";
  const authorized = state.status === "authorized" || state.status === "refreshing";
  const requiresRedirectRegistration = flow === "authorizationCode" && Boolean(scheme.credentialGuide);
  return <details className="oauth-toolbar">
    <summary className="oauth-toolbar-heading">
      <div><strong>OAuth 2.0</strong><span>{authorized ? "已授权" : "会话级授权"}</span></div>
      <p>{locale === "zh" ? "配置凭证并授权" : "Configure credentials"}</p>
    </summary>
    <div className="oauth-toolbar-content">
    <p className="oauth-callback">{locale === "zh" ? "回调地址" : "Callback URL"}：<code>{typeof window === "undefined" ? "/oauth/callback" : `${window.location.origin}/oauth/callback`}</code></p>
    {scheme.credentialGuide && <details className="oauth-credential-guide" open>
      <summary>
        <span aria-hidden="true">01</span>
        <strong>{localize(scheme.credentialGuide.title, locale)}</strong>
        <span>{locale === "zh" ? "查看申请步骤" : "View setup steps"}</span>
      </summary>
      <div>
        <ol>{scheme.credentialGuide.steps.map((step, index) => <li key={index}>{localize(step, locale)}</li>)}</ol>
        <a href={scheme.credentialGuide.url} target="_blank" rel="noreferrer">{locale === "zh" ? "打开官方开发者中心 ↗" : "Open Developer Center ↗"}</a>
      </div>
    </details>}
    <div className="oauth-toolbar-fields">
      {flows.length > 1 && <label>Flow<select value={flow} onChange={(event) => { setFlow(event.target.value as OAuthAuthorizeInput["flow"]); setScopes(requiredScopes); setRedirectUriRegistered(false); }}><option value="authorizationCode">Authorization Code</option><option value="clientCredentials">Client Credentials</option></select></label>}
      <label>Client ID<input autoComplete="off" value={clientId} onChange={(event) => setClientId(event.target.value)} /></label>
      <label>Client Secret<input type="password" autoComplete="off" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} /></label>
    </div>
    {requiresRedirectRegistration && <label className="oauth-redirect-confirmation"><input type="checkbox" checked={redirectUriRegistered} onChange={(event) => setRedirectUriRegistered(event.target.checked)} /><span>{locale === "zh" ? "我已在开发者中心登记上述回调地址（未登记会触发 invalid_request）" : "I registered the callback URL above in the Developer Center (otherwise authorization returns invalid_request)."}</span></label>}
    {Object.keys(flowScopes).length > 0 && <fieldset><legend>Scopes</legend>{Object.keys(flowScopes).map((scope) => <label key={scope}><input type="checkbox" checked={scopes.includes(scope)} disabled={requiredScopes.includes(scope)} onChange={(event) => setScopes(event.target.checked ? [...scopes, scope] : scopes.filter((item) => item !== scope))} /><code>{scope}</code>{requiredScopes.includes(scope) && <small>必需</small>}</label>)}</fieldset>}
    {state.error && <p className="oauth-toolbar-error" role="alert">{state.error}</p>}
    <div className="oauth-toolbar-actions"><button type="button" disabled={isOAuthAuthorizationDisabled({ busy, clientId, requiresRedirectRegistration, redirectUriRegistered })} onClick={() => void onAuthorize({ schemeName: scheme.id, flow, clientId, clientSecret: clientSecret || undefined, scopes })}>{busy ? "授权中…" : authorized ? "重新授权" : "发起授权"}</button>{authorized && <button type="button" className="secondary" onClick={onClear}>清除授权</button>}<span>client_secret 不会持久化或写入日志</span></div>
    </div>
  </details>;
}

type ApiEnvelope<T> =
  | { version: "v1"; data: T }
  | { error: { code: string; message: string; requestId: string } };

type Preview = {
  curl: string;
  requiresConfirmation: boolean;
  confirmationToken?: string;
};

type Execution = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
};

const codeGenScenarios: CodeGenScenario[] = [
  { id: "curl", label: "cURL", language: "shell" },
  { id: "typescript-sdk", label: "TypeScript SDK", language: "typescript" },
  { id: "hub-cli", label: "Pontx Hub CLI", language: "shell" }
];

function payloadError<T>(payload: ApiEnvelope<T>): string | undefined {
  return "error" in payload ? payload.error.message : undefined;
}

function authPayload(auth: AuthData | undefined, api: CatalogApi) {
  if (!auth) return undefined;
  const scheme = api.auth[0];
  if (!scheme) return undefined;

  if (auth.type === "apiKey") {
    if (!auth.value) return undefined;
    return {
      type: "apiKey" as const,
      schemeId: scheme.id,
      value: auth.value
    };
  }
  if (auth.type === "basic") {
    if (!auth.password) return undefined;
    return {
      type: "basic" as const,
      schemeId: scheme.id,
      username: auth.username,
      password: auth.password
    };
  }
  if (!auth.token) return undefined;
  return {
    type: auth.type,
    schemeId: scheme.id,
    token: auth.token
  };
}

function hubRequestPayload(
  request: PlaygroundRequest,
  api: CatalogApi,
  operation: CatalogOperation
) {
  const approvedServers = operation.serverIds.length
    ? api.servers.filter((candidate) => operation.serverIds.includes(candidate.id))
    : api.servers;
  const server =
    approvedServers.find((candidate) => request.url.startsWith(candidate.url)) ??
    approvedServers[0];
  if (!server) throw new Error("No approved server is configured for this endpoint");
  return {
    apiSlug: api.slug,
    operationSlug: operation.slug,
    serverId: server.id,
    path: request.path,
    query: request.query,
    headers: request.headers,
    ...(request.body === undefined ? {} : { body: request.body }),
    ...(request.auth
      ? { auth: authPayload(request.auth, api) }
      : {})
  };
}

async function postHub<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  const error = payloadError(payload);
  if (error) throw new Error(error);
  if (!("data" in payload)) throw new Error("Hub returned an invalid response");
  return payload.data;
}

export function PontxApiWorkspace({
  locale,
  api,
  operation,
  variant = "reference"
}: {
  locale: Locale;
  api: CatalogApi;
  operation: CatalogOperation;
  variant?: "guided" | "reference";
}) {
  installPlaygroundSessionStorageBridge();

  const navigate = useNavigate();
  const guided = variant === "guided";
  const [selectedOperation, setSelectedOperation] = useState(operation);
  const activeOperation = guided ? selectedOperation : operation;
  const spec = useMemo(() => toPontxSpec(api, locale), [api, locale]);
  const pontxApi = useMemo(
    () =>
      toPontxApi(api, activeOperation, locale, {
        parameterExamples: guided ? "required" : "all"
      }),
    [activeOperation, api, guided, locale]
  );
  const playgroundAvailability = getPlaygroundAvailability(
    api,
    activeOperation,
    locale
  );
  const operationServers = activeOperation.serverIds.length
    ? api.servers.filter((server) => activeOperation.serverIds.includes(server.id))
    : api.servers;
  const selectedApiName = pontxOperationName(activeOperation);
  const [isHydrated, setIsHydrated] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<PlaygroundExecutionResult>();
  const [isExecuting, setIsExecuting] = useState(false);
  const oauthScheme = api.auth.find((scheme) => scheme.type === "oauth2");
  const tokenStorageKey = `pontx:oauth:token:${api.slug}:${oauthScheme?.id ?? "oauth2"}`;
  const [oauthToken, setOAuthToken] = useState<OAuthTokenSet>();
  const [oauthCredentials, setOAuthCredentials] = useState<OAuthClientCredentials>();
  const [oauthState, setOAuthState] = useState<OAuthUiState>({ status: "idle" });

  const saveOAuthToken = useCallback((token: OAuthTokenSet) => {
    setOAuthToken(token);
    setOAuthState({ status: "authorized", scopes: token.scopes, expiresAt: token.expiresAt });
    window.sessionStorage.setItem(tokenStorageKey, JSON.stringify(token));
    const configKey = `playground:${activeOperation.method}:${activeOperation.path}:params`;
    let config: Record<string, unknown> = {};
    try { config = JSON.parse(window.sessionStorage.getItem(configKey) ?? "{}") as Record<string, unknown>; } catch { /* replace invalid state */ }
    window.sessionStorage.setItem(configKey, JSON.stringify({ ...config, auth: { type: "oauth2", token: token.accessToken } }));
  }, [activeOperation.method, activeOperation.path, tokenStorageKey]);

  useEffect(() => {
    setIsHydrated(true);
    const stored = window.sessionStorage.getItem(tokenStorageKey);
    if (stored) {
      try { saveOAuthToken(JSON.parse(stored) as OAuthTokenSet); }
      catch { window.sessionStorage.removeItem(tokenStorageKey); }
    }
  }, []);

  const clearOAuth = useCallback(() => {
    window.sessionStorage.removeItem(tokenStorageKey);
    const configKey = `playground:${activeOperation.method}:${activeOperation.path}:params`;
    try {
      const config = JSON.parse(window.sessionStorage.getItem(configKey) ?? "{}") as Record<string, unknown>;
      delete config.auth;
      window.sessionStorage.setItem(configKey, JSON.stringify(config));
    } catch { window.sessionStorage.removeItem(configKey); }
    setOAuthToken(undefined);
    setOAuthCredentials(undefined);
    setOAuthState({ status: "idle" });
  }, [activeOperation.method, activeOperation.path, tokenStorageKey]);

  const authorizeOAuth = useCallback(async (input: OAuthAuthorizeInput) => {
    if (!oauthScheme?.flows) return;
    setOAuthState({ status: "authorizing" });
    const credentials = { clientId: input.clientId, clientSecret: input.clientSecret };
    setOAuthCredentials(credentials);
    try {
      if (input.flow === "clientCredentials") {
        saveOAuthToken(await postOAuthToken({ apiSlug: api.slug, schemeId: oauthScheme.id, grantType: "client_credentials", ...credentials, scopes: input.scopes }));
        return;
      }
      const flow = oauthScheme.flows.authorizationCode;
      if (!flow?.authorizationUrl) throw new Error("Authorization Code is not configured for this API");
      const state = randomOAuthValue();
      const verifier = oauthScheme.pkce === "unsupported" ? undefined : randomOAuthValue(64);
      const redirectUri = `${window.location.origin}/oauth/callback`;
      const url = new URL(flow.authorizationUrl);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", input.clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("state", state);
      if (input.scopes.length) url.searchParams.set("scope", input.scopes.join(" "));
      if (verifier) {
        url.searchParams.set("code_challenge", await pkceChallenge(verifier));
        url.searchParams.set("code_challenge_method", "S256");
      }
      const popup = window.open(url, "pontx-oauth", "popup,width=560,height=720");
      if (!popup) {
        if (input.clientSecret) throw new Error("Allow popups for Pontx Hub; same-page fallback cannot retain a client secret safely");
        window.sessionStorage.setItem("pontx:oauth:pending", JSON.stringify({
          state, verifier, redirectUri, apiSlug: api.slug, schemeId: oauthScheme.id,
          clientId: input.clientId, scopes: input.scopes
        }));
        window.sessionStorage.setItem("pontx:oauth:return-url", window.location.href);
        window.location.assign(url);
        return;
      }
      const code = await waitForOAuthPopup(popup, state);
      saveOAuthToken(await postOAuthToken({ apiSlug: api.slug, schemeId: oauthScheme.id, grantType: "authorization_code", ...credentials, code, codeVerifier: verifier, redirectUri, scopes: input.scopes }));
    } catch (error) {
      setOAuthState({ status: "error", error: error instanceof Error ? error.message : "OAuth authorization failed" });
    }
  }, [api.slug, oauthScheme, saveOAuthToken]);

  useEffect(() => {
    const returned = window.sessionStorage.getItem("pontx:oauth:return");
    const pending = window.sessionStorage.getItem("pontx:oauth:pending");
    if (!returned || !pending) return;
    window.sessionStorage.removeItem("pontx:oauth:return");
    window.sessionStorage.removeItem("pontx:oauth:pending");
    window.sessionStorage.removeItem("pontx:oauth:return-url");
    void (async () => {
      try {
        const callback = JSON.parse(returned) as { code?: string; state?: string; error?: string; errorDescription?: string };
        const context = JSON.parse(pending) as { state: string; verifier?: string; redirectUri: string; apiSlug: string; schemeId: string; clientId: string; scopes: string[] };
        if (callback.state !== context.state) throw new Error("OAuth state validation failed");
        if (callback.error) throw new Error(callback.errorDescription || callback.error);
        if (!callback.code || context.apiSlug !== api.slug) throw new Error("OAuth callback is incomplete");
        setOAuthCredentials({ clientId: context.clientId });
        saveOAuthToken(await postOAuthToken({ apiSlug: context.apiSlug, schemeId: context.schemeId, grantType: "authorization_code", clientId: context.clientId, code: callback.code, codeVerifier: context.verifier, redirectUri: context.redirectUri, scopes: context.scopes }));
      } catch (error) {
        setOAuthState({ status: "error", error: error instanceof Error ? error.message : "OAuth authorization failed" });
      }
    })();
  }, [api.slug, saveOAuthToken]);

  useEffect(() => {
    if (!oauthToken?.refreshToken || !oauthToken.expiresAt || !oauthCredentials || !oauthScheme) return;
    const delay = Math.max(0, oauthToken.expiresAt - Date.now() - 60_000);
    const timer = window.setTimeout(async () => {
      setOAuthState((current) => ({ ...current, status: "refreshing" }));
      try {
        const refreshed = await postOAuthToken({ apiSlug: api.slug, schemeId: oauthScheme.id, grantType: "refresh_token", ...oauthCredentials, refreshToken: oauthToken.refreshToken, scopes: oauthToken.scopes });
        saveOAuthToken({ ...refreshed, refreshToken: refreshed.refreshToken ?? oauthToken.refreshToken });
      } catch (error) {
        clearOAuth();
        setOAuthState({ status: "error", error: error instanceof Error ? error.message : "OAuth token refresh failed" });
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [api.slug, clearOAuth, oauthCredentials, oauthScheme, oauthToken, saveOAuthToken]);

  const handleApiSelect = useCallback(
    (_apiName: string, selectedApi: PontxAPI) => {
      const operationSlug = (
        selectedApi as PontxAPI & {
          ext?: { operationSlug?: string };
        }
      ).ext?.operationSlug;
      if (operationSlug) {
        navigate(`/${locale}/apis/${api.slug}/${operationSlug}`);
      }
    },
    [api.slug, locale, navigate]
  );

  const execute = useCallback(
    async (request: PlaygroundRequest) => {
      if (!playgroundAvailability.executionEnabled) return;
      setIsExecuting(true);
      setExecutionResult(undefined);
      try {
        const requestBody = hubRequestPayload(request, api, activeOperation);
        const preview = await postHub<Preview>(
          "/api/v1/playground/preview",
          requestBody
        );
        if (
          preview.requiresConfirmation &&
          !window.confirm(
            locale === "zh"
              ? "此请求会修改供应商数据。确认发送刚才预演的请求？"
              : "This request changes provider data. Send the exact request you previewed?"
          )
        ) {
          return;
        }
        const result = await postHub<Execution>(
          "/api/v1/playground/execute",
          {
            ...requestBody,
            confirmationToken: preview.confirmationToken
          }
        );
        setExecutionResult({
          status: result.status,
          statusText: result.statusText,
          headers: result.headers,
          body: result.body,
          duration: result.durationMs
        });
      } catch (error) {
        setExecutionResult({
          status: 500,
          statusText: locale === "zh" ? "请求失败" : "Request failed",
          headers: {},
          body: {
            error: error instanceof Error ? error.message : "Request failed"
          },
          duration: 0
        });
      } finally {
        setIsExecuting(false);
      }
    },
    [activeOperation, api, locale, playgroundAvailability.executionEnabled]
  );

  const getCodeGenScenarios = useCallback(() => codeGenScenarios, []);
  const executableOperationCount = api.operations.filter(
    (candidate) =>
      getPlaygroundAvailability(api, candidate, locale).executionEnabled
  ).length;
  const zh = locale === "zh";
  const quickCallAction = playgroundAvailability.executionEnabled
    ? zh ? "立即试用" : "Try it now"
    : zh ? "查看请求" : "Preview request";
  const quickCallTitle = playgroundAvailability.executionEnabled
    ? zh ? "快速调用" : "Quick start"
    : zh ? "请求预览" : "Request preview";
  const quickCallDescription = playgroundAvailability.executionEnabled
    ? zh
      ? "选择目标，确认预填参数并执行"
      : "Choose a task, review the example, then run it"
    : zh
      ? "此接口不支持由 Hub 代理执行"
      : "Hub proxy execution is unavailable for this endpoint";
  const category =
    locale === "zh"
      ? ({ Finance: "金融", Productivity: "效率工具" } as Record<
          string,
          string
        >)[api.category] ?? api.category
      : api.category;
  const authLabel = api.auth.length
    ? api.auth
        .map((item) => {
          if (item.type === "oauth2") return "OAuth 2.0";
          if (item.type === "apiKey") return "API Key";
          return item.type;
        })
        .join(" / ")
    : locale === "zh"
      ? "无需鉴权"
      : "None";

  const generateCode = useCallback(
    async ({ scenarioId, request }: CodeGenRequest) => {
      try {
        const requestBody = hubRequestPayload(request, api, activeOperation);
        if (scenarioId === "curl") {
          const preview = await postHub<Preview>(
            "/api/v1/playground/preview",
            requestBody
          );
          return preview.curl;
        }
        if (scenarioId === "hub-cli") {
          return hubCliSnippet(api.slug, activeOperation, request);
        }
        const generated = await postHub<{ code: string }>(
          "/api/v1/codegen/snippet",
          requestBody
        );
        return generated.code;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Code generation failed";
        return `// ${message}`;
      }
    },
    [activeOperation, api]
  );

  return (
    <main className={`resource-page resource-page-workspace${guided ? " resource-page-guided" : ""}`}>
      <ResourceNavigation locale={locale} api={api} active={guided ? "overview" : "docs"} />
      {guided ? (
        <header className="api-overview-hero" style={{ "--api-accent": api.accent } as React.CSSProperties}>
          <div className="api-overview-intro">
            <p className="eyebrow">{api.provider} / {category}</p>
            <h1>{localize(api.title, locale)}</h1>
            <p>{localize(api.summary, locale)}</p>
            <div className="api-overview-actions">
              <a className="button button-dark" href="#quick-call">
                {quickCallAction}
              </a>
              <a
                className="button"
                href={`/${locale}/apis/${api.slug}/${activeOperation.slug}`}
              >
                {locale === "zh" ? "浏览接口文档" : "Browse endpoint docs"}
              </a>
            </div>
          </div>
          <dl className="api-overview-facts">
            <div><dt>{locale === "zh" ? "提供方" : "Provider"}</dt><dd>{api.provider}</dd></div>
            <div><dt>{locale === "zh" ? "鉴权" : "Authentication"}</dt><dd>{authLabel}</dd></div>
            <div><dt>{locale === "zh" ? "接口" : "Endpoints"}</dt><dd>{api.operations.length}</dd></div>
            <div><dt>{locale === "zh" ? "数据结构" : "Schemas"}</dt><dd>{api.schemas.length}</dd></div>
            <div><dt>{locale === "zh" ? "在线调用" : "Live calls"}</dt><dd>{executableOperationCount ? `${executableOperationCount}/${api.operations.length}` : locale === "zh" ? "仅预览" : "Preview only"}</dd></div>
            <div><dt>SDK</dt><dd>{api.sdkStatus === "published" ? `v${api.sdkVersion}` : locale === "zh" ? "计划中" : "Planned"}</dd></div>
          </dl>
        </header>
      ) : null}
      <div className="pontx-workspace" id={guided ? "quick-call" : undefined}>
      {!guided ? <aside className="pontx-workspace-directory">
        <div className="pontx-pane-label">
          <span>{locale === "zh" ? "接口目录" : "Endpoint directory"}</span>
          <strong>{api.operations.length}</strong>
        </div>
        <ApiDirectory
          locale={locale === "zh" ? "zh-CN" : "en"}
          spec={spec}
          selectedApiName={selectedApiName}
          onApiSelect={handleApiSelect}
          defaultExpandedTags={[activeOperation.tag]}
          searchPlaceholder={locale === "zh" ? "搜索接口…" : "Search endpoints…"}
          className="pontx-directory"
        />
      </aside> : null}

      <section className="pontx-workspace-content">
        <div className={`pontx-workspace-bar${guided ? " api-quickstart-bar" : ""}`}>
          {guided ? <>
            <div className="api-quickstart-heading">
              <span aria-hidden="true">01</span>
              <span>
                <strong>{quickCallTitle}</strong>
                <small>{quickCallDescription}</small>
              </span>
            </div>
            <label className="api-task-select">
              <span>{locale === "zh" ? "调用目标" : "Task"}</span>
              <select
                value={activeOperation.slug}
                onChange={(event) => {
                  const candidate = api.operations.find((item) => item.slug === event.target.value);
                  if (candidate) {
                    setSelectedOperation(candidate);
                    setExecutionResult(undefined);
                  }
                }}
              >
                {api.operations.map((candidate) => (
                  <option key={candidate.slug} value={candidate.slug}>
                    {localize(candidate.title, locale)}
                  </option>
                ))}
              </select>
            </label>
            <a className="api-full-docs-link" href={`/${locale}/apis/${api.slug}/${activeOperation.slug}`}>
              {locale === "zh" ? "查看完整接口文档" : "Full endpoint docs"}<span aria-hidden="true">→</span>
            </a>
          </> : <>
            <div>
              <span>{api.provider}</span>
              <b>/</b>
              <code>{activeOperation.operationId}</code>
            </div>
            <p>
              {!playgroundAvailability.executionEnabled
                ? locale === "zh" ? "仅预览 · 原因见下方" : "Preview only · details below"
                : api.sdkStatus === "published" ? <a href={`/${locale}/sdks/${api.slug}`}>SDK / CLI →</a> : locale === "zh"
              ? "调试经 Hub 代理 · 凭证仅保留当前会话"
              : "Hub-proxied execution · credentials stay in this session"}
            </p>
          </>}
        </div>
        <div className="pontx-workspace-body">
          {isHydrated && !guided ? (
            <h1 className="pontx-hydrated-title">
              {localize(activeOperation.title, locale)} — {api.name}
            </h1>
          ) : null}
          {isHydrated ? (
            oauthScheme?.flows ? <OAuthToolbar
              scheme={oauthScheme}
              locale={locale}
              requiredScopes={activeOperation.security?.find((item) => item.schemeId === oauthScheme.id)?.scopes ?? []}
              state={oauthState}
              onAuthorize={authorizeOAuth}
              onClear={clearOAuth}
            /> : null
          ) : null}
          {isHydrated ? (
            <>
            {!guided || !playgroundAvailability.executionEnabled ? (
              <DocumentationEvidence locale={locale} api={api} operation={activeOperation} />
            ) : null}
            <ApiDocumentation
              key={`${locale}:${api.slug}:${activeOperation.slug}:${oauthToken?.accessToken ?? "anonymous"}`}
              locale={locale === "zh" ? "zh-CN" : "en"}
              api={pontxApi}
              enablePlayground={playgroundAvailability.executionEnabled}
              defaultPlaygroundVisible={guided && playgroundAvailability.executionEnabled}
              specName={api.slug}
              servers={operationServers.map((server) => ({
                url: server.url,
                description: localize(server.description, locale)
              }))}
              onExecute={playgroundAvailability.executionEnabled ? execute : undefined}
              executionResult={executionResult}
              isExecuting={isExecuting}
              {...({
                onOAuthAuthorize: authorizeOAuth,
                onOAuthClear: clearOAuth,
                oauthState,
                oauthAccessToken: oauthToken?.accessToken,
                oauthRequiredScopes: activeOperation.security?.find((item) => item.schemeId === oauthScheme?.id)?.scopes ?? []
              } as Record<string, unknown>)}
              getCodeGenScenarios={getCodeGenScenarios}
              onGenerateCode={generateCode}
              className={`pontx-documentation${guided && playgroundAvailability.executionEnabled ? " pontx-documentation-guided" : ""}`}
            />
            </>
          ) : (
            guided ? (
              <>
                <section className="api-quick-call-fallback" aria-labelledby="quick-call-title">
                  <p className="eyebrow">{activeOperation.method} {activeOperation.path}</p>
                  <h2 id="quick-call-title">{localize(activeOperation.title, locale)}</h2>
                  <p>{localize(activeOperation.description, locale)}</p>
                </section>
                {!playgroundAvailability.executionEnabled ? (
                  <DocumentationEvidence locale={locale} api={api} operation={activeOperation} />
                ) : null}
              </>
            ) : <OperationSeoContent locale={locale} api={api} operation={activeOperation} />
          )}
        </div>
      </section>
      </div>
    </main>
  );
}
