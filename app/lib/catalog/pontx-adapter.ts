import type {
  PontxAPI,
  PontxJsonSchema,
  PontxSpec
} from "@pontx/spec";
import type {
  CatalogApi,
  CatalogAuthScheme,
  CatalogOperation,
  CatalogParameter,
  Locale
} from "./types";
import { localize } from "./types";

type SecurityScheme =
  | {
      type: "apiKey";
      name: string;
      in: "header" | "query";
      description: string;
    }
  | {
      type: "http";
      scheme: "bearer" | "basic";
      description: string;
    }
  | {
      type: "oauth2";
      flows: NonNullable<Extract<CatalogAuthScheme, { type: "oauth2" }>["flows"]>;
      description: string;
    };

export type HubPontxApi = PontxAPI & {
  components: { schemas: Record<string, PontxJsonSchema> };
  securitySchemes?: Record<string, SecurityScheme>;
  requestBody?: {
    required: boolean;
    content: Record<
      string,
      {
        schema: PontxJsonSchema;
      }
    >;
  };
  ext: {
    operationSlug: string;
  };
};

function schemaType(value: unknown): PontxJsonSchema["type"] {
  if (Array.isArray(value)) return "array";
  if (value === null) return "object";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "number";
  }
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "object"
  ) {
    return typeof value as PontxJsonSchema["type"];
  }
  return "string";
}

export function inferPontxSchema(value: unknown): PontxJsonSchema {
  const type = schemaType(value);
  if (type === "array") {
    const items = value as unknown[];
    return {
      type,
      ...(items.length ? { items: inferPontxSchema(items[0]) } : {}),
      examples: [value]
    };
  }
  if (type === "object") {
    const record =
      value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};
    return {
      type,
      properties: Object.fromEntries(
        Object.entries(record).map(([name, item]) => [
          name,
          inferPontxSchema(item)
        ])
      ),
      required: Object.keys(record),
      examples: [value]
    };
  }
  return { type, examples: [value] };
}

function parameterSchema(
  parameter: CatalogParameter,
  locale: Locale
): PontxJsonSchema {
  const exampleSchema =
    parameter.example === undefined
      ? { type: parameter.type }
      : inferPontxSchema(parameter.example);
  return {
    ...exampleSchema,
    type: parameter.type,
    ...(parameter.description
      ? { description: localize(parameter.description, locale) }
      : {}),
    ...(parameter.example === undefined
      ? {}
      : {
          ...(parameter.type === "object" || parameter.type === "array"
            ? {}
            : { default: parameter.example }),
          examples: [parameter.example]
        })
  } as PontxJsonSchema;
}

function securityScheme(
  scheme: CatalogAuthScheme,
  locale: Locale
): SecurityScheme {
  const description = localize(scheme.description, locale);
  if (scheme.type === "apiKey") {
    return {
      type: "apiKey",
      name: scheme.name,
      in: scheme.in,
      description
    };
  }
  if (scheme.type === "basic") {
    return { type: "http", scheme: "basic", description };
  }
  if (scheme.type === "bearer") {
    return { type: "http", scheme: "bearer", description };
  }
  return { type: "oauth2", flows: scheme.flows ?? {}, description };
}

export function pontxOperationName(operation: CatalogOperation): string {
  return `${operation.tag}/${operation.operationId}`;
}

export function toPontxApi(
  api: CatalogApi,
  operation: CatalogOperation,
  locale: Locale
): HubPontxApi {
  const bodyParameter = operation.parameters.find(
    (parameter) => parameter.in === "body"
  );
  const parameters = operation.parameters.map((parameter) => ({
    name: parameter.name,
    in: parameter.in,
    required: Boolean(parameter.required),
    schema: parameterSchema(parameter, locale)
  }));
  const securitySchemes = Object.fromEntries(
    api.auth.map((scheme) => [scheme.id, securityScheme(scheme, locale)])
  );

  return {
    name: pontxOperationName(operation),
    path: operation.path,
    method: operation.method,
    title: localize(operation.title, locale),
    summary: `${api.provider} · ${operation.operationId}`,
    description: localize(operation.description, locale),
    tags: [operation.tag],
    consumes: [operation.contentType ?? "application/json"],
    produces: ["application/json"],
    parameters,
    responses: {
      "200": {
        description: locale === "zh" ? "成功响应" : "Successful response",
        ...(operation.responseExample === undefined
          ? {}
          : { schema: inferPontxSchema(operation.responseExample) })
      }
    },
    deprecated: operation.deprecated,
    components: { schemas: {} },
    ...(Object.keys(securitySchemes).length ? { securitySchemes } : {}),
    ...(bodyParameter
      ? {
          requestBody: {
            required: Boolean(bodyParameter.required),
            content: {
              [operation.contentType ?? "application/json"]: {
                schema: parameterSchema(bodyParameter, locale)
              }
            }
          }
        }
      : {}),
    ext: { operationSlug: operation.slug }
  };
}

export function toPontxSpec(api: CatalogApi, locale: Locale): PontxSpec {
  return {
    name: api.slug,
    info: {
      title: localize(api.title, locale),
      version: api.sdkVersion,
      description: localize(api.summary, locale)
    },
    apis: Object.fromEntries(
      api.operations.map((operation) => [
        pontxOperationName(operation),
        toPontxApi(api, operation, locale)
      ])
    ),
    tags: [...new Set(api.operations.map((operation) => operation.tag))].map(
      (name) => ({ name })
    ),
    servers: api.servers.map((server) => ({
      url: server.url,
      description: localize(server.description, locale)
    })),
    components: {
      schemas: {},
      securitySchemes: securitySchemesForSpec(api, locale)
    }
  } as PontxSpec;
}

function securitySchemesForSpec(
  api: CatalogApi,
  locale: Locale
): Record<string, SecurityScheme> {
  return Object.fromEntries(
    api.auth.map((scheme) => [scheme.id, securityScheme(scheme, locale)])
  );
}
