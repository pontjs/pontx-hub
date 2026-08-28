import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState
} from "react";
import { Link, useNavigate } from "react-router";
import {
  Button,
  Card,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@pontx/shadcn-ui";
import type {
  AuthData,
  CodeGenRequest,
  CodeGenScenario,
  PlaygroundExecutionResult,
  PlaygroundRequest
} from "@pontx/shadcn-ui";
import type { PontxSpec } from "@pontx/spec";
import { pontxApiView } from "~/lib/catalog/pontx-view";
import type {
  CatalogApi,
  CatalogApiContext,
  CatalogEndpointSummary,
  CatalogOperation,
  Locale
} from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { installPlaygroundSessionStorageBridge } from "~/lib/playground/session-storage";
import { getPlaygroundAvailability } from "~/lib/playground/availability";
import { storedConfigForPlaygroundHistory } from "~/lib/playground/history-replay";
import { DocumentationEvidence, OperationSeoContent } from "~/components/operation-seo-content";
import {
  EndpointPlaygroundHistory,
  type EndpointPlaygroundHistoryEntry
} from "~/components/endpoint-playground-history";
import { FavoriteEndpointButton } from "~/components/favorite-endpoint-button";
import { useAccount } from "~/lib/accounts/account-context";
import { RequestExampleNotice } from "~/components/request-example-notice";
import { ResourceDirectoryNavigation } from "~/components/resource-directory-navigation";
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
import { supportsSdkOperation } from "~/lib/sdk-codegen";
import { apiWorkspaceNavigationCopy } from "~/lib/i18n";
import {
  defaultRequestExample,
  requestExampleInputLabel,
  storedConfigForRequestExample,
  unresolvedRequestInputs
} from "~/lib/playground/request-examples";
import {
  credentialGuidePreferenceKey,
  isBrowserCredentialGuideCollapsed,
  persistBrowserCredentialGuideCollapsed
} from "~/lib/playground/credential-guide-preference";
import { trackPlaygroundRequest } from "~/lib/analytics/events";

const LazyApiDocumentation = lazy(async () => {
  const module = await import("@pontx/shadcn-ui/api-documentation");
  return { default: module.ApiDocumentation };
});

const useClientLayoutEffect = typeof window === "undefined"
  ? useEffect
  : useLayoutEffect;

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

type GuidedCredentialScheme = CatalogApi["auth"][number] & {
  credentialGuide: NonNullable<CatalogApi["auth"][number]["credentialGuide"]>;
};

function hasCredentialGuide(
  scheme: CatalogApi["auth"][number]
): scheme is GuidedCredentialScheme {
  return Boolean(scheme.credentialGuide);
}

export function getStandaloneCredentialGuideSchemes({
  auth,
  operationSecurity,
  guided,
  playgroundAvailable,
  handledOAuthSchemeId
}: {
  auth: CatalogApi["auth"];
  operationSecurity?: CatalogOperation["security"];
  guided: boolean;
  playgroundAvailable: boolean;
  handledOAuthSchemeId?: string;
}) {
  const requiredSchemeIds = new Set(
    operationSecurity?.map((requirement) => requirement.schemeId) ?? []
  );

  return auth.filter((scheme): scheme is GuidedCredentialScheme => {
    if (!hasCredentialGuide(scheme)) return false;
    if (!guided && !requiredSchemeIds.has(scheme.id)) return false;
    if (scheme.id === handledOAuthSchemeId) return false;

    const renderedInsidePlayground = guided
      && playgroundAvailable
      && scheme.type !== "oauth2"
      && requiredSchemeIds.has(scheme.id);
    return !renderedInsidePlayground;
  });
}

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

export function isOAuthExecutionBlocked({
  schemeId,
  hasSupportedFlow,
  operationSecurity,
  executionEnabled,
  accessToken
}: {
  schemeId?: string;
  hasSupportedFlow: boolean;
  operationSecurity?: CatalogOperation["security"];
  executionEnabled: boolean;
  accessToken?: string;
}) {
  if (!schemeId || !hasSupportedFlow || !executionEnabled) return false;
  return Boolean(
    operationSecurity?.some((requirement) => requirement.schemeId === schemeId)
  ) && !accessToken;
}

type PlaygroundApi = ReturnType<typeof pontxApiView>;

export function withoutHostManagedOAuthScheme(
  api: PlaygroundApi,
  schemeId?: string
): PlaygroundApi {
  if (!schemeId || !api.securitySchemes?.[schemeId]) return api;

  const securitySchemes = Object.fromEntries(
    Object.entries(api.securitySchemes).filter(([candidate]) => candidate !== schemeId)
  );

  return {
    ...api,
    securitySchemes: Object.keys(securitySchemes).length ? securitySchemes : undefined
  };
}

export function ApiOverviewActions({
  locale,
  apiSlug,
  operationSlug,
  quickCallAction,
  skillName
}: {
  locale: Locale;
  apiSlug: string;
  operationSlug: string;
  quickCallAction: string;
  skillName?: string;
}) {
  const workspaceCopy = apiWorkspaceNavigationCopy(locale);

  return (
    <div className="api-overview-actions">
      <Link
        className="button button-dark"
        to={`/${locale}/apis/${apiSlug}/${operationSlug}`}
      >
        {workspaceCopy.browseAllEndpoints}
      </Link>
      <a className="button" href="#quick-call">
        {quickCallAction}
      </a>
      {skillName ? (
        <Link className="button" to={`/${locale}/skills/${skillName}`}>
          {locale === "zh" ? "安装产品 Skill" : "Install product Skill"}
        </Link>
      ) : null}
    </div>
  );
}

export function ApiOverviewFacts({
  locale,
  api,
  operationSlug
}: {
  locale: Locale;
  api: CatalogApiContext;
  operationSlug: string;
}) {
  const endpointCount = api.endpointCount ?? api.operations.length;
  const schemaCount = api.schemaCount ?? api.schemas.length;
  const executableOperationCount = api.executableEndpointCount ?? api.operations.filter(
    (operation) => getPlaygroundAvailability(operation, locale).executionEnabled
  ).length;
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
  const apiTitle = localize(api.title, locale);
  const sdkValue = api.sdkStatus === "published"
    ? `v${api.sdkVersion}`
    : locale === "zh"
      ? "计划中"
      : "Planned";
  const defaultSchemaName = api.defaultSchemaName ?? api.schemas[0]?.name;
  const linkedFact = ({
    label,
    value,
    href,
    ariaLabel,
    arrow = "↗"
  }: {
    label: string;
    value: string | number;
    href: string;
    ariaLabel: string;
    arrow?: string;
  }) => (
    <div className="api-overview-link-fact">
      <dt>{label}</dt>
      <dd>
        {href.startsWith("#") ? (
          <a className="api-overview-fact-link" href={href} aria-label={ariaLabel}>
            <span>{value}</span>
            <span className="api-overview-fact-arrow" aria-hidden="true">{arrow}</span>
          </a>
        ) : (
          <Link
            className="api-overview-fact-link"
            to={href}
            aria-label={ariaLabel}
          >
            <span>{value}</span>
            <span className="api-overview-fact-arrow" aria-hidden="true">{arrow}</span>
          </Link>
        )}
      </dd>
    </div>
  );

  return (
    <dl className="api-overview-facts">
      <div><dt>{locale === "zh" ? "提供方" : "Provider"}</dt><dd>{api.provider}</dd></div>
      <div><dt>{locale === "zh" ? "鉴权" : "Authentication"}</dt><dd>{authLabel}</dd></div>
      {linkedFact({
        label: locale === "zh" ? "接口" : "Endpoints",
        value: endpointCount,
        href: `/${locale}/apis/${api.slug}/${operationSlug}`,
        ariaLabel: locale === "zh"
          ? `打开 ${apiTitle} 接口目录`
          : `Open the ${apiTitle} endpoint directory`
      })}
      {defaultSchemaName ? linkedFact({
        label: locale === "zh" ? "数据结构" : "Schemas",
        value: schemaCount,
        href: `/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(defaultSchemaName)}`,
        ariaLabel: locale === "zh"
          ? `打开 ${apiTitle} 数据结构目录`
          : `Open the ${apiTitle} schema directory`
      }) : (
        <div><dt>{locale === "zh" ? "数据结构" : "Schemas"}</dt><dd>{schemaCount}</dd></div>
      )}
      {linkedFact({
        label: locale === "zh" ? "在线调用" : "Live calls",
        value: executableOperationCount
          ? `${executableOperationCount}/${endpointCount}`
          : locale === "zh"
            ? "暂不可调用"
            : "Unavailable",
        href: "#quick-call",
        ariaLabel: locale === "zh"
          ? `跳到 ${apiTitle} 在线调用`
          : `Jump to ${apiTitle} live calls`,
        arrow: "↓"
      })}
      {linkedFact({
        label: "SDK",
        value: sdkValue,
        href: `/${locale}/sdks/${api.slug}`,
        ariaLabel: locale === "zh"
          ? `打开 ${apiTitle} SDK 页面`
          : `Open the ${apiTitle} SDK page`
      })}
    </dl>
  );
}

export function OperationTaskSelect({
  locale,
  apiSlug,
  operations,
  value,
  onValueChange
}: {
  locale: Locale;
  apiSlug: string;
  operations: Array<CatalogOperation | CatalogEndpointSummary>;
  value: string;
  onValueChange: (slug: string) => void;
}) {
  const activeOperation = operations.find((operation) => operation.slug === value);
  const labelId = `api-task-select-label-${apiSlug}`;

  return (
    <div className="api-task-select">
      <span id={labelId}>{locale === "zh" ? "调用目标" : "Task"}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className="api-task-select-trigger"
          aria-labelledby={labelId}
        >
          <SelectValue>
            {activeOperation ? localize(activeOperation.title, locale) : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="api-task-select-content">
          {operations.map((operation) => (
            <SelectItem
              className="api-task-select-item"
              key={operation.slug}
              value={operation.slug}
            >
              {localize(operation.title, locale)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CredentialSetupGuide({
  apiSlug,
  scheme,
  locale
}: {
  apiSlug: string;
  scheme: GuidedCredentialScheme;
  locale: Locale;
}) {
  const zh = locale === "zh";
  const badge = scheme.type === "apiKey"
    ? "API KEY"
    : scheme.type === "bearer" || scheme.type === "oauth2"
      ? "TOKEN"
      : "BASIC";
  const guideCopy = zh
    ? {
        label: "官方凭据申请指引",
        steps: `${scheme.credentialGuide.steps.length} 步`,
        action: "打开官方获取/配置指引 ↗",
        safety: "Pontx 不会保存你的凭据；请仅在当前会话或调用方本地安全环境中使用。"
      }
    : {
        label: "Official credential setup",
        steps: `${scheme.credentialGuide.steps.length} steps`,
        action: "Open official setup guidance ↗",
        safety: "Pontx never stores your credential; use it only in this session or a caller-controlled local environment."
      };
  const preferenceKey = credentialGuidePreferenceKey(apiSlug, scheme.id);
  const [open, setOpen] = useState(true);

  useClientLayoutEffect(() => {
    setOpen(!isBrowserCredentialGuideCollapsed(apiSlug, scheme.id));
  }, [apiSlug, preferenceKey, scheme.id]);

  useEffect(() => {
    const syncStoredPreference = (event: StorageEvent) => {
      if (event.key !== null && event.key !== preferenceKey) return;
      setOpen(!isBrowserCredentialGuideCollapsed(apiSlug, scheme.id));
    };

    window.addEventListener("storage", syncStoredPreference);
    return () => window.removeEventListener("storage", syncStoredPreference);
  }, [apiSlug, preferenceKey, scheme.id]);

  return (
    <Collapsible
      asChild
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        persistBrowserCredentialGuideCollapsed(apiSlug, scheme.id, !nextOpen);
      }}
    >
      <Card className="credential-setup-guide" variant="flat">
        <CollapsibleTrigger className="credential-setup-guide-trigger">
          <span className="credential-setup-guide-mark" aria-hidden="true">{badge}</span>
          <span className="credential-setup-guide-heading">
            <strong>{localize(scheme.credentialGuide.title, locale)}</strong>
            <small>{guideCopy.label}</small>
          </span>
          <span className="credential-setup-guide-count">{guideCopy.steps}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="credential-setup-guide-body">
          <ol>
            {scheme.credentialGuide.steps.map((step, index) => (
              <li key={index}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <p>{localize(step, locale)}</p>
              </li>
            ))}
          </ol>
          <footer>
            <Button asChild size="sm" variant="outline">
              <a href={scheme.credentialGuide.url} target="_blank" rel="noreferrer">
                {guideCopy.action}
              </a>
            </Button>
            <p>{guideCopy.safety}</p>
          </footer>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function OAuthToolbar({
  scheme,
  locale,
  requiredScopes,
  state,
  onAuthorize,
  onClear,
  executionRequired = false
}: {
  scheme: Extract<CatalogApi["auth"][number], { type: "oauth2" }>;
  locale: Locale;
  requiredScopes: string[];
  state: OAuthUiState;
  onAuthorize: (input: OAuthAuthorizeInput) => Promise<void>;
  onClear: () => void;
  executionRequired?: boolean;
}) {
  const zh = locale === "zh";
  const flows = Object.keys(scheme.flows ?? {}).filter(
    (flow): flow is OAuthAuthorizeInput["flow"] =>
      flow === "authorizationCode" || flow === "clientCredentials"
  );
  const [flow, setFlow] = useState<OAuthAuthorizeInput["flow"]>(flows[0] ?? "authorizationCode");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUriRegistered, setRedirectUriRegistered] = useState(false);
  const [callbackCopied, setCallbackCopied] = useState(false);
  const flowScopes = scheme.flows?.[flow]?.scopes ?? {};
  const [scopes, setScopes] = useState(requiredScopes);
  const busy = state.status === "authorizing" || state.status === "refreshing";
  const authorized = state.status === "authorized" || state.status === "refreshing";
  const [expanded, setExpanded] = useState(executionRequired && !authorized);
  const requiresRedirectRegistration = flow === "authorizationCode" && Boolean(scheme.credentialGuide);
  const callbackUrl = typeof window === "undefined" ? "/oauth/callback" : `${window.location.origin}/oauth/callback`;
  const callbackCopy = locale === "zh" ? {
    ariaLabel: "OAuth 回调地址登记",
    step: "第一步",
    title: "先登记这个回调地址",
    instruction: "复制完整地址，粘贴到开发者中心应用的 OAuth Redirect URL。",
    copy: "复制地址",
    copied: "已复制",
    warning: "地址必须完全一致；未登记会直接触发 invalid_request。"
  } : {
    ariaLabel: "OAuth callback registration",
    step: "Step 1",
    title: "Register this callback URL first",
    instruction: "Copy the full URL into your app's OAuth Redirect URL in the Developer Center.",
    copy: "Copy URL",
    copied: "Copied",
    warning: "The URL must match exactly; an unregistered URL immediately returns invalid_request."
  };

  const copyCallbackUrl = async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCallbackCopied(true);
      window.setTimeout(() => setCallbackCopied(false), 2_000);
    } catch {
      setCallbackCopied(false);
    }
  };
  const authorizedCopy = locale === "zh"
    ? {
        status: "已授权成功",
        description: "访问令牌已保存在当前浏览器会话中，现在可以直接调试接口。"
      }
    : {
        status: "Authorization successful",
        description: "The access token is saved in this browser session. You can now debug endpoints directly."
      };
  const errorNotice = state.status === "error"
    ? {
        title: locale === "zh" ? "授权未完成" : "Authorization failed",
        description: state.error ?? (locale === "zh" ? "请检查授权配置后重试。" : "Check the authorization configuration and try again.")
      }
    : undefined;

  useEffect(() => {
    if (authorized) setExpanded(false);
    else if (executionRequired) setExpanded(true);
  }, [authorized, executionRequired]);

  if (!flows.length) return null;

  return <>
    {executionRequired && !authorized ? <div
      id="oauth-execution-prerequisite"
      className="oauth-execution-prerequisite"
      role="status"
      aria-live="polite"
    >
      <strong>{zh ? "试用前需完成 OAuth 授权" : "Authorize OAuth before trying this endpoint"}</strong>
      <p>{zh
        ? "请先配置凭证并完成授权；授权成功前不会向供应商发送请求。凭据仅保留在当前浏览器会话。"
        : "Configure credentials and authorize first. No request is sent to the provider until authorization succeeds; credentials stay in this browser session."}</p>
    </div> : null}
    {errorNotice ? <div
      className="oauth-result-notice oauth-result-error"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <span className="oauth-result-mark" aria-hidden="true">!</span>
      <div>
        <strong>{errorNotice.title}</strong>
        <p>{errorNotice.description}</p>
      </div>
    </div> : null}
    <details
      className={`oauth-toolbar${authorized ? " oauth-toolbar-authorized" : ""}`}
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
    <summary className="oauth-toolbar-heading">
      <div>
        <strong>OAuth 2.0</strong>
        {authorized ? <span
          className="oauth-toolbar-heading-status oauth-toolbar-heading-status-success"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="oauth-toolbar-heading-status-mark" aria-hidden="true">✓</span>
          {authorizedCopy.status}
        </span> : <span className="oauth-toolbar-heading-status">{zh ? "会话级授权" : "Session-only authorization"}</span>}
      </div>
      <p>{authorized ? authorizedCopy.description : locale === "zh" ? "配置凭证并授权" : "Configure credentials"}</p>
    </summary>
    <div className="oauth-toolbar-content">
    <div className="oauth-callback-panel" role="note" aria-label={callbackCopy.ariaLabel}>
      <div className="oauth-callback-title"><span>{callbackCopy.step}</span><strong>{callbackCopy.title}</strong></div>
      <p>{callbackCopy.instruction}</p>
      <div className="oauth-callback-value">
        <code>{callbackUrl}</code>
        <button type="button" onClick={() => void copyCallbackUrl()}>{callbackCopied ? callbackCopy.copied : callbackCopy.copy}</button>
      </div>
      <p className="oauth-callback-warning"><strong>OAuth Redirect URL</strong> · {callbackCopy.warning}</p>
    </div>
    {scheme.credentialGuide && <details className="oauth-credential-guide" open>
      <summary>
        <span aria-hidden="true">02</span>
        <strong>{localize(scheme.credentialGuide.title, locale)}</strong>
        <span>{locale === "zh" ? "查看申请步骤" : "View setup steps"}</span>
      </summary>
      <div>
        <ol>{scheme.credentialGuide.steps.map((step, index) => <li key={index}>{localize(step, locale)}</li>)}</ol>
        <a href={scheme.credentialGuide.url} target="_blank" rel="noreferrer">{locale === "zh" ? "打开官方开发者中心 ↗" : "Open Developer Center ↗"}</a>
      </div>
    </details>}
    <div className="oauth-toolbar-fields">
      {flows.length > 1 && <div className="oauth-flow-select">
        <span id="oauth-flow-label">Flow</span>
        <Select value={flow} onValueChange={(selectedFlow) => {
          setFlow(selectedFlow as OAuthAuthorizeInput["flow"]);
          setScopes(requiredScopes);
          setRedirectUriRegistered(false);
        }}>
          <SelectTrigger className="oauth-select-trigger" aria-labelledby="oauth-flow-label">
            <SelectValue>
              {flow === "authorizationCode" ? "Authorization Code" : "Client Credentials"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="oauth-select-content">
            <SelectItem value="authorizationCode">Authorization Code</SelectItem>
            <SelectItem value="clientCredentials">Client Credentials</SelectItem>
          </SelectContent>
        </Select>
      </div>}
      <label>Client ID<input autoComplete="off" value={clientId} onChange={(event) => setClientId(event.target.value)} /></label>
      <label>Client Secret<input type="password" autoComplete="off" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} /></label>
    </div>
    {requiresRedirectRegistration && <label className="oauth-redirect-confirmation"><input type="checkbox" checked={redirectUriRegistered} onChange={(event) => setRedirectUriRegistered(event.target.checked)} /><span>{locale === "zh" ? "我已在开发者中心登记上述回调地址（未登记会触发 invalid_request）" : "I registered the callback URL above in the Developer Center (otherwise authorization returns invalid_request)."}</span></label>}
    {Object.keys(flowScopes).length > 0 && <fieldset><legend>Scopes</legend>{Object.keys(flowScopes).map((scope) => <label key={scope}><input type="checkbox" checked={scopes.includes(scope)} disabled={requiredScopes.includes(scope)} onChange={(event) => setScopes(event.target.checked ? [...scopes, scope] : scopes.filter((item) => item !== scope))} /><code>{scope}</code>{requiredScopes.includes(scope) && <small>{zh ? "必需" : "required"}</small>}</label>)}</fieldset>}
    <div className="oauth-toolbar-actions"><button type="button" disabled={isOAuthAuthorizationDisabled({ busy, clientId, requiresRedirectRegistration, redirectUriRegistered })} onClick={() => void onAuthorize({ schemeName: scheme.id, flow, clientId, clientSecret: clientSecret || undefined, scopes })}>{busy ? zh ? "授权中…" : "Authorizing…" : authorized ? zh ? "重新授权" : "Reauthorize" : zh ? "发起授权" : "Authorize"}</button>{authorized && <button type="button" className="secondary" onClick={onClear}>{zh ? "清除授权" : "Clear authorization"}</button>}<span>{zh ? "client_secret 不会持久化或写入日志" : "client_secret is never persisted or written to logs"}</span></div>
    </div>
    </details>
  </>;
}

type ApiEnvelope<T> =
  | { version: "v1"; data: T }
  | { error: { code: string; message: string; requestId: string } };

type Preview = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  curl: string;
  requiresConfirmation: boolean;
  confirmationToken?: string;
  warnings: string[];
};

type Execution = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
};

export function codeGenScenariosForLocale(locale: Locale): CodeGenScenario[] {
  return [
    { id: "curl", label: "cURL", language: "shell" },
    { id: "typescript-sdk", label: locale === "zh" ? "统一 SDK" : "Unified SDK", language: "typescript" },
    { id: "hub-cli", label: "Pontx Hub CLI", language: "shell" }
  ];
}

function payloadError<T>(payload: ApiEnvelope<T>): string | undefined {
  return "error" in payload ? payload.error.message : undefined;
}

function authPayload(
  auth: AuthData | undefined,
  api: Pick<CatalogApiContext, "auth">
) {
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
  api: Pick<CatalogApiContext, "auth" | "servers" | "slug">,
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
  spec,
  operation,
  initialFavorite = false,
  playgroundHistoryEnabled = false,
  initialPlaygroundHistory = [],
  skillName,
  variant = "reference"
}: {
  locale: Locale;
  api: CatalogApiContext;
  spec: PontxSpec;
  operation: CatalogOperation;
  initialFavorite?: boolean;
  playgroundHistoryEnabled?: boolean;
  initialPlaygroundHistory?: EndpointPlaygroundHistoryEntry[];
  skillName?: string;
  variant?: "guided" | "reference";
}) {
  installPlaygroundSessionStorageBridge();
  const accounts = useAccount();
  const navigate = useNavigate();

  const guided = variant === "guided";
  const [selectedOperation, setSelectedOperation] = useState(operation);
  const activeOperation = guided ? selectedOperation : operation;
  const preferredRequestExample = useMemo(
    () => defaultRequestExample(api, activeOperation),
    [activeOperation, api]
  );
  const [selectedRequestExampleId, setSelectedRequestExampleId] = useState(
    preferredRequestExample?.id
  );
  const [playgroundRevision, setPlaygroundRevision] = useState(0);
  const [historyRefreshVersion, setHistoryRefreshVersion] = useState(0);
  const [playgroundRevealVersion, setPlaygroundRevealVersion] = useState(0);
  const [loadedHistoryEntryId, setLoadedHistoryEntryId] = useState<string>();
  const [preparedRequestExampleKey, setPreparedRequestExampleKey] = useState<string>();
  useEffect(() => {
    setSelectedRequestExampleId(preferredRequestExample?.id);
  }, [activeOperation.slug, preferredRequestExample?.id]);
  const requestExample =
    activeOperation.requestExamples.find(
      (example) => example.id === selectedRequestExampleId
    ) ?? preferredRequestExample;
  const requestExamplePreparationKey = `${activeOperation.method}:${activeOperation.path}:${requestExample?.id ?? "none"}`;
  const pontxApi = useMemo(
    () =>
      pontxApiView(spec, activeOperation, {
        parameterExamples: guided || requestExample ? "required" : "all",
        requestExample
      }),
    [activeOperation, guided, requestExample, spec]
  );
  const playgroundAvailability = getPlaygroundAvailability(activeOperation, locale);
  const approvedOperationServers = activeOperation.serverIds.length
    ? api.servers.filter((server) => activeOperation.serverIds.includes(server.id))
    : api.servers;
  const operationServers = requestExample?.request.serverId
    ? [...approvedOperationServers].sort((left, right) =>
        left.id === requestExample.request.serverId
          ? -1
          : right.id === requestExample.request.serverId
            ? 1
            : 0
      )
    : approvedOperationServers;
  const [isHydrated, setIsHydrated] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<PlaygroundExecutionResult>();
  const [isExecuting, setIsExecuting] = useState(false);
  const oauthScheme = api.auth.find((scheme) => scheme.type === "oauth2");
  const credentialGuideSchemes = useMemo(() => {
    if (!guided) return [];
    const requiredSchemeIds = new Set(
      activeOperation.security?.map((requirement) => requirement.schemeId) ?? []
    );
    return api.auth.filter(
      (scheme): scheme is GuidedCredentialScheme =>
        scheme.type !== "oauth2" &&
        hasCredentialGuide(scheme) &&
        requiredSchemeIds.has(scheme.id)
    );
  }, [activeOperation.security, api.auth, guided]);
  const tokenStorageKey = `pontx:oauth:token:${api.slug}:${oauthScheme?.id ?? "oauth2"}`;
  const [oauthToken, setOAuthToken] = useState<OAuthTokenSet>();
  const [oauthCredentials, setOAuthCredentials] = useState<OAuthClientCredentials>();
  const [oauthState, setOAuthState] = useState<OAuthUiState>({ status: "idle" });
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(guided);
  const playgroundApi = useMemo(
    () => withoutHostManagedOAuthScheme(
      pontxApi,
      oauthScheme?.flows ? oauthScheme.id : undefined
    ),
    [oauthScheme?.flows, oauthScheme?.id, pontxApi]
  );
  const oauthExecutionBlocked = isOAuthExecutionBlocked({
    schemeId: oauthScheme?.id,
    hasSupportedFlow: Boolean(oauthScheme?.flows),
    operationSecurity: activeOperation.security,
    executionEnabled: playgroundAvailability.executionEnabled,
    accessToken: oauthToken?.accessToken
  });

  useEffect(() => {
    if (
      !isPlaygroundOpen ||
      !oauthExecutionBlocked ||
      !window.matchMedia("(max-width: 760px)").matches
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById("oauth-execution-prerequisite")
        ?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isPlaygroundOpen, oauthExecutionBlocked]);

  useEffect(() => {
    if (!requestExample) {
      setPreparedRequestExampleKey(requestExamplePreparationKey);
      return;
    }
    const configKey = `playground:${activeOperation.method}:${activeOperation.path}:params`;
    if (!window.sessionStorage.getItem(configKey)) {
      const server = api.servers.find(
        (candidate) => candidate.id === requestExample.request.serverId
      ) ?? operationServers[0];
      window.sessionStorage.setItem(
        configKey,
        JSON.stringify(
          storedConfigForRequestExample(requestExample, undefined, server?.url ?? "")
        )
      );
      if (server) {
        window.sessionStorage.setItem(
          `playground:spec:${api.slug}:baseUrl`,
          server.url
        );
      }
    }
    setPreparedRequestExampleKey(requestExamplePreparationKey);
  }, [
    activeOperation.method,
    activeOperation.path,
    api.servers,
    api.slug,
    operationServers[0]?.url,
    requestExample,
    requestExamplePreparationKey
  ]);

  const applyRequestExample = useCallback((exampleId: string) => {
    const example = activeOperation.requestExamples.find(
      (candidate) => candidate.id === exampleId
    );
    if (!example) return;
    const configKey = `playground:${activeOperation.method}:${activeOperation.path}:params`;
    let previous: Record<string, unknown> | undefined;
    try {
      previous = JSON.parse(window.sessionStorage.getItem(configKey) ?? "null") as
        | Record<string, unknown>
        | undefined;
    } catch {
      previous = undefined;
    }
    const server = api.servers.find(
      (candidate) => candidate.id === example.request.serverId
    ) ?? operationServers[0];
    window.sessionStorage.setItem(
      configKey,
      JSON.stringify(
        storedConfigForRequestExample(example, previous, server?.url ?? "")
      )
    );
    if (server) {
      window.sessionStorage.setItem(
        `playground:spec:${api.slug}:baseUrl`,
        server.url
      );
    }
    setSelectedRequestExampleId(example.id);
    setLoadedHistoryEntryId(undefined);
    setExecutionResult(undefined);
    setPlaygroundRevision((revision) => revision + 1);
  }, [activeOperation, api.servers, api.slug, operationServers]);

  const previewRequestExample = useCallback((exampleId: string) => {
    applyRequestExample(exampleId);
    setIsPlaygroundOpen(true);
    setPlaygroundRevealVersion((version) => version + 1);
  }, [applyRequestExample]);

  const replayPlaygroundHistory = useCallback(
    (entry: EndpointPlaygroundHistoryEntry) => {
      const server = operationServers.find(
        (candidate) => candidate.id === entry.serverId
      );
      if (!server) throw new Error("history_server_unavailable");
      const configKey =
        `playground:${activeOperation.method}:${activeOperation.path}:params`;
      let auth: unknown;
      try {
        const previous = JSON.parse(
          window.sessionStorage.getItem(configKey) ?? "{}"
        ) as { auth?: unknown };
        auth = previous.auth;
      } catch {
        auth = undefined;
      }
      window.sessionStorage.setItem(
        configKey,
        JSON.stringify(
          storedConfigForPlaygroundHistory(
            {
              serverUrl: server.url,
              pathValues: entry.pathValues,
              queryValues: entry.queryValues,
              headerValues: entry.headerValues,
              requestBody: entry.requestBody,
              hasRequestBody: entry.hasRequestBody
            },
            auth ? { auth } : undefined
          )
        )
      );
      window.sessionStorage.setItem(
        `playground:spec:${api.slug}:baseUrl`,
        server.url
      );
      setExecutionResult(undefined);
      setIsPlaygroundOpen(true);
      setLoadedHistoryEntryId(entry.id);
      setPlaygroundRevision((revision) => revision + 1);
      setPlaygroundRevealVersion((version) => version + 1);
    },
    [activeOperation.method, activeOperation.path, api.slug, operationServers]
  );

  useEffect(() => {
    if (!playgroundRevealVersion) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector('[data-testid="playground-panel"]')
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [playgroundRevealVersion, playgroundRevision]);

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

  const execute = useCallback(
    async (request: PlaygroundRequest) => {
      setIsExecuting(true);
      setExecutionResult(undefined);
      try {
        if (oauthExecutionBlocked) {
          trackPlaygroundRequest({
            apiSlug: api.slug,
            operationSlug: activeOperation.slug,
            mode: playgroundAvailability.executionEnabled ? "execute" : "preview_only",
            outcome: "blocked",
            blocker: "oauth"
          });
          setExecutionResult({
            status: 401,
            statusText: locale === "zh" ? "需要先完成 OAuth 授权" : "OAuth authorization required",
            headers: {},
            body: {
              error: locale === "zh"
                ? "请先在 Playground 的 OAuth 配置中完成授权，再发送调试请求。"
                : "Complete OAuth authorization in the Playground before sending a debug request."
            },
            duration: 0
          });
          return;
        }
        const unresolved = unresolvedRequestInputs(request, requestExample);
        if (unresolved.length) {
          trackPlaygroundRequest({
            apiSlug: api.slug,
            operationSlug: activeOperation.slug,
            mode: playgroundAvailability.executionEnabled ? "execute" : "preview_only",
            outcome: "blocked",
            blocker: "dynamic_input"
          });
          setExecutionResult({
            status: 422,
            statusText:
              locale === "zh" ? "需要补充动态输入" : "Dynamic input required",
            headers: {},
            body: {
              error:
                locale === "zh"
                  ? "请补充成功请求示例中列出的动态输入后再继续。"
                  : "Complete the dynamic inputs listed by the successful request example before continuing.",
              inputs: unresolved.map(requestExampleInputLabel)
            },
            duration: 0
          });
          return;
        }
        const requestBody = hubRequestPayload(request, api, activeOperation);
        const preview = await postHub<Preview>(
          "/api/v1/playground/preview",
          requestBody
        );
        trackPlaygroundRequest({
          apiSlug: api.slug,
          operationSlug: activeOperation.slug,
          mode: playgroundAvailability.executionEnabled ? "execute" : "preview_only",
          outcome: "previewed"
        });
        if (!playgroundAvailability.executionEnabled) {
          setExecutionResult({
            status: 0,
            statusText: locale === "zh" ? "请求预览" : "Request preview",
            headers: preview.headers,
            body: {
              method: preview.method,
              url: preview.url,
              body: preview.body,
              curl: preview.curl,
              warnings: preview.warnings
            },
            duration: 0
          });
          return;
        }
        if (
          preview.requiresConfirmation &&
          !window.confirm(
            locale === "zh"
              ? "此请求会修改供应商数据。确认发送刚才预演的请求？"
              : "This request changes provider data. Send the exact request you previewed?"
          )
        ) {
          trackPlaygroundRequest({
            apiSlug: api.slug,
            operationSlug: activeOperation.slug,
            mode: "execute",
            outcome: "cancelled"
          });
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
        setHistoryRefreshVersion((version) => version + 1);
        trackPlaygroundRequest({
          apiSlug: api.slug,
          operationSlug: activeOperation.slug,
          mode: "execute",
          outcome: "succeeded"
        });
      } catch (error) {
        trackPlaygroundRequest({
          apiSlug: api.slug,
          operationSlug: activeOperation.slug,
          mode: playgroundAvailability.executionEnabled ? "execute" : "preview_only",
          outcome: "failed"
        });
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
    [
      activeOperation,
      api,
      locale,
      playgroundAvailability.executionEnabled,
      oauthExecutionBlocked,
      requestExample
    ]
  );

  const getCodeGenScenarios = useCallback(
    () => codeGenScenariosForLocale(locale).filter(
      (scenario) =>
        scenario.id !== "typescript-sdk" ||
        supportsSdkOperation(api, activeOperation)
    ),
    [activeOperation, api, locale]
  );
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
      ? "此接口暂不支持在线调试"
      : "This endpoint is not available for interactive debugging";
  const playgroundAvailable = playgroundAvailability.executionEnabled;
  const showOAuthConfiguration = Boolean(
    oauthScheme?.flows &&
    activeOperation.security?.some((requirement) => requirement.schemeId === oauthScheme.id) &&
    (guided || isPlaygroundOpen)
  );
  const standaloneCredentialGuideSchemes = getStandaloneCredentialGuideSchemes({
    auth: api.auth,
    operationSecurity: activeOperation.security,
    guided,
    playgroundAvailable,
    handledOAuthSchemeId: showOAuthConfiguration ? oauthScheme?.id : undefined
  });
  const category =
    locale === "zh"
      ? ({ Finance: "金融", Productivity: "效率工具" } as Record<
          string,
          string
        >)[api.category] ?? api.category
      : api.category;
  const workspaceCopy = apiWorkspaceNavigationCopy(locale);

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
      <ResourceNavigation
        locale={locale}
        api={api}
        active={guided ? "overview" : "docs"}
        skillName={skillName}
      />
      {guided ? (
        <header className="api-overview-hero">
          <div className="api-overview-intro">
            <p className="eyebrow">{api.provider} / {category}</p>
            <h1>{localize(api.title, locale)}</h1>
            <p>{localize(api.summary, locale)}</p>
            <ApiOverviewActions
              locale={locale}
              apiSlug={api.slug}
              operationSlug={activeOperation.slug}
              quickCallAction={quickCallAction}
              skillName={skillName}
            />
          </div>
          <ApiOverviewFacts
            locale={locale}
            api={api}
            operationSlug={activeOperation.slug}
          />
        </header>
      ) : null}
      <div className="pontx-workspace" id={guided ? "quick-call" : undefined}>
      {!guided ? <aside
        className="pontx-workspace-directory"
        aria-label={locale === "zh" ? "API 参考目录" : "API reference directory"}
      >
        <ResourceDirectoryNavigation
          locale={locale}
          api={api}
          spec={spec}
          activeOperation={activeOperation}
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
            <OperationTaskSelect
              locale={locale}
              apiSlug={api.slug}
              operations={api.operations}
              value={activeOperation.slug}
              onValueChange={(selectedSlug) => {
                const candidate = api.operations.find((item) => item.slug === selectedSlug);
                if (candidate && "parameters" in candidate) {
                  setSelectedOperation(candidate);
                  setSelectedRequestExampleId(
                    defaultRequestExample(api, candidate)?.id
                  );
                  setExecutionResult(undefined);
                } else if (candidate) {
                  navigate(`/${locale}/apis/${api.slug}/${candidate.slug}`);
                }
              }}
            />
            <Link className="api-full-docs-link" to={`/${locale}/apis/${api.slug}/${activeOperation.slug}`}>
              {workspaceCopy.openSelectedEndpoint}<span aria-hidden="true">→</span>
            </Link>
          </> : <>
            <div>
              <span>{api.provider}</span>
              <b>/</b>
              <code>{activeOperation.operationId}</code>
            </div>
            <div className="pontx-workspace-bar-actions">
              <p>
                {!playgroundAvailability.executionEnabled
                  ? locale === "zh" ? "暂不支持在线调用 · 原因见下方" : "Online calls unavailable · details below"
                  : api.sdkStatus === "published" ? <Link to={`/${locale}/sdks/${api.slug}`}>SDK / CLI →</Link> : locale === "zh"
                ? "调试经 Hub 代理 · 凭证仅保留当前会话"
                : "Hub-proxied execution · credentials stay in this session"}
              </p>
              <FavoriteEndpointButton
                apiSlug={api.slug}
                operationSlug={activeOperation.slug}
                endpointLabel={localize(activeOperation.title, locale)}
                locale={locale}
                initialFavorite={initialFavorite}
                compact
              />
            </div>
          </>}
        </div>
        <div
          className="pontx-workspace-body"
          data-oauth-execution-blocked={oauthExecutionBlocked || undefined}
        >
          {standaloneCredentialGuideSchemes.length ? (
            <div
              className="playground-context-stack credential-guide-standalone"
              data-credential-guide-placement="workspace"
            >
              {standaloneCredentialGuideSchemes.map((scheme) => (
                <CredentialSetupGuide
                  key={`${api.slug}:${scheme.id}:standalone`}
                  apiSlug={api.slug}
                  scheme={scheme}
                  locale={locale}
                />
              ))}
            </div>
          ) : null}
          {isHydrated && !guided ? (
            <h1 className="pontx-hydrated-title">
              {localize(activeOperation.title, locale)} — {api.name}
            </h1>
          ) : null}
          {isHydrated && showOAuthConfiguration ? (
            oauthScheme?.flows ? <OAuthToolbar
              scheme={oauthScheme}
              locale={locale}
              requiredScopes={activeOperation.security?.find((item) => item.schemeId === oauthScheme.id)?.scopes ?? []}
              state={oauthState}
              onAuthorize={authorizeOAuth}
              onClear={clearOAuth}
              executionRequired={oauthExecutionBlocked}
            /> : null
          ) : null}
          {isHydrated && preparedRequestExampleKey === requestExamplePreparationKey ? (
            <>
              {!guided || !playgroundAvailability.executionEnabled ? (
                <DocumentationEvidence locale={locale} api={api} operation={activeOperation} />
              ) : null}
              {requestExample ? (
                <RequestExampleNotice
                  locale={locale}
                  api={api}
                  operation={activeOperation}
                  example={requestExample}
                  selectedId={requestExample.id}
                  executionUnavailable={!playgroundAvailability.executionEnabled}
                  onSelect={applyRequestExample}
                  onPreview={
                    playgroundAvailable
                      ? () => previewRequestExample(requestExample.id)
                      : undefined
                  }
                />
              ) : null}
              <Suspense fallback={
                <div className="pontx-documentation-loading" role="status">
                  {locale === "zh" ? "正在加载交互式文档…" : "Loading interactive documentation…"}
                </div>
              }>
              <LazyApiDocumentation
              key={`${locale}:${api.slug}:${activeOperation.slug}:${requestExample?.id ?? "inferred"}:${playgroundRevision}:${oauthToken?.accessToken ?? "anonymous"}`}
              locale={locale === "zh" ? "zh-CN" : "en"}
              api={playgroundApi}
              enablePlayground={playgroundAvailable}
              defaultPlaygroundVisible={
                playgroundAvailable && (guided || isPlaygroundOpen)
              }
              playgroundTopContent={
                credentialGuideSchemes.length ||
                (!guided && (playgroundHistoryEnabled || Boolean(accounts.viewer))) ? (
                  <div className="playground-context-stack">
                    {credentialGuideSchemes.map((scheme) => (
                      <CredentialSetupGuide
                        key={`${api.slug}:${scheme.id}`}
                        apiSlug={api.slug}
                        scheme={scheme}
                        locale={locale}
                      />
                    ))}
                    {!guided && (playgroundHistoryEnabled || Boolean(accounts.viewer)) ? (
                      <EndpointPlaygroundHistory
                        locale={locale}
                        apiSlug={api.slug}
                        operationSlug={activeOperation.slug}
                        availableServerIds={operationServers.map((server) => server.id)}
                        initialEntries={initialPlaygroundHistory}
                        refreshVersion={historyRefreshVersion}
                        loadedEntryId={loadedHistoryEntryId}
                        onReplay={replayPlaygroundHistory}
                      />
                    ) : null}
                  </div>
                ) : undefined
              }
              specName={api.slug}
              servers={operationServers.map((server) => ({
                url: server.url,
                description: localize(server.description, locale)
              }))}
              onExecute={playgroundAvailability.executionEnabled ? execute : undefined}
              onPlaygroundStateChange={(state) => setIsPlaygroundOpen(state.isOpen)}
              executionResult={executionResult}
              isExecuting={isExecuting}
              executeDisabled={oauthExecutionBlocked}
              executeDisabledReason={
                oauthExecutionBlocked
                  ? locale === "zh"
                    ? "请先完成 OAuth 授权"
                    : "Complete OAuth authorization first"
                  : undefined
              }
              {...({
                onOAuthAuthorize: authorizeOAuth,
                onOAuthClear: clearOAuth,
                oauthState,
                oauthAccessToken: oauthToken?.accessToken,
                oauthRequiredScopes: activeOperation.security?.find((item) => item.schemeId === oauthScheme?.id)?.scopes ?? []
              } as Record<string, unknown>)}
              getCodeGenScenarios={getCodeGenScenarios}
              onGenerateCode={generateCode}
              className={`pontx-documentation${guided && playgroundAvailable ? " pontx-documentation-guided" : ""}`}
              />
              </Suspense>
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
