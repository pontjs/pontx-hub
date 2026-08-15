import type { PontxAPI, PontxJsonSchema, PontxSpec } from "@pontx/spec";
import type {
  CatalogApi,
  CatalogAuthScheme,
  CatalogOperation,
  CatalogParameter,
  CatalogPayloadMetadata,
  CatalogRequestExample,
  CatalogSchema,
  LocalizedText
} from "./types";

type JsonRecord = Record<string, any>;

export type HierarchyProductFiles = {
  metadataCommit: string;
  product: JsonRecord;
  localizedProduct: JsonRecord;
  spec: PontxSpec;
  localizedSpec: PontxSpec;
  sdk: JsonRecord;
};

const parameterSchemaKeywords = [
  "default", "const", "multipleOf", "minimum", "maximum",
  "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength",
  "pattern", "minItems", "maxItems", "uniqueItems", "minProperties",
  "maxProperties", "nullable", "readOnly", "writeOnly", "deprecated",
  "examples"
] as const;

function localized(zh: unknown, en: unknown, fallback = ""): LocalizedText {
  return {
    zh: typeof zh === "string" && zh ? zh : fallback,
    en: typeof en === "string" && en ? en : fallback
  };
}

function slugify(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function refName(schema: JsonRecord | undefined): string | undefined {
  const ref = schema?.$ref ?? schema?.items?.$ref;
  return typeof ref === "string" ? ref.split("/").at(-1) : undefined;
}

function dereference(spec: PontxSpec, schema: JsonRecord | undefined): JsonRecord {
  const name = refName(schema);
  return (name ? spec.components?.schemas?.[name] : schema) as JsonRecord ?? {};
}

function schemaType(spec: PontxSpec, schema: JsonRecord | undefined): CatalogParameter["type"] {
  const resolved = dereference(spec, schema);
  if (["string", "number", "integer", "boolean", "object", "array"].includes(resolved.type)) {
    return resolved.type;
  }
  return resolved.properties ? "object" : "string";
}

function schemaProperties(spec: PontxSpec, schema: JsonRecord | undefined): string[] {
  const resolved = dereference(spec, schema);
  const target = resolved.type === "array" ? dereference(spec, resolved.items) : resolved;
  return Object.keys(target.properties ?? {});
}

function firstMedia(content: JsonRecord | undefined): JsonRecord | undefined {
  if (!content) return undefined;
  return content["application/json"] ?? Object.values(content)[0];
}

function exampleFor(spec: PontxSpec, schema: JsonRecord | undefined): unknown {
  const resolved = dereference(spec, schema);
  if (!Object.keys(resolved).length) return undefined;
  if (resolved.example !== undefined) return resolved.example;
  if (Array.isArray(resolved.examples) && resolved.examples.length) return resolved.examples[0];
  if (resolved.default !== undefined) return resolved.default;
  if (Array.isArray(resolved.enum) && resolved.enum.length) return resolved.enum[0];
  if (resolved.type === "array") return [exampleFor(spec, resolved.items) ?? {}];
  if (resolved.type === "object" || resolved.properties) {
    return Object.fromEntries(
      Object.entries<JsonRecord>(resolved.properties ?? {}).slice(0, 8)
        .map(([name, value]) => [name, exampleFor(spec, value)])
    );
  }
  if (resolved.type === "integer" || resolved.type === "number") return 0;
  if (resolved.type === "boolean") return false;
  return undefined;
}

function payloadMetadata(
  spec: PontxSpec,
  localeSpec: PontxSpec,
  schema: JsonRecord | undefined,
  contentTypes: string[],
  description: unknown,
  localeDescription: unknown
): CatalogPayloadMetadata {
  const name = refName(schema);
  const properties = schemaProperties(spec, schema);
  return {
    ...(typeof description === "string"
      ? { description: localized(description, localeDescription, description) }
      : {}),
    ...(contentTypes.length ? { contentTypes } : {}),
    ...(schema ? { schemaType: schemaType(spec, schema) } : {}),
    ...(name ? { schemaName: name } : {}),
    ...(properties.length ? { properties } : {})
  };
}

function makeParameter(
  spec: PontxSpec,
  parameter: JsonRecord,
  localeParameter: JsonRecord = {}
): CatalogParameter {
  const schema = parameter.schema ?? {};
  const constraints = Object.fromEntries(
    parameterSchemaKeywords
      .filter((key) => schema[key] !== undefined)
      .map((key) => [key, schema[key]])
  );
  return {
    name: parameter.name,
    in: parameter.in,
    ...(parameter.required ? { required: true } : {}),
    type: schemaType(spec, schema),
    ...(schema.format ? { format: schema.format } : {}),
    ...(refName(schema) ? { schemaName: refName(schema) } : {}),
    ...(Array.isArray(schema.enum) ? { enum: schema.enum } : {}),
    ...constraints,
    ...(typeof (parameter.description ?? schema.description) === "string"
      ? {
          description: localized(
            parameter.description ?? schema.description,
            localeParameter.description ?? localeParameter.schema?.description,
            parameter.description ?? schema.description
          )
        }
      : {}),
    ...(parameter.example !== undefined
      ? { example: parameter.example }
      : schema.example !== undefined
        ? { example: schema.example }
        : Array.isArray(schema.examples) && schema.examples.length
          ? { example: schema.examples[0] }
          : {})
  } as CatalogParameter;
}

function makeRequestExamples(
  api: JsonRecord,
  localeApi: JsonRecord,
  title: LocalizedText
): CatalogRequestExample[] {
  return Object.entries<JsonRecord>(api.requestExamples ?? {}).map(([id, example]) => {
    const localeExample = localeApi.requestExamples?.[id] ?? {};
    const request = example.request ?? {};
    const unresolved = Array.isArray(example.unresolved) ? example.unresolved : [];
    return {
      id,
      title: localized(
        example.summary ?? title.zh,
        localeExample.summary ?? title.en,
        api.operationId
      ),
      request: {
        ...(request.serverId ? { serverId: request.serverId } : {}),
        path: { ...(request.path ?? {}) },
        query: { ...(request.query ?? {}) },
        headers: { ...(request.headers ?? {}) },
        ...(Object.prototype.hasOwnProperty.call(request, "body") ? { body: request.body } : {})
      },
      expectedStatus: String(example.expectedStatus ?? "200"),
      ...(example.verifiedAt ? { verifiedAt: example.verifiedAt } : {}),
      completeness: unresolved.length ? "requires-input" : "ready",
      unresolved
    };
  });
}

function makeOperation(
  spec: PontxSpec,
  localeSpec: PontxSpec,
  apiKey: string,
  api: PontxAPI,
  localeApi: PontxAPI
): CatalogOperation {
  const source = api as JsonRecord;
  const translated = localeApi as JsonRecord;
  const operationId = source.operationId ?? apiKey.split("/").at(-1) ?? apiKey;
  const title = localized(
    source.summary ?? source.title ?? operationId,
    translated.summary ?? translated.title ?? operationId,
    operationId
  );
  const description = localized(
    source.description ?? source.summary ?? operationId,
    translated.description ?? translated.summary ?? operationId,
    operationId
  );
  const localeParameters = translated.parameters ?? [];
  const parameters = (source.parameters ?? []).map((parameter: JsonRecord, index: number) =>
    makeParameter(spec, parameter, localeParameters[index])
  );
  const bodyParameter = (source.parameters ?? []).find((parameter: JsonRecord) => parameter.in === "body");
  const localeBodyParameter = (translated.parameters ?? []).find((parameter: JsonRecord) => parameter.in === "body");
  const requestContent = bodyParameter?.content ?? {};
  const requestMedia = firstMedia(requestContent);
  const requestSchema = requestMedia?.schema ?? bodyParameter?.schema;
  const responseEntries = Object.entries<JsonRecord>(source.responses ?? {});
  const localeResponses = translated.responses ?? {};
  const successfulResponse = responseEntries.find(([status]) => status.startsWith("2"))?.[1];
  const successfulMedia = firstMedia(successfulResponse?.content);
  const documentation = source.metadata?.documentation ?? {};
  const localeDocumentation = translated.metadata?.documentation ?? {};
  const execution = source.metadata?.execution ?? {};
  const localeExecution = translated.metadata?.execution ?? {};
  const security = (source.security ?? spec.security ?? []).flatMap((requirement: JsonRecord) =>
    Object.entries(requirement).map(([schemeId, scopes]) => ({
      schemeId,
      scopes: Array.isArray(scopes) ? scopes as string[] : []
    }))
  );
  const style = String(spec.style ?? "RESTFul") as CatalogOperation["style"];

  return {
    slug: slugify(operationId),
    operationId,
    tag: source.tags?.[0] ?? "",
    style,
    ...(source.method ? { method: source.method } : {}),
    ...(source.path ? { path: source.path } : {}),
    title,
    description,
    ...(requestContent["application/x-www-form-urlencoded"]
      ? { contentType: "application/x-www-form-urlencoded" as const }
      : Object.keys(requestContent).length
        ? { contentType: "application/json" as const }
        : {}),
    parameters,
    ...(requestSchema
      ? {
          requestBody: payloadMetadata(
            spec,
            localeSpec,
            requestSchema,
            Object.keys(requestContent),
            bodyParameter?.description,
            localeBodyParameter?.description
          )
        }
      : {}),
    responses: responseEntries.map(([status, response]) => {
      const localeResponse = localeResponses[status] ?? {};
      const content = response.content ?? {};
      const media = firstMedia(content);
      return {
        status,
        ...payloadMetadata(
          spec,
          localeSpec,
          media?.schema ?? response.schema,
          Object.keys(content).length ? Object.keys(content) : source.produces ?? [],
          response.description,
          localeResponse.description
        )
      };
    }),
    serverIds: (source.servers ?? spec.servers ?? []).map((server: JsonRecord) => server.id).filter(Boolean),
    proxyHeaders: execution.headers ?? {},
    proxyEnabled: style === "RESTFul" && execution.enabled !== false,
    ...((style !== "RESTFul" || execution.enabled === false)
      ? {
          proxyDisabledReason: localized(
            execution.disabledReason ?? "当前 API 风格尚无执行适配器。",
            localeExecution.disabledReason ?? "This API style has no execution adapter yet."
          )
        }
      : {}),
    documentationStatus: documentation.status ?? "official",
    evidenceUrls: documentation.evidence ?? [],
    ...(documentation.verifiedAt ? { verifiedAt: documentation.verifiedAt } : {}),
    ...(documentation.stabilityNote
      ? {
          stabilityNote: localized(
            documentation.stabilityNote,
            localeDocumentation.stabilityNote,
            documentation.stabilityNote
          )
        }
      : {}),
    ...(security.length ? { security } : {}),
    requestExamples: makeRequestExamples(source, translated, title),
    ...(successfulMedia?.example !== undefined
      ? { responseExample: successfulMedia.example }
      : exampleFor(spec, successfulMedia?.schema ?? successfulResponse?.schema) !== undefined
        ? { responseExample: exampleFor(spec, successfulMedia?.schema ?? successfulResponse?.schema) }
        : {}),
    ...(source.deprecated ? { deprecated: true } : {})
  };
}

function makeSchema(
  spec: PontxSpec,
  localeSpec: PontxSpec,
  name: string,
  schema: PontxJsonSchema,
  localeSchema: PontxJsonSchema
): CatalogSchema {
  const source = schema as JsonRecord;
  const translated = (localeSchema ?? schema) as JsonRecord;
  const required = new Set<string>(source.required ?? []);
  return {
    name,
    title: localized(source.title ?? name, translated.title ?? name, name),
    description: localized(
      source.description ?? `${name} 数据结构`,
      translated.description ?? `${name} data structure`,
      name
    ),
    type: schemaType(spec, source),
    required: [...required],
    properties: Object.entries<JsonRecord>(source.properties ?? {}).map(([propertyName, property]) => {
      const localeProperty = translated.properties?.[propertyName] ?? {};
      const reference = property.$ref ?? property.items?.$ref;
      return {
        name: propertyName,
        type: schemaType(spec, property),
        ...(property.format ? { format: property.format } : {}),
        ...(typeof property.description === "string"
          ? { description: localized(property.description, localeProperty.description, property.description) }
          : {}),
        ...(required.has(propertyName) ? { required: true } : {}),
        ...(reference ? { ref: String(reference).split("/").at(-1) } : {})
      };
    }),
    schema: translated,
    localizedSchema: { zh: source, en: translated }
  };
}

function makeAuth(files: HierarchyProductFiles): CatalogAuthScheme[] {
  const schemes = files.localizedSpec.components?.securitySchemes ?? {};
  const localizedCredentials = new Map(
    (files.localizedProduct.credentials ?? []).map((credential: JsonRecord) => [credential.schemeId, credential])
  );
  return (files.product.credentials ?? []).map((credential: JsonRecord) => {
    const translated = (localizedCredentials.get(credential.schemeId) ?? {}) as JsonRecord;
    const scheme = (schemes as JsonRecord)[credential.schemeId] ?? {};
    const description = localized(
      credential.description ?? scheme.description,
      translated.description ?? scheme.description,
      credential.schemeId
    );
    if (credential.usernameEnvVar) {
      return {
        id: credential.schemeId,
        type: "basic",
        usernameEnvVar: credential.usernameEnvVar,
        passwordEnvVar: credential.passwordEnvVar,
        description
      };
    }
    if (scheme.type === "apiKey") {
      return {
        id: credential.schemeId,
        type: "apiKey",
        name: scheme.name,
        in: scheme.in,
        envVar: credential.envVar,
        description
      };
    }
    if (scheme.type === "oauth2") {
      const guide = credential.guide;
      const localeGuide = translated.guide;
      return {
        id: credential.schemeId,
        type: "oauth2",
        envVar: credential.envVar,
        description,
        ...(credential.tokenEndpointAuthMethod ? { tokenEndpointAuthMethod: credential.tokenEndpointAuthMethod } : {}),
        ...(credential.pkce ? { pkce: credential.pkce } : {}),
        ...(guide
          ? {
              credentialGuide: {
                url: guide.url,
                title: localized(guide.title, localeGuide?.title, guide.title),
                steps: (guide.steps ?? []).map((step: string, index: number) =>
                  localized(step, localeGuide?.steps?.[index], step)
                )
              }
            }
          : {}),
        flows: scheme.flows ?? {}
      };
    }
    return {
      id: credential.schemeId,
      type: "bearer",
      envVar: credential.envVar,
      description
    };
  });
}

export function buildCatalogApi(files: HierarchyProductFiles): CatalogApi {
  const { product, localizedProduct, spec, localizedSpec, sdk, metadataCommit } = files;
  const operations = Object.entries(spec.apis).map(([apiKey, api]) =>
    makeOperation(spec, localizedSpec, apiKey, api, localizedSpec.apis[apiKey])
  );
  const operationById = new Map(operations.map((operation) => [operation.operationId, operation]));
  const sdkOperationIds = sdk.coverage?.mode === "partial"
    ? sdk.coverage.endpointIds ?? []
    : operations.map((operation) => operation.operationId);
  const sdkContract = sdk.contract
    ? { ...sdk.contract, operations: sdkOperationIds }
    : undefined;
  const quickStartOperation = operationById.get(product.quickStart.operationId);
  if (!quickStartOperation) throw new Error(`${product.slug}: unknown Quick Start Endpoint`);
  const schemas = Object.entries(spec.components?.schemas ?? {}).map(([name, schema]) =>
    makeSchema(spec, localizedSpec, name, schema, localizedSpec.components?.schemas?.[name] ?? schema)
  );
  const productDocumentation = product.documentation ?? {};
  const localeDocumentation = localizedProduct.documentation ?? {};
  const pricing = product.pricing;
  const localePricing = localizedProduct.pricing ?? {};

  return {
    slug: product.slug,
    name: product.name,
    provider: product.provider,
    category: product.category,
    featured: Boolean(product.featured),
    sourceUrl: `https://raw.githubusercontent.com/pontjs/pontx-api-metadata/${metadataCommit}/${sdk.spec.path}`,
    license: product.legal.license,
    attributionUrl: product.legal.attributionUrl,
    approvedSha256: sdk.spec.sha256,
    title: localized(product.display.title, localizedProduct.display.title, product.name),
    summary: localized(product.display.summary, localizedProduct.display.summary, product.name),
    accent: product.display.accent,
    packageName: sdk.package.name,
    sdkVersion: sdk.package.version,
    sdkStatus: sdk.package.status,
    ...(sdk.quality ? { sdkQuality: sdk.quality } : {}),
    ...(sdkContract ? { sdkContract } : {}),
    ...(productDocumentation.contentUpdatedAt ? { contentUpdatedAt: productDocumentation.contentUpdatedAt } : {}),
    ...(sdk.cli?.name ? { cliName: sdk.cli.name } : {}),
    ...(sdk.examples ? { sdkExamples: sdk.examples } : {}),
    proxyEnabled: Boolean(product.execution.hubProxyEnabled),
    documentationStatus: productDocumentation.status ?? "official",
    evidenceUrls: productDocumentation.evidence ?? [],
    ...(productDocumentation.verifiedAt ? { verifiedAt: productDocumentation.verifiedAt } : {}),
    ...(productDocumentation.stabilityNote
      ? {
          stabilityNote: localized(
            productDocumentation.stabilityNote,
            localeDocumentation.stabilityNote,
            productDocumentation.stabilityNote
          )
        }
      : {}),
    quickStart: {
      operationSlug: quickStartOperation.slug,
      requestExampleId: product.quickStart.requestExampleId
    },
    servers: (spec.servers ?? []).map((server: JsonRecord, index: number) => ({
      id: server.id,
      url: server.url.replace(/\/$/, ""),
      description: localized(
        server.description ?? server.id,
        localizedSpec.servers?.[index]?.description ?? server.id,
        server.id
      )
    })),
    auth: makeAuth(files),
    ...(pricing
      ? {
          pricing: {
            ...pricing,
            summary: localized(pricing.summary, localePricing.summary, pricing.summary),
            ...(pricing.freeTier
              ? { freeTier: localized(pricing.freeTier, localePricing.freeTier, pricing.freeTier) }
              : {}),
            ...(pricing.billingUnit
              ? { billingUnit: localized(pricing.billingUnit, localePricing.billingUnit, pricing.billingUnit) }
              : {}),
            ...(pricing.startingPrice
              ? {
                  startingPrice: {
                    ...pricing.startingPrice,
                    unit: localized(
                      pricing.startingPrice.unit,
                      localePricing.startingPrice?.unit,
                      pricing.startingPrice.unit
                    )
                  }
                }
              : {})
          }
        }
      : {}),
    operations,
    schemas
  } as CatalogApi;
}
