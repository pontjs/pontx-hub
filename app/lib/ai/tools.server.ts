import { z } from "zod";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import {
  getCatalogApi,
  getCatalogOperation,
  getCatalogSchema,
  searchCatalog
} from "~/lib/catalog/catalog.server";
import { localize, type Locale } from "~/lib/catalog/types";
import { hubCliSnippet } from "~/lib/hub-cli-command";
import { assertPublicHost } from "~/lib/playground/network.server";
import { createPreview } from "~/lib/playground/request.server";
import { playgroundRequestSchema } from "~/lib/playground/schemas";

export type AgentUiEvent = { name: string; value: unknown };
export type AgentToolResult = { content: string; uiEvent?: AgentUiEvent };

const localeSchema = z.enum(["zh", "en"]).default("zh");
const resourceSchema = z.object({ resourceId: z.string().min(3), locale: localeSchema });
const searchSchema = z.object({
  query: z.string().min(1).max(500),
  locale: localeSchema,
  types: z.array(z.enum(["api", "endpoint", "schema"])).optional()
});
const apiSchema = z.object({ apiSlug: z.string().regex(/^[a-z0-9-]+$/), locale: localeSchema });
const prepareSchema = playgroundRequestSchema.omit({ auth: true }).extend({
  locale: localeSchema
});

function schema(properties: Record<string, unknown>, required: string[] = []): Tool.InputSchema {
  return { type: "object", properties, required, additionalProperties: false };
}

function endpointHref(locale: Locale, apiSlug: string, operationSlug: string) {
  return `/${locale}/apis/${apiSlug}/${operationSlug}`;
}

export const agentToolDefinitions: Tool[] = [
  {
    name: "search_resources",
    description: "Search the curated Pontx catalog for APIs, HTTP endpoints, and schemas. Use this before choosing an API. Exact resource IDs are stable and must be used with other tools.",
    input_schema: schema({
      query: { type: "string" },
      locale: { type: "string", enum: ["zh", "en"] },
      types: { type: "array", items: { type: "string", enum: ["api", "endpoint", "schema"] } }
    }, ["query", "locale"])
  },
  {
    name: "get_resource",
    description: "Load the approved metadata for one stable resource ID. Use it to explain parameters, responses, schemas, authentication, execution availability, and evidence without guessing.",
    input_schema: schema({
      resourceId: { type: "string" },
      locale: { type: "string", enum: ["zh", "en"] }
    }, ["resourceId", "locale"])
  },
  {
    name: "get_sdk_and_cli",
    description: "Get the published SDK package, installation details, and Pontx Hub CLI identity for an API. Use get_resource for endpoint parameters before writing executable examples.",
    input_schema: schema({
      apiSlug: { type: "string" },
      locale: { type: "string", enum: ["zh", "en"] }
    }, ["apiSlug", "locale"])
  },
  {
    name: "get_pricing",
    description: "Return the human-reviewed pricing snapshot for an API, including the official URL and verification date. If pricing is missing or stale, say so rather than inferring a price.",
    input_schema: schema({
      apiSlug: { type: "string" },
      locale: { type: "string", enum: ["zh", "en"] }
    }, ["apiSlug", "locale"])
  },
  {
    name: "refresh_official_pricing",
    description: "Fetch a short unreviewed snapshot only from the approved official pricing URL. Use only when the user explicitly asks for the latest price, and label the result as unreviewed live content.",
    input_schema: schema({
      apiSlug: { type: "string" },
      locale: { type: "string", enum: ["zh", "en"] }
    }, ["apiSlug", "locale"])
  },
  {
    name: "prepare_api_call",
    description: "Validate and prepare a catalog-approved API request and equivalent CLI command. This never executes the provider request and never receives credentials. The user-facing client performs preview and any execution separately.",
    input_schema: schema({
      apiSlug: { type: "string" },
      operationSlug: { type: "string" },
      serverId: { type: "string" },
      path: { type: "object" },
      query: { type: "object" },
      headers: { type: "object" },
      body: {},
      locale: { type: "string", enum: ["zh", "en"] }
    }, ["apiSlug", "operationSlug", "serverId", "path", "query", "headers", "locale"])
  }
];

function localizedAuth(api: NonNullable<ReturnType<typeof getCatalogApi>>, locale: Locale) {
  return api.auth.map((item) => ({
    id: item.id,
    type: item.type,
    description: localize(item.description, locale),
    envVar: item.type === "basic" ? item.passwordEnvVar : item.envVar,
    ...(item.type === "apiKey" ? { name: item.name, in: item.in } : {}),
    ...(item.type === "oauth2" ? {
      ...(item.secretEnvVar ? { secretEnvVar: item.secretEnvVar } : {}),
      scopes: Object.fromEntries(Object.values(item.flows ?? {}).flatMap((flow) => Object.entries(flow?.scopes ?? {}))),
      credentialGuide: item.credentialGuide ? {
        url: item.credentialGuide.url,
        title: localize(item.credentialGuide.title, locale),
        steps: item.credentialGuide.steps.map((step) => localize(step, locale))
      } : undefined
    } : {})
  }));
}

function resource(resourceId: string, locale: Locale): unknown {
  const [kind, value] = resourceId.split(":", 2);
  if (kind === "api") {
    const api = getCatalogApi(value);
    if (!api) throw new Error("API not found");
    return {
      id: resourceId,
      name: api.name,
      provider: api.provider,
      title: localize(api.title, locale),
      summary: localize(api.summary, locale),
      auth: localizedAuth(api, locale),
      pricing: api.pricing,
      endpoints: api.operations.map((item) => ({
        id: `endpoint:${api.slug}/${item.slug}`,
        title: localize(item.title, locale),
        method: item.method,
        path: item.path
      }))
    };
  }
  const slash = value?.indexOf("/") ?? -1;
  if (slash < 1) throw new Error("Resource ID must include its API slug");
  const apiSlug = value.slice(0, slash);
  const name = value.slice(slash + 1);
  if (kind === "endpoint") {
    const match = getCatalogOperation(apiSlug, name);
    if (!match) throw new Error("Endpoint not found");
    return {
      id: resourceId,
      api: { slug: match.api.slug, title: localize(match.api.title, locale) },
      operation: {
        slug: match.operation.slug,
        operationId: match.operation.operationId,
        title: localize(match.operation.title, locale),
        description: localize(match.operation.description, locale),
        method: match.operation.method,
        path: match.operation.path,
        parameters: match.operation.parameters,
        requestBody: match.operation.requestBody,
        responses: match.operation.responses,
        security: match.operation.security,
        servers: match.api.servers.filter((server) => !match.operation.serverIds.length || match.operation.serverIds.includes(server.id)),
        proxyEnabled: match.api.proxyEnabled && match.operation.proxyEnabled !== false,
        proxyDisabledReason: match.operation.proxyDisabledReason ? localize(match.operation.proxyDisabledReason, locale) : undefined,
        requestExamples: match.operation.requestExamples
      },
      auth: localizedAuth(match.api, locale)
    };
  }
  if (kind === "schema") {
    const match = getCatalogSchema(apiSlug, name);
    if (!match) throw new Error("Schema not found");
    return {
      id: resourceId,
      api: { slug: match.api.slug, title: localize(match.api.title, locale) },
      schema: {
        ...match.schema,
        title: localize(match.schema.title, locale),
        description: localize(match.schema.description, locale),
        schema: match.schema.localizedSchema?.[locale] ?? match.schema.schema
      }
    };
  }
  throw new Error("Unsupported resource kind");
}

async function fetchOfficialPricing(apiSlug: string, locale: Locale): Promise<AgentToolResult> {
  const api = getCatalogApi(apiSlug);
  if (!api?.pricing) throw new Error("No reviewed official pricing URL is configured");
  const url = new URL(api.pricing.officialUrl);
  await assertPublicHost(url.hostname);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "text/html,text/plain", "User-Agent": "Pontx-Hub-Pricing/0.1" }
    });
    if (!response.ok) throw new Error(`Official pricing page returned HTTP ${response.status}`);
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > 512 * 1024) throw new Error("Official pricing page is too large");
    const html = (await response.text()).slice(0, 512 * 1024);
    const text = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12_000);
    return {
      content: JSON.stringify({
        apiSlug,
        locale,
        officialUrl: url.toString(),
        fetchedAt: new Date().toISOString(),
        reviewStatus: "unreviewed-live",
        content: text
      })
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runAgentTool(name: string, input: unknown): Promise<AgentToolResult> {
  if (name === "search_resources") {
    const data = searchSchema.parse(input);
    const result = searchCatalog(data.query, data.locale, { kinds: data.types, limit: 10 });
    return { content: JSON.stringify({ ...result, items: result.items.map(({ score: _score, ...item }) => item) }) };
  }
  if (name === "get_resource") {
    const data = resourceSchema.parse(input);
    return { content: JSON.stringify(resource(data.resourceId, data.locale)) };
  }
  if (name === "get_sdk_and_cli") {
    const data = apiSchema.parse(input);
    const api = getCatalogApi(data.apiSlug);
    if (!api) throw new Error("API not found");
    return { content: JSON.stringify({
      apiSlug: api.slug,
      packageName: api.packageName,
      version: api.sdkVersion,
      status: api.sdkStatus,
      cliName: api.cliName,
      install: api.sdkStatus === "published" ? `pnpm add ${api.packageName}` : undefined,
      universalCli: `pnpm add -g @pontx/hub-cli`,
      authentication: localizedAuth(api, data.locale)
    }) };
  }
  if (name === "get_pricing") {
    const data = apiSchema.parse(input);
    const api = getCatalogApi(data.apiSlug);
    if (!api) throw new Error("API not found");
    return { content: JSON.stringify({
      apiSlug: api.slug,
      pricing: api.pricing ? {
        ...api.pricing,
        summary: localize(api.pricing.summary, data.locale),
        freeTier: api.pricing.freeTier ? localize(api.pricing.freeTier, data.locale) : undefined,
        billingUnit: api.pricing.billingUnit ? localize(api.pricing.billingUnit, data.locale) : undefined
      } : { status: "unknown", message: data.locale === "zh" ? "尚无经审核的费用资料" : "No reviewed pricing data is available" }
    }) };
  }
  if (name === "refresh_official_pricing") {
    const data = apiSchema.parse(input);
    return fetchOfficialPricing(data.apiSlug, data.locale);
  }
  if (name === "prepare_api_call") {
    const data = prepareSchema.parse(input);
    const match = getCatalogOperation(data.apiSlug, data.operationSlug);
    if (!match) throw new Error("Endpoint not found");
    const request = {
      apiSlug: data.apiSlug,
      operationSlug: data.operationSlug,
      serverId: data.serverId,
      path: data.path,
      query: data.query,
      headers: data.headers,
      ...(data.body !== undefined ? { body: data.body } : {})
    };
    const preview = createPreview(request);
    const value = {
      request,
      preview: { ...preview, confirmationToken: undefined },
      auth: localizedAuth(match.api, data.locale),
      operation: {
        method: match.operation.method,
        path: match.operation.path,
        href: endpointHref(data.locale, match.api.slug, match.operation.slug),
        credentialStorageKey: `playground:${match.operation.method}:${match.operation.path}:params`
      },
      cli: hubCliSnippet(match.api.slug, match.operation, request),
      sdk: {
        packageName: match.api.packageName,
        operationId: match.operation.operationId
      }
    };
    return {
      content: JSON.stringify(value),
      uiEvent: { name: "pontx.request_prepared", value }
    };
  }
  throw new Error(`Unsupported tool: ${name}`);
}
