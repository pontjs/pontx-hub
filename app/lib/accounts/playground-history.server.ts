import { and, desc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "~/db/client.server";
import { userPlaygroundHistory } from "~/db/schema";
import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import type {
  CatalogApi,
  CatalogOperation,
  CatalogRequestScalar
} from "~/lib/catalog/types";
import type { PlaygroundExecuteInput } from "~/lib/playground/schemas";
import { readAccountsConfiguration } from "./config.server";
import { accountUserId } from "./session.server";

const HISTORY_LIMIT = 100;
const MAX_SNAPSHOT_BYTES = 64 * 1024;
const MAX_VALUE_LENGTH = 4096;
const MAX_BODY_DEPTH = 12;
const MAX_BODY_NODES = 1000;
const MAX_OMITTED_FIELDS = 100;
const MAX_OMITTED_FIELD_LENGTH = 256;
const OMIT = Symbol("omit-playground-history-value");

type JsonSchema = Record<string, unknown>;
type SanitizedSnapshot = {
  apiSlug: string;
  operationSlug: string;
  serverId: string;
  path: Record<string, CatalogRequestScalar>;
  query: Record<string, CatalogRequestScalar>;
  headers: Record<string, string>;
  requestBody?: unknown;
  hasRequestBody: boolean;
  omittedFields: string[];
};

export type PlaygroundHistoryEntry = typeof userPlaygroundHistory.$inferSelect;

function normalizedFieldName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

export function isSensitivePlaygroundField(name: string): boolean {
  const normalized = normalizedFieldName(name);
  const parts = normalized.split("_").filter(Boolean);
  return (
    normalized.includes("api_key") ||
    normalized.includes("apikey") ||
    normalized.includes("access_token") ||
    normalized.includes("refresh_token") ||
    normalized.includes("id_token") ||
    normalized.includes("client_secret") ||
    normalized.includes("private_key") ||
    parts.some((part) =>
      [
        "authorization",
        "cookie",
        "credential",
        "key",
        "passwd",
        "password",
        "secret",
        "session",
        "token"
      ].includes(part)
    )
  );
}

function sensitiveSchema(schema: JsonSchema | undefined): boolean {
  if (!schema) return false;
  const format =
    typeof schema.format === "string" ? schema.format.toLowerCase() : "";
  return (
    schema.writeOnly === true ||
    ["password", "secret", "token"].includes(format)
  );
}

function referencedSchema(
  api: CatalogApi,
  schema: JsonSchema | undefined
): JsonSchema | undefined {
  const reference = typeof schema?.$ref === "string" ? schema.$ref : undefined;
  if (!reference) return schema;
  const name = reference.match(/^#\/components\/schemas\/(.+)$/)?.[1];
  return name
    ? (api.schemas.find((candidate) => candidate.name === name)?.schema as
        | JsonSchema
        | undefined)
    : schema;
}

function bodySchema(
  api: CatalogApi,
  operation: CatalogOperation
): JsonSchema | undefined {
  const bodyParameter = operation.parameters.find(
    (parameter) => parameter.in === "body"
  );
  const schemaName = operation.requestBody?.schemaName ?? bodyParameter?.schemaName;
  return schemaName
    ? (api.schemas.find((candidate) => candidate.name === schemaName)?.schema as
        | JsonSchema
        | undefined)
    : undefined;
}

function safeScalar(
  value: CatalogRequestScalar,
  field: string,
  omittedFields: string[]
): CatalogRequestScalar | typeof OMIT {
  if (typeof value === "string" && value.length > MAX_VALUE_LENGTH) {
    omittedFields.push(field);
    return OMIT;
  }
  return value;
}

function summarizeOmittedFields(fields: string[]): string[] {
  const unique = [
    ...new Set(
      fields.map((field) =>
        field.length <= MAX_OMITTED_FIELD_LENGTH
          ? field
          : `${field.slice(0, MAX_OMITTED_FIELD_LENGTH - 1)}…`
      )
    )
  ];
  return unique.length <= MAX_OMITTED_FIELDS
    ? unique
    : [
        ...unique.slice(0, MAX_OMITTED_FIELDS),
        `${unique.length - MAX_OMITTED_FIELDS} additional fields`
      ];
}

function sanitizeParameters(
  values: Record<string, CatalogRequestScalar>,
  location: "path" | "query" | "header",
  api: CatalogApi,
  operation: CatalogOperation,
  omittedFields: string[]
): Record<string, CatalogRequestScalar> {
  const authenticationNames = new Set(
    api.auth
      .filter(
        (scheme): scheme is Extract<typeof scheme, { type: "apiKey" }> =>
          scheme.type === "apiKey" && scheme.in === location
      )
      .map((scheme) => scheme.name.toLowerCase())
  );
  return Object.fromEntries(
    Object.entries(values).flatMap(([name, value]) => {
      const parameter = operation.parameters.find(
        (candidate) =>
          candidate.in === location &&
          (location === "header"
            ? candidate.name.toLowerCase() === name.toLowerCase()
            : candidate.name === name)
      );
      const field = `${location}.${name}`;
      if (
        !parameter ||
        authenticationNames.has(name.toLowerCase()) ||
        isSensitivePlaygroundField(name) ||
        parameter.format?.toLowerCase() === "password"
      ) {
        omittedFields.push(field);
        return [];
      }
      const safeValue = safeScalar(value, field, omittedFields);
      return safeValue === OMIT ? [] : [[parameter.name, safeValue]];
    })
  );
}

function sanitizeBodyValue(
  value: unknown,
  schema: JsonSchema | undefined,
  api: CatalogApi,
  path: string,
  omittedFields: string[],
  budget: { nodes: number },
  depth = 0
): unknown | typeof OMIT {
  const resolvedSchema = referencedSchema(api, schema);
  if (
    sensitiveSchema(resolvedSchema) ||
    depth > MAX_BODY_DEPTH ||
    budget.nodes >= MAX_BODY_NODES
  ) {
    omittedFields.push(path);
    return OMIT;
  }
  budget.nodes += 1;

  if (typeof value === "string") {
    if (value.length > MAX_VALUE_LENGTH) {
      omittedFields.push(path);
      return OMIT;
    }
    return value;
  }
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    const itemSchema =
      resolvedSchema?.items && typeof resolvedSchema.items === "object"
        ? (resolvedSchema.items as JsonSchema)
        : undefined;
    return value.flatMap((item, index) => {
      const sanitized = sanitizeBodyValue(
        item,
        itemSchema,
        api,
        `${path}[${index}]`,
        omittedFields,
        budget,
        depth + 1
      );
      return sanitized === OMIT ? [] : [sanitized];
    });
  }
  if (!value || typeof value !== "object") {
    omittedFields.push(path);
    return OMIT;
  }

  const properties =
    resolvedSchema?.properties && typeof resolvedSchema.properties === "object"
      ? (resolvedSchema.properties as Record<string, JsonSchema>)
      : {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([name, item]) => {
      const field = `${path}.${name}`;
      const propertySchema = properties[name];
      if (isSensitivePlaygroundField(name) || sensitiveSchema(propertySchema)) {
        omittedFields.push(field);
        return [];
      }
      const sanitized = sanitizeBodyValue(
        item,
        propertySchema,
        api,
        field,
        omittedFields,
        budget,
        depth + 1
      );
      return sanitized === OMIT ? [] : [[name, sanitized]];
    })
  );
}

export function sanitizePlaygroundHistoryRequest(
  input: PlaygroundExecuteInput
): SanitizedSnapshot | undefined {
  const match = getCatalogOperation(input.apiSlug, input.operationSlug);
  if (!match) return undefined;
  const { api, operation } = match;
  const omittedFields: string[] = [];
  const path = sanitizeParameters(
    input.path,
    "path",
    api,
    operation,
    omittedFields
  );
  const query = sanitizeParameters(
    input.query,
    "query",
    api,
    operation,
    omittedFields
  );
  const headers = sanitizeParameters(
    input.headers,
    "header",
    api,
    operation,
    omittedFields
  ) as Record<string, string>;
  const hasInputBody = Object.prototype.hasOwnProperty.call(input, "body");
  const sanitizedBody = hasInputBody
    ? sanitizeBodyValue(
        input.body,
        bodySchema(api, operation),
        api,
        "body",
        omittedFields,
        { nodes: 0 }
      )
    : OMIT;
  const snapshot: SanitizedSnapshot = {
    apiSlug: input.apiSlug,
    operationSlug: input.operationSlug,
    serverId: input.serverId,
    path,
    query,
    headers,
    ...(sanitizedBody === OMIT ? {} : { requestBody: sanitizedBody }),
    hasRequestBody: sanitizedBody !== OMIT,
    omittedFields: summarizeOmittedFields(omittedFields)
  };

  if (Buffer.byteLength(JSON.stringify(snapshot)) > MAX_SNAPSHOT_BYTES) {
    delete snapshot.requestBody;
    snapshot.hasRequestBody = false;
    snapshot.omittedFields = summarizeOmittedFields([
      ...snapshot.omittedFields,
      "body (size limit)"
    ]);
  }
  if (Buffer.byteLength(JSON.stringify(snapshot)) > MAX_SNAPSHOT_BYTES) {
    snapshot.path = {};
    snapshot.query = {};
    snapshot.headers = {};
    snapshot.omittedFields = summarizeOmittedFields([
      ...snapshot.omittedFields,
      "parameters (size limit)"
    ]);
  }
  return snapshot;
}

export async function recordPlaygroundHistory(
  request: Request,
  input: PlaygroundExecuteInput,
  result: { status: number; durationMs: number }
): Promise<void> {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") return;

  try {
    const userId = await accountUserId(request);
    const snapshot = sanitizePlaygroundHistoryRequest(input);
    if (!userId || !snapshot) return;
    const database = getDatabase(configuration.databaseUrl);
    await database.insert(userPlaygroundHistory).values({
      userId,
      ...snapshot,
      responseStatus: result.status,
      durationMs: result.durationMs
    });
    const excess = await database
      .select({ id: userPlaygroundHistory.id })
      .from(userPlaygroundHistory)
      .where(eq(userPlaygroundHistory.userId, userId))
      .orderBy(
        desc(userPlaygroundHistory.createdAt),
        desc(userPlaygroundHistory.id)
      )
      .offset(HISTORY_LIMIT);
    if (excess.length) {
      await database.delete(userPlaygroundHistory).where(
        and(
          eq(userPlaygroundHistory.userId, userId),
          inArray(userPlaygroundHistory.id, excess.map((entry) => entry.id))
        )
      );
    }
  } catch {
    // Account history is additive and must never make a provider execution fail.
  }
}

export async function listPlaygroundHistoryForUser(
  userId: string,
  limit = 50
): Promise<PlaygroundHistoryEntry[]> {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") {
    throw new Response("Not found", { status: 404 });
  }
  return getDatabase(configuration.databaseUrl)
    .select()
    .from(userPlaygroundHistory)
    .where(eq(userPlaygroundHistory.userId, userId))
    .orderBy(
      desc(userPlaygroundHistory.createdAt),
      desc(userPlaygroundHistory.id)
    )
    .limit(Math.max(1, Math.min(HISTORY_LIMIT, Math.floor(limit))));
}

export async function removePlaygroundHistoryEntry(
  userId: string,
  entryId: string
): Promise<void> {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") {
    throw new Response("Not found", { status: 404 });
  }
  await getDatabase(configuration.databaseUrl)
    .delete(userPlaygroundHistory)
    .where(
      and(
        eq(userPlaygroundHistory.userId, userId),
        eq(userPlaygroundHistory.id, entryId)
      )
    );
}
