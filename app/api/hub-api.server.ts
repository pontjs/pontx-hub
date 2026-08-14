import { createHash } from "node:crypto";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  getCatalogApi,
  getCatalogOperation,
  getCatalogSchema,
  listCatalogSummaries,
  searchCatalog,
  searchCatalogOperations
} from "~/lib/catalog/catalog.server";
import {
  isLocale,
  type GlobalSearchKind
} from "~/lib/catalog/types";
import {
  generateSdkSnippet,
  SdkCodegenUnavailableError
} from "~/lib/sdk-codegen";
import { assertPublicHost } from "~/lib/playground/network.server";
import { createPreview, prepareRequest } from "~/lib/playground/request.server";
import {
  playgroundExecuteSchema,
  playgroundRequestSchema,
  type PlaygroundExecuteInput
} from "~/lib/playground/schemas";
import { verifyConfirmationToken } from "~/lib/playground/token.server";
import { skillBundle } from "~/lib/skill-bundle.server";
import {
  consumeExecutionQuota,
  executionClientId
} from "~/lib/playground/rate-limit.server";
import { oauthTokenRequestSchema } from "~/lib/oauth/schemas";
import { exchangeOAuthToken } from "~/lib/oauth/token.server";
import { consumeOAuthQuota } from "~/lib/oauth/rate-limit.server";
import { recordPlaygroundHistory } from "~/lib/accounts/playground-history.server";

type ErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

const RESPONSE_LIMIT = 5 * 1024 * 1024;
const RESPONSE_HEADERS = new Set([
  "content-type",
  "content-language",
  "cache-control",
  "etag",
  "last-modified",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
  "retry-after"
]);

function requestId(): string {
  return crypto.randomUUID();
}

function jsonError(
  code: string,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 502 | 503
) {
  const body: ErrorBody = {
    error: { code, message, requestId: requestId() }
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function etag(value: unknown): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(value))
    .digest("base64url");
  return `"${digest}"`;
}

function cacheableJson(request: Request, value: unknown): Response {
  const tag = etag(value);
  if (request.headers.get("if-none-match") === tag) {
    return new Response(null, { status: 304, headers: { ETag: tag } });
  }
  return Response.json(value, {
    headers: {
      ETag: tag,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1500"
    }
  });
}

function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (origin !== new URL(request.url).origin) {
    throw new HTTPException(403, { message: "Cross-origin execution is denied" });
  }
}

async function readLimitedResponse(response: Response): Promise<unknown> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > RESPONSE_LIMIT) {
      await reader.cancel();
      throw new HTTPException(413, {
        message: "Provider response exceeds the 5 MiB capture limit"
      });
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

async function executeProviderRequest(input: PlaygroundExecuteInput) {
  const prepared = prepareRequest(input);
  if (!prepared.proxyEnabled) {
    throw new HTTPException(403, {
      message: "This API is configured for preview-only mode"
    });
  }

  const requiresConfirmation = ["POST", "PUT", "PATCH", "DELETE"].includes(
    prepared.method
  );
  if (
    requiresConfirmation &&
    (!input.confirmationToken ||
      !verifyConfirmationToken(input.confirmationToken, prepared))
  ) {
    throw new HTTPException(409, {
      message: "A valid preview confirmation is required for write operations"
    });
  }

  const target = new URL(prepared.url);
  await assertPublicHost(target.hostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const startedAt = performance.now();

  try {
    const response = await fetch(target, {
      method: prepared.method,
      headers: prepared.headers,
      body: prepared.body,
      redirect: "manual",
      signal: controller.signal
    });

    if (response.status >= 300 && response.status < 400) {
      throw new HTTPException(502, {
        message: "Provider redirects are not followed by the Playground"
      });
    }

    const body = await readLimitedResponse(response);
    const headers = Object.fromEntries(
      [...response.headers.entries()].filter(([name]) =>
        RESPONSE_HEADERS.has(name.toLowerCase())
      )
    );

    return {
      status: response.status,
      statusText: response.statusText,
      headers,
      body,
      durationMs: Math.round(performance.now() - startedAt)
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const hubApi = new Hono();

hubApi.onError((error) => {
  if (error instanceof HTTPException) {
    const status = error.status as
      | 400
      | 401
      | 403
      | 404
      | 409
      | 413
      | 422
      | 429
      | 500
      | 502
      | 503;
    return jsonError("request_rejected", error.message, status);
  }
  return jsonError(
    "internal_error",
    error instanceof Error ? error.message : "Unexpected error",
    500
  );
});

hubApi.get("/api/v1/catalog", (context) => {
  return cacheableJson(context.req.raw, {
    version: "v1",
    data: listCatalogSummaries()
  });
});

hubApi.get("/api/v1/skill", (context) => {
  return cacheableJson(context.req.raw, {
    version: "v1",
    data: skillBundle
  });
});

hubApi.get("/api/v1/search", (context) => {
  const query = context.req.query("q") ?? "";
  const localeValue = context.req.query("locale") ?? "en";
  if (!isLocale(localeValue)) {
    return jsonError("invalid_locale", "locale must be zh or en", 422);
  }
  return cacheableJson(context.req.raw, {
    version: "v1",
    data: searchCatalogOperations(query, localeValue)
  });
});

hubApi.get("/api/v2/search", (context) => {
  const query = context.req.query("q")?.trim() ?? "";
  const localeValue = context.req.query("locale") ?? "en";
  if (!isLocale(localeValue)) {
    return jsonError("invalid_locale", "locale must be zh or en", 422);
  }
  if (!query) {
    return jsonError("invalid_query", "q must not be empty", 422);
  }

  const validKinds = new Set<GlobalSearchKind>(["api", "endpoint", "schema"]);
  const kindsValue = context.req.query("types")?.trim();
  const kinds = kindsValue
    ? kindsValue.split(",").map((kind) => kind.trim())
    : undefined;
  if (kinds?.some((kind) => !validKinds.has(kind as GlobalSearchKind))) {
    return jsonError(
      "invalid_types",
      "types must contain only api, endpoint, or schema",
      422
    );
  }

  const limitValue = context.req.query("limit");
  const offsetValue = context.req.query("offset");
  const limit = limitValue === undefined ? 30 : Number(limitValue);
  const offset = offsetValue === undefined ? 0 : Number(offsetValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return jsonError("invalid_limit", "limit must be an integer from 1 to 100", 422);
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return jsonError("invalid_offset", "offset must be a non-negative integer", 422);
  }

  return cacheableJson(context.req.raw, {
    version: "v2",
    data: searchCatalog(query, localeValue, {
      kinds: kinds as GlobalSearchKind[] | undefined,
      limit,
      offset
    })
  });
});

hubApi.get("/api/v2/specs/:slug/schemas/:schemaName", (context) => {
  const match = getCatalogSchema(
    context.req.param("slug"),
    context.req.param("schemaName")
  );
  if (!match) return jsonError("not_found", "Schema not found", 404);
  return cacheableJson(context.req.raw, {
    version: "v2",
    data: {
      api: {
        slug: match.api.slug,
        name: match.api.name,
        provider: match.api.provider,
        title: match.api.title,
        summary: match.api.summary
      },
      schema: match.schema
    }
  });
});

hubApi.get("/api/v1/specs/:slug", (context) => {
  const api = getCatalogApi(context.req.param("slug"));
  if (!api) return jsonError("not_found", "API not found", 404);
  return cacheableJson(context.req.raw, { version: "v1", data: api });
});

hubApi.get(
  "/api/v1/specs/:slug/operations/:operationSlug",
  (context) => {
    const match = getCatalogOperation(
      context.req.param("slug"),
      context.req.param("operationSlug")
    );
    if (!match) return jsonError("not_found", "Operation not found", 404);
    return cacheableJson(context.req.raw, {
      version: "v1",
      data: match
    });
  }
);

hubApi.get("/api/v1/specs/:slug/sdk", (context) => {
  const api = getCatalogApi(context.req.param("slug"));
  if (!api) return jsonError("not_found", "SDK not found", 404);
  return cacheableJson(context.req.raw, {
    version: "v1",
    data: {
      apiSlug: api.slug,
      packageName: api.packageName,
      version: api.sdkVersion,
      status: api.sdkStatus,
      ...(api.cliName ? { cliName: api.cliName } : {}),
      ...(api.sdkStatus === "published"
        ? { install: `pnpm add ${api.packageName}` }
        : {}),
      runtime: "node>=18",
      moduleFormats: ["esm", "commonjs"],
      specSha256: api.approvedSha256
    }
  });
});

hubApi.get("/api/v1/specs/:slug/pricing", (context) => {
  const api = getCatalogApi(context.req.param("slug"));
  if (!api) return jsonError("not_found", "API not found", 404);
  return cacheableJson(context.req.raw, {
    version: "v1",
    data: api.pricing ?? {
      status: "unknown",
      summary: {
        zh: "尚无经审核的费用资料",
        en: "No reviewed pricing data is available"
      }
    }
  });
});

hubApi.post("/api/v1/playground/preview", async (context) => {
  const input = playgroundRequestSchema.safeParse(await context.req.json());
  if (!input.success) {
    return jsonError("invalid_request", input.error.message, 422);
  }
  try {
    return context.json({ version: "v1", data: createPreview(input.data) });
  } catch (error) {
    return jsonError(
      "preview_failed",
      error instanceof Error ? error.message : "Preview failed",
      422
    );
  }
});

hubApi.post("/api/v1/playground/execute", async (context) => {
  assertSameOrigin(context.req.raw);
  const quota = consumeExecutionQuota(executionClientId(context.req.raw));
  if (!quota.allowed) {
    return new Response(
      JSON.stringify({
        error: {
          code: "rate_limited",
          message: "Execution limit exceeded; retry later",
          requestId: requestId()
        }
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(quota.retryAfterSeconds)
        }
      }
    );
  }
  const input = playgroundExecuteSchema.safeParse(await context.req.json());
  if (!input.success) {
    return jsonError("invalid_request", input.error.message, 422);
  }
  const result = await executeProviderRequest(input.data);
  await recordPlaygroundHistory(context.req.raw, input.data, result);
  return context.json({ version: "v1", data: result });
});

hubApi.post("/api/v1/oauth/token", async (context) => {
  assertSameOrigin(context.req.raw);
  if (!consumeOAuthQuota(executionClientId(context.req.raw))) {
    return new Response(JSON.stringify({ error: { code: "rate_limited", message: "OAuth request limit exceeded", requestId: requestId() } }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Retry-After": "60" }
    });
  }
  const input = oauthTokenRequestSchema.safeParse(await context.req.json());
  if (!input.success) return jsonError("invalid_oauth_request", input.error.message, 422);
  if (
    input.data.grantType === "authorization_code" &&
    input.data.redirectUri !== `${new URL(context.req.url).origin}/oauth/callback`
  ) {
    return new Response(JSON.stringify({ error: { code: "invalid_redirect_uri", message: "OAuth redirect URI must use the Hub callback", requestId: requestId() } }), {
      status: 422,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  }
  const data = await exchangeOAuthToken(input.data);
  return context.json({ version: "v1", data }, 200, { "Cache-Control": "no-store", Pragma: "no-cache" });
});

hubApi.post("/api/v1/codegen/snippet", async (context) => {
  const input = playgroundRequestSchema.safeParse(await context.req.json());
  if (!input.success) {
    return jsonError("invalid_request", input.error.message, 422);
  }
  const match = getCatalogOperation(input.data.apiSlug, input.data.operationSlug);
  if (!match) return jsonError("not_found", "Operation not found", 404);
  let code: string;
  try {
    code = generateSdkSnippet(match.api, match.operation, input.data);
  } catch (error) {
    if (error instanceof SdkCodegenUnavailableError) {
      return jsonError("sdk_operation_unavailable", error.message, 409);
    }
    throw error;
  }
  return context.json({
    version: "v1",
    data: { language: "typescript", code }
  });
});
