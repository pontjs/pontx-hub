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
import { DocumentationEvidence, OperationSeoContent } from "~/components/operation-seo-content";
import {
  pkceChallenge,
  postOAuthToken,
  randomOAuthValue,
  waitForOAuthPopup,
  type OAuthClientCredentials,
  type OAuthTokenSet
} from "~/lib/oauth/client";

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

function OAuthToolbar({
  scheme,
  requiredScopes,
  state,
  onAuthorize,
  onClear
}: {
  scheme: Extract<CatalogApi["auth"][number], { type: "oauth2" }>;
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
  const flowScopes = scheme.flows?.[flow]?.scopes ?? {};
  const [scopes, setScopes] = useState(requiredScopes);
  if (!flows.length) return null;
  const busy = state.status === "authorizing" || state.status === "refreshing";
  const authorized = state.status === "authorized" || state.status === "refreshing";
  return <section className="oauth-toolbar" aria-label="OAuth 2.0 authorization">
    <div className="oauth-toolbar-heading">
      <div><strong>OAuth 2.0</strong><span>{authorized ? "已授权" : "会话级授权"}</span></div>
      <p>回调地址：<code>{typeof window === "undefined" ? "/oauth/callback" : `${window.location.origin}/oauth/callback`}</code></p>
    </div>
    <div className="oauth-toolbar-fields">
      {flows.length > 1 && <label>Flow<select value={flow} onChange={(event) => { setFlow(event.target.value as OAuthAuthorizeInput["flow"]); setScopes(requiredScopes); }}><option value="authorizationCode">Authorization Code</option><option value="clientCredentials">Client Credentials</option></select></label>}
      <label>Client ID<input autoComplete="off" value={clientId} onChange={(event) => setClientId(event.target.value)} /></label>
      <label>Client Secret<input type="password" autoComplete="off" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} /></label>
    </div>
    {Object.keys(flowScopes).length > 0 && <fieldset><legend>Scopes</legend>{Object.keys(flowScopes).map((scope) => <label key={scope}><input type="checkbox" checked={scopes.includes(scope)} disabled={requiredScopes.includes(scope)} onChange={(event) => setScopes(event.target.checked ? [...scopes, scope] : scopes.filter((item) => item !== scope))} /><code>{scope}</code>{requiredScopes.includes(scope) && <small>必需</small>}</label>)}</fieldset>}
    {state.error && <p className="oauth-toolbar-error" role="alert">{state.error}</p>}
    <div className="oauth-toolbar-actions"><button type="button" disabled={busy || !clientId} onClick={() => void onAuthorize({ schemeName: scheme.id, flow, clientId, clientSecret: clientSecret || undefined, scopes })}>{busy ? "授权中…" : authorized ? "重新授权" : "发起授权"}</button>{authorized && <button type="button" className="secondary" onClick={onClear}>清除授权</button>}<span>client_secret 不会持久化或写入日志</span></div>
  </section>;
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
  { id: "typescript-sdk", label: "TypeScript SDK", language: "typescript" }
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
  const server =
    api.servers.find((candidate) => request.url.startsWith(candidate.url)) ??
    api.servers[0];
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
  operation
}: {
  locale: Locale;
  api: CatalogApi;
  operation: CatalogOperation;
}) {
  installPlaygroundSessionStorageBridge();

  const navigate = useNavigate();
  const spec = useMemo(() => toPontxSpec(api, locale), [api, locale]);
  const pontxApi = useMemo(
    () => toPontxApi(api, operation, locale),
    [api, locale, operation]
  );
  const selectedApiName = pontxOperationName(operation);
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
    const configKey = `playground:${operation.method}:${operation.path}:params`;
    let config: Record<string, unknown> = {};
    try { config = JSON.parse(window.sessionStorage.getItem(configKey) ?? "{}") as Record<string, unknown>; } catch { /* replace invalid state */ }
    window.sessionStorage.setItem(configKey, JSON.stringify({ ...config, auth: { type: "oauth2", token: token.accessToken } }));
  }, [operation.method, operation.path, tokenStorageKey]);

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
    const configKey = `playground:${operation.method}:${operation.path}:params`;
    try {
      const config = JSON.parse(window.sessionStorage.getItem(configKey) ?? "{}") as Record<string, unknown>;
      delete config.auth;
      window.sessionStorage.setItem(configKey, JSON.stringify(config));
    } catch { window.sessionStorage.removeItem(configKey); }
    setOAuthToken(undefined);
    setOAuthCredentials(undefined);
    setOAuthState({ status: "idle" });
  }, [operation.method, operation.path, tokenStorageKey]);

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
      setIsExecuting(true);
      setExecutionResult(undefined);
      try {
        const requestBody = hubRequestPayload(request, api, operation);
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
    [api, locale, operation]
  );

  const getCodeGenScenarios = useCallback(() => codeGenScenarios, []);

  const generateCode = useCallback(
    async ({ scenarioId, request }: CodeGenRequest) => {
      try {
        const requestBody = hubRequestPayload(request, api, operation);
        if (scenarioId === "curl") {
          const preview = await postHub<Preview>(
            "/api/v1/playground/preview",
            requestBody
          );
          return preview.curl;
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
    [api, operation]
  );

  return (
    <main className="pontx-workspace">
      <aside className="pontx-workspace-directory">
        <div className="pontx-pane-label">
          <span>{locale === "zh" ? "接口目录" : "Endpoint directory"}</span>
          <strong>{api.operations.length}</strong>
        </div>
        <ApiDirectory
          spec={spec}
          selectedApiName={selectedApiName}
          onApiSelect={handleApiSelect}
          defaultExpandedTags={[operation.tag]}
          searchPlaceholder={locale === "zh" ? "搜索接口…" : "Search endpoints…"}
          className="pontx-directory"
        />
      </aside>

      <section className="pontx-workspace-content">
        <div className="pontx-workspace-bar">
          <div>
            <span>{api.provider}</span>
            <b>/</b>
            <code>{operation.operationId}</code>
          </div>
          <p>
            {api.sdkStatus === "published" ? <a href={`/${locale}/sdks/${api.slug}`}>{locale === "zh" ? "SDK / CLI" : "SDK / CLI"} →</a> : locale === "zh"
              ? "调试经 Hub 代理 · 凭证仅保留当前会话"
              : "Hub-proxied execution · credentials stay in this session"}
          </p>
        </div>
        {isHydrated ? (
          <h1 className="pontx-hydrated-title">
            {localize(operation.title, locale)} — {api.name}
          </h1>
        ) : null}
        {isHydrated ? (
          oauthScheme?.flows ? <OAuthToolbar
            scheme={oauthScheme}
            requiredScopes={operation.security?.find((item) => item.schemeId === oauthScheme.id)?.scopes ?? []}
            state={oauthState}
            onAuthorize={authorizeOAuth}
            onClear={clearOAuth}
          /> : null
        ) : null}
        {isHydrated ? (
          <>
            <DocumentationEvidence locale={locale} operation={operation} />
            <ApiDocumentation
              key={`${locale}:${api.slug}:${operation.slug}:${oauthToken?.accessToken ?? "anonymous"}`}
              api={pontxApi}
              enablePlayground
              specName={api.slug}
              servers={api.servers.map((server) => ({
                url: server.url,
                description: localize(server.description, locale)
              }))}
              onExecute={execute}
              executionResult={executionResult}
              isExecuting={isExecuting}
              {...({
                onOAuthAuthorize: authorizeOAuth,
                onOAuthClear: clearOAuth,
                oauthState,
                oauthAccessToken: oauthToken?.accessToken,
                oauthRequiredScopes: operation.security?.find((item) => item.schemeId === oauthScheme?.id)?.scopes ?? []
              } as Record<string, unknown>)}
              getCodeGenScenarios={getCodeGenScenarios}
              onGenerateCode={generateCode}
              className="pontx-documentation"
            />
          </>
        ) : (
          <OperationSeoContent locale={locale} api={api} operation={operation} />
        )}
      </section>
    </main>
  );
}
