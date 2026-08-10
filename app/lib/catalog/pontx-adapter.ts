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
  CatalogResponseMetadata,
  CatalogSchema,
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

export type PontxAdapterOptions = {
  /**
   * The shared Playground treats schema examples as initial input values.
   * Guided calls keep examples only for required parameters so optional
   * examples are not mistaken for defaults and combined into one request.
   */
  parameterExamples?: "all" | "required";
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
  locale: Locale,
  options: PontxAdapterOptions
): PontxJsonSchema {
  const includeExamples =
    options.parameterExamples !== "required" || Boolean(parameter.required);
  const constraintKeys = [
    "default", "const", "multipleOf", "minimum", "maximum",
    "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength",
    "pattern", "minItems", "maxItems", "uniqueItems", "minProperties",
    "maxProperties", "nullable", "readOnly", "writeOnly", "deprecated"
  ] as const;
  const constraints = Object.fromEntries(
    constraintKeys
      .filter((key) => parameter[key] !== undefined)
      .map((key) => [key, parameter[key]])
  );
  const exampleSchema =
    parameter.example === undefined || !includeExamples
      ? { type: parameter.type }
      : inferPontxSchema(parameter.example);
  return {
    ...exampleSchema,
    type: parameter.type,
    ...constraints,
    ...(parameter.enum ? { enum: parameter.enum } : {}),
    ...(includeExamples && parameter.examples
      ? { examples: parameter.examples }
      : {}),
    ...(parameter.description
      ? { description: localize(parameter.description, locale) }
      : {}),
    ...(parameter.example === undefined || !includeExamples
      ? {}
      : { examples: [parameter.example] })
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

function localizedSchema(
  schema: CatalogSchema,
  locale: Locale
): PontxJsonSchema {
  const localizedDocument = schema.localizedSchema?.[locale];
  return (localizedDocument ?? schema.schema) as unknown as PontxJsonSchema;
}

function componentSchemas(
  api: CatalogApi,
  locale: Locale
): Record<string, PontxJsonSchema> {
  return Object.fromEntries(
    api.schemas.map((schema) => [schema.name, localizedSchema(schema, locale)])
  );
}

function responseDescription(status: string, locale: Locale): string {
  if (status.startsWith("2")) {
    return locale === "zh" ? "成功响应" : "Successful response";
  }
  return locale === "zh" ? `HTTP ${status} 响应` : `HTTP ${status} response`;
}

function responseSchema(
  response: CatalogResponseMetadata,
  responseExample: unknown,
  useExampleFallback: boolean
): PontxJsonSchema | undefined {
  if (response.schemaName) {
    const referencedSchema = {
      $ref: `#/components/schemas/${response.schemaName}`
    } as PontxJsonSchema;
    return response.schemaType === "array"
      ? ({ type: "array", items: referencedSchema } as PontxJsonSchema)
      : referencedSchema;
  }

  if (responseExample !== undefined && useExampleFallback) {
    return inferPontxSchema(responseExample);
  }

  return response.schemaType
    ? ({ type: response.schemaType } as PontxJsonSchema)
    : undefined;
}

function operationResponses(
  operation: CatalogOperation,
  locale: Locale
): PontxAPI["responses"] {
  if (operation.responses.length === 0) {
    return {
      "200": {
        description: responseDescription("200", locale),
        ...(operation.responseExample === undefined
          ? {}
          : { schema: inferPontxSchema(operation.responseExample) })
      }
    };
  }

  const firstSuccessfulResponse = operation.responses.findIndex((response) =>
    response.status.startsWith("2")
  );
  return Object.fromEntries(
    operation.responses.map((response, index) => {
      const schema = responseSchema(
        response,
        operation.responseExample,
        index === firstSuccessfulResponse
      );

      return [
        response.status,
        {
          description: response.description
            ? localize(response.description, locale)
            : responseDescription(response.status, locale),
          ...(schema ? { schema } : {})
        }
      ];
    })
  );
}

export function pontxOperationName(operation: CatalogOperation): string {
  return `${operation.tag}/${operation.operationId}`;
}

export function toPontxApi(
  api: CatalogApi,
  operation: CatalogOperation,
  locale: Locale,
  options: PontxAdapterOptions = {}
): HubPontxApi {
  const bodyParameter = operation.parameters.find(
    (parameter) => parameter.in === "body"
  );
  const parameters = operation.parameters.map((parameter) => ({
    name: parameter.name,
    in: parameter.in,
    required: Boolean(parameter.required),
    ...(parameter.description
      ? { description: localize(parameter.description, locale) }
      : {}),
    schema: parameterSchema(parameter, locale, options)
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
    responses: operationResponses(operation, locale),
    deprecated: operation.deprecated,
    components: { schemas: componentSchemas(api, locale) },
    ...(Object.keys(securitySchemes).length ? { securitySchemes } : {}),
    ...(bodyParameter
      ? {
          requestBody: {
            required: Boolean(bodyParameter.required),
            content: {
              [operation.contentType ?? "application/json"]: {
                schema: parameterSchema(bodyParameter, locale, options)
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
