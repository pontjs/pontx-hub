import { useEffect, useMemo, useState } from "react";
import type {
  CatalogApi,
  CatalogOperation,
  Locale
} from "~/lib/catalog/types";

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
  proxyEnabled: boolean;
  warnings: string[];
};

type Execution = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
};

function getError<T>(payload: ApiEnvelope<T>): string | undefined {
  return "error" in payload ? payload.error.message : undefined;
}

export function PlaygroundPanel({
  locale,
  api,
  operation
}: {
  locale: Locale;
  api: CatalogApi;
  operation: CatalogOperation;
}) {
  const zh = locale === "zh";
  const pathParameters = operation.parameters.filter((item) => item.in === "path");
  const queryParameters = operation.parameters.filter((item) => item.in === "query");
  const bodyParameter = operation.parameters.find((item) => item.in === "body");
  const authScheme = api.auth[0];
  const credentialKey = `pontx-hub:credential:${api.slug}:${authScheme?.id ?? "none"}`;

  const initialPath = useMemo(
    () =>
      Object.fromEntries(
        pathParameters.map((parameter) => [
          parameter.name,
          parameter.example === undefined ? "" : String(parameter.example)
        ])
      ),
    [operation.slug]
  );
  const initialQuery = useMemo(
    () =>
      Object.fromEntries(
        queryParameters.map((parameter) => [
          parameter.name,
          parameter.example === undefined ? "" : String(parameter.example)
        ])
      ),
    [operation.slug]
  );

  const [path, setPath] = useState<Record<string, string>>(initialPath);
  const [query, setQuery] = useState<Record<string, string>>(initialQuery);
  const [body, setBody] = useState(
    bodyParameter?.example === undefined
      ? ""
      : JSON.stringify(bodyParameter.example, null, 2)
  );
  const [credential, setCredential] = useState("");
  const [preview, setPreview] = useState<Preview>();
  const [execution, setExecution] = useState<Execution>();
  const [snippet, setSnippet] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCredential(sessionStorage.getItem(credentialKey) ?? "");
  }, [credentialKey]);

  function authPayload() {
    if (!authScheme || !credential) return undefined;
    if (authScheme.type === "apiKey") {
      return { type: "apiKey" as const, schemeId: authScheme.id, value: credential };
    }
    if (authScheme.type === "bearer" || authScheme.type === "oauth2") {
      return {
        type: authScheme.type,
        schemeId: authScheme.id,
        token: credential
      };
    }
    const [username = "", password = ""] = credential.split(":", 2);
    return {
      type: "basic" as const,
      schemeId: authScheme.id,
      username,
      password
    };
  }

  function requestPayload() {
    let parsedBody: unknown = undefined;
    if (body.trim()) {
      parsedBody = JSON.parse(body);
    }
    return {
      apiSlug: api.slug,
      operationSlug: operation.slug,
      serverId: api.servers[0].id,
      path,
      query,
      headers: {},
      body: parsedBody,
      auth: authPayload()
    };
  }

  async function requestPreview() {
    setBusy(true);
    setError("");
    setExecution(undefined);
    try {
      if (credential) sessionStorage.setItem(credentialKey, credential);
      else sessionStorage.removeItem(credentialKey);
      const response = await fetch("/api/v1/playground/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload())
      });
      const payload = (await response.json()) as ApiEnvelope<Preview>;
      const message = getError(payload);
      if (message) throw new Error(message);
      if ("data" in payload) setPreview(payload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function execute() {
    if (!preview) return;
    if (
      preview.requiresConfirmation &&
      !window.confirm(
        zh
          ? "此请求会修改供应商数据。确认发送刚才预演的请求？"
          : "This request changes provider data. Send the exact request you previewed?"
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/playground/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...requestPayload(),
          confirmationToken: preview.confirmationToken
        })
      });
      const payload = (await response.json()) as ApiEnvelope<Execution>;
      const message = getError(payload);
      if (message) throw new Error(message);
      if ("data" in payload) setExecution(payload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Execution failed");
    } finally {
      setBusy(false);
    }
  }

  async function generateSnippet() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/codegen/snippet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload())
      });
      const payload = (await response.json()) as ApiEnvelope<{ code: string }>;
      const message = getError(payload);
      if (message) throw new Error(message);
      if ("data" in payload) setSnippet(payload.data.code);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Code generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="playground" aria-labelledby="playground-title">
      <h2 id="playground-title">{zh ? "请求预演" : "Request preview"}</h2>
      <p className="playground-note">
        {zh
          ? "凭证只保存在当前浏览器会话中。服务器不会持久化请求或响应内容。"
          : "Credentials remain in this browser session. Request and response bodies are not persisted."}
      </p>

      <div className="form-grid">
        {pathParameters.map((parameter) => (
          <div className="field" key={`path-${parameter.name}`}>
            <label htmlFor={`path-${parameter.name}`}>
              {parameter.name} · path{parameter.required ? " *" : ""}
            </label>
            <input
              id={`path-${parameter.name}`}
              value={path[parameter.name] ?? ""}
              onChange={(event) =>
                setPath((current) => ({
                  ...current,
                  [parameter.name]: event.target.value
                }))
              }
            />
          </div>
        ))}
        {queryParameters.map((parameter) => (
          <div className="field" key={`query-${parameter.name}`}>
            <label htmlFor={`query-${parameter.name}`}>
              {parameter.name} · query{parameter.required ? " *" : ""}
            </label>
            <input
              id={`query-${parameter.name}`}
              value={query[parameter.name] ?? ""}
              onChange={(event) =>
                setQuery((current) => ({
                  ...current,
                  [parameter.name]: event.target.value
                }))
              }
            />
          </div>
        ))}
        {bodyParameter ? (
          <div className="field">
            <label htmlFor="request-body">body · JSON *</label>
            <textarea
              id="request-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              spellCheck={false}
            />
          </div>
        ) : null}
        {authScheme ? (
          <div className="field">
            <label htmlFor="credential">
              {authScheme.type === "basic" ? "username:password" : authScheme.type}
            </label>
            <input
              id="credential"
              type="password"
              value={credential}
              autoComplete="off"
              onChange={(event) => setCredential(event.target.value)}
              placeholder={
                authScheme.type === "basic"
                  ? "username:password"
                  : "••••••••••••••••"
              }
            />
          </div>
        ) : null}
      </div>

      <div className="playground-actions">
        <button className="button button-dark" disabled={busy} onClick={requestPreview}>
          {busy ? "…" : zh ? "生成预演" : "Preview"}
        </button>
        {preview?.proxyEnabled ? (
          <button className="button button-acid" disabled={busy} onClick={execute}>
            {preview.requiresConfirmation
              ? zh
                ? "确认并发送"
                : "Confirm & send"
              : zh
                ? "发送请求"
                : "Send request"}
          </button>
        ) : null}
        {preview ? (
          <button className="button" disabled={busy} onClick={generateSnippet}>
            {zh ? "生成 SDK 代码" : "Generate SDK code"}
          </button>
        ) : null}
      </div>

      {error ? <p className="warning">{error}</p> : null}
      {preview ? (
        <div className="result-panel">
          <h3>{zh ? "脱敏请求" : "Redacted request"}</h3>
          {preview.warnings.map((warning) => (
            <p className="warning" key={warning}>
              {warning}
            </p>
          ))}
          <pre className="code-block">
            <code>{preview.curl}</code>
          </pre>
        </div>
      ) : null}
      {execution ? (
        <div className="result-panel">
          <h3>
            HTTP {execution.status} · {execution.durationMs} ms
          </h3>
          <pre className="code-block">
            <code>{JSON.stringify(execution.body, null, 2)}</code>
          </pre>
        </div>
      ) : null}
      {snippet ? (
        <div className="result-panel">
          <h3>TypeScript SDK</h3>
          <pre className="code-block">
            <code>{snippet}</code>
          </pre>
        </div>
      ) : null}
    </aside>
  );
}
