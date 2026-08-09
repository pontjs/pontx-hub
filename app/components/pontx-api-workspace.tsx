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
import { OperationSeoContent } from "~/components/operation-seo-content";

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

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
            {locale === "zh"
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
          <ApiDocumentation
            key={`${locale}:${api.slug}:${operation.slug}`}
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
            getCodeGenScenarios={getCodeGenScenarios}
            onGenerateCode={generateCode}
            className="pontx-documentation"
          />
        ) : (
          <OperationSeoContent locale={locale} api={api} operation={operation} />
        )}
      </section>
    </main>
  );
}
