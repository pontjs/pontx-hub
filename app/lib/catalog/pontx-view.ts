import type { PontxAPI, PontxJsonSchema, PontxSpec } from "@pontx/spec";
import type {
  CatalogApiContext,
  CatalogOperation,
  CatalogRequestExample
} from "./types";

export type HubPontxApi = PontxAPI & {
  components: { schemas: Record<string, PontxJsonSchema> };
  securitySchemes?: Record<string, unknown>;
  requestBody?: {
    required: boolean;
    content: Record<string, { schema: PontxJsonSchema; example?: unknown }>;
  };
  ext: { operationSlug: string; canonicalApiKey: string };
};

export type PontxViewOptions = {
  parameterExamples?: "all" | "required";
  requestExample?: CatalogRequestExample;
};

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function initialValue(
  parameter: Record<string, any>,
  requestExample: CatalogRequestExample | undefined
): { present: boolean; value?: unknown; unresolved?: boolean } {
  if (!requestExample) return { present: false };
  if (requestExample.unresolved.some((item) => item.in === parameter.in && item.name === parameter.name)) {
    return { present: false, unresolved: true };
  }
  const request = requestExample.request as Record<string, any>;
  if (parameter.in === "body") {
    return hasOwn(request, "body")
      ? { present: true, value: request.body }
      : { present: false };
  }
  const location = parameter.in === "header" ? "headers" : parameter.in;
  const values = request[location] ?? {};
  return hasOwn(values, parameter.name)
    ? { present: true, value: values[parameter.name] }
    : { present: false };
}

function viewParameter(
  parameter: Record<string, any>,
  options: PontxViewOptions
): Record<string, any> {
  const schema = { ...(parameter.schema ?? {}) };
  const value = initialValue(parameter, options.requestExample);
  if (value.present) {
    schema.examples = [value.value];
    delete schema.example;
  } else if (
    value.unresolved ||
    (options.parameterExamples === "required" && !parameter.required)
  ) {
    delete schema.example;
    delete schema.examples;
  }
  return { ...parameter, schema };
}

export function canonicalApiKey(
  spec: PontxSpec,
  operation: Pick<CatalogOperation, "operationId">
): string {
  const entry = Object.entries(spec.apis).find(
    ([, api]) => api.operationId === operation.operationId
  );
  if (!entry) throw new Error(`PontxSpec is missing Endpoint ${operation.operationId}`);
  return entry[0];
}

export function pontxApiView(
  spec: PontxSpec,
  operation: CatalogOperation,
  options: PontxViewOptions = {}
): HubPontxApi {
  const apiKey = canonicalApiKey(spec, operation);
  const source = spec.apis[apiKey] as PontxAPI & Record<string, any>;
  const parameters = (source.parameters ?? []).map((parameter: Record<string, any>) =>
    viewParameter(parameter, options)
  );
  const bodyParameter = parameters.find((parameter: Record<string, any>) => parameter.in === "body");
  const securitySchemes = spec.components?.securitySchemes ?? {};
  return {
    ...source,
    name: source.name ?? apiKey,
    parameters,
    components: { schemas: spec.components?.schemas ?? {} },
    ...(Object.keys(securitySchemes).length ? { securitySchemes } : {}),
    ...(bodyParameter
      ? {
          requestBody: {
            required: Boolean(bodyParameter.required),
            content: bodyParameter.content ?? {
              "application/json": { schema: bodyParameter.schema }
            }
          }
        }
      : {}),
    ext: { operationSlug: operation.slug, canonicalApiKey: apiKey }
  } as HubPontxApi;
}

export function pontxDirectorySpec(
  spec: PontxSpec,
  operations: CatalogApiContext["operations"]
): PontxSpec {
  const operationById = new Map(operations.map((operation) => [operation.operationId, operation]));
  return {
    ...spec,
    apis: Object.fromEntries(Object.entries(spec.apis).map(([apiKey, api]) => {
      const operation = operationById.get(api.operationId ?? "");
      return [
        apiKey,
        {
          ...api,
          ext: {
            ...((api as PontxAPI & { ext?: Record<string, unknown> }).ext ?? {}),
            ...(operation ? { operationSlug: operation.slug } : {}),
            canonicalApiKey: apiKey
          }
        }
      ];
    }))
  } as PontxSpec;
}
