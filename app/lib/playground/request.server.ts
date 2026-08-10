import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import type { CatalogAuthScheme, CatalogOperation } from "~/lib/catalog/types";
import type {
  PlaygroundPreview,
  PlaygroundRequestInput,
  PreparedRequest
} from "./schemas";
import { createConfirmationToken } from "./token.server";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const FORBIDDEN_HEADERS = new Set([
  "connection",
  "content-length",
  "cookie",
  "forwarded",
  "host",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto"
]);

function resolvePath(
  template: string,
  operation: CatalogOperation,
  values: Record<string, string | number | boolean>
): string {
  return template.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const parameter = operation.parameters.find(
      (item) => item.in === "path" && item.name === name
    );
    const value = values[name];
    if (!parameter || value === undefined || value === "") {
      throw new Error(`Missing required path parameter: ${name}`);
    }
    return encodeURIComponent(String(value));
  });
}

function applyAuth(
  scheme: CatalogAuthScheme,
  input: NonNullable<PlaygroundRequestInput["auth"]>,
  url: URL,
  headers: Record<string, string>
): void {
  if (scheme.id !== input.schemeId || scheme.type !== input.type) {
    throw new Error("Authentication input does not match the selected scheme");
  }

  if (scheme.type === "apiKey" && input.type === "apiKey") {
    if (scheme.in === "header") headers[scheme.name] = input.value;
    else url.searchParams.set(scheme.name, input.value);
    return;
  }

  if (
    (scheme.type === "bearer" || scheme.type === "oauth2") &&
    (input.type === "bearer" || input.type === "oauth2")
  ) {
    headers.Authorization = `Bearer ${input.token}`;
    return;
  }

  if (scheme.type === "basic" && input.type === "basic") {
    headers.Authorization = `Basic ${Buffer.from(
      `${input.username}:${input.password}`
    ).toString("base64")}`;
  }
}

function serializeBody(
  body: unknown,
  contentType: CatalogOperation["contentType"]
): string | undefined {
  if (body === undefined || body === null || body === "") return undefined;
  if (contentType === "application/x-www-form-urlencoded") {
    if (typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Form body must be an object");
    }
    return new URLSearchParams(
      Object.entries(body as Record<string, unknown>).map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value)
      ])
    ).toString();
  }
  return JSON.stringify(body);
}

export function prepareRequest(input: PlaygroundRequestInput): PreparedRequest {
  const match = getCatalogOperation(input.apiSlug, input.operationSlug);
  if (!match) throw new Error("Catalog operation not found");
  const { api, operation } = match;
  const server = api.servers.find((item) => item.id === input.serverId);
  if (!server) throw new Error("Server is not approved for this API");
  if (operation.serverIds.length && !operation.serverIds.includes(server.id)) {
    throw new Error("Server is not approved for this endpoint");
  }

  const resolvedPath = resolvePath(operation.path, operation, input.path);
  const url = new URL(
    resolvedPath.replace(/^\/+/, ""),
    `${server.url.replace(/\/$/, "")}/`
  );

  for (const [name, value] of Object.entries(input.query)) {
    const parameter = operation.parameters.find(
      (item) => item.in === "query" && item.name === name
    );
    if (!parameter) throw new Error(`Undeclared query parameter: ${name}`);
    if (value !== "") url.searchParams.set(name, String(value));
  }
  for (const parameter of operation.parameters) {
    if (
      parameter.in === "query" &&
      parameter.required &&
      (input.query[parameter.name] === undefined ||
        input.query[parameter.name] === "")
    ) {
      throw new Error(`Missing required query parameter: ${parameter.name}`);
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "Pontx-Hub-Playground/0.1",
    ...operation.proxyHeaders
  };
  for (const [name, value] of Object.entries(input.headers)) {
    const normalizedName = name.toLowerCase();
    const parameter = operation.parameters.find(
      (item) => item.in === "header" && item.name.toLowerCase() === normalizedName
    );
    if (!parameter || FORBIDDEN_HEADERS.has(normalizedName)) {
      throw new Error(`Header is not allowed: ${name}`);
    }
    headers[parameter.name] = value;
  }
  for (const parameter of operation.parameters) {
    if (
      parameter.in === "header" &&
      parameter.required &&
      input.headers[parameter.name] === undefined
    ) {
      throw new Error(`Missing required header parameter: ${parameter.name}`);
    }
  }

  if (input.auth) {
    const scheme = api.auth.find((item) => item.id === input.auth?.schemeId);
    if (!scheme) throw new Error("Authentication scheme not found");
    applyAuth(scheme, input.auth, url, headers);
  }

  const bodyParameter = operation.parameters.find((item) => item.in === "body");
  if (!bodyParameter && input.body !== undefined) {
    throw new Error("Request body is not declared for this operation");
  }
  if (
    bodyParameter?.required &&
    (input.body === undefined || input.body === null || input.body === "")
  ) {
    throw new Error("Missing required request body");
  }
  const body = serializeBody(input.body, operation.contentType);
  if (body !== undefined) {
    if (Buffer.byteLength(body) > 2 * 1024 * 1024) {
      throw new Error("Request body exceeds the 2 MiB limit");
    }
    headers["Content-Type"] = operation.contentType ?? "application/json";
  }

  return {
    apiSlug: api.slug,
    operationSlug: operation.slug,
    method: operation.method,
    url: url.toString(),
    headers,
    body,
    proxyEnabled: api.proxyEnabled
  };
}

function redactHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      /authorization|api[-_]?key|token|secret/i.test(name)
        ? value.startsWith("Bearer ")
          ? "Bearer ••••••••"
          : "••••••••"
        : value
    ])
  );
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function createPreview(input: PlaygroundRequestInput): PlaygroundPreview {
  const prepared = prepareRequest(input);
  const redactedHeaders = redactHeaders(prepared.headers);
  const curlParts = [
    "curl",
    "-X",
    prepared.method,
    shellQuote(prepared.url),
    ...Object.entries(redactedHeaders).flatMap(([name, value]) => [
      "-H",
      shellQuote(`${name}: ${value}`)
    ])
  ];
  if (prepared.body) curlParts.push("--data", shellQuote(prepared.body));

  const requiresConfirmation = WRITE_METHODS.has(prepared.method);
  return {
    method: prepared.method,
    url: prepared.url,
    headers: redactedHeaders,
    body: input.body,
    curl: curlParts.join(" \\\n  "),
    requiresConfirmation,
    confirmationToken: requiresConfirmation
      ? createConfirmationToken(prepared)
      : undefined,
    proxyEnabled: prepared.proxyEnabled,
    warnings: [
      ...(requiresConfirmation
        ? ["This request changes provider state and requires explicit confirmation."]
        : []),
      ...(!prepared.proxyEnabled
        ? ["This provider is configured for preview-only mode."]
        : [])
    ]
  };
}
