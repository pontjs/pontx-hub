import type { PontxAPI, PontxJsonSchema, PontxSpec } from "@pontx/spec";
import {
  getCatalogApi,
  getCatalogMetadataCommit,
  getCatalogOperation,
  getCatalogSchema,
  getPontxSpec,
  listCatalog
} from "./catalog.server";
import type {
  CatalogApi,
  CatalogApiContext,
  CatalogEndpointSummary,
  CatalogOperation,
  CatalogProductNavigation,
  CatalogProductListItem,
  CatalogProductMetadata,
  CatalogSchema,
  CatalogSchemaSummary,
  Locale
} from "./types";

const SCHEMA_REF_PREFIX = "#/components/schemas/";

export type MetadataEnvelope<T> = {
  version: "v2";
  metadataRevision: string;
  data: T;
};

export type EndpointMetadataDetail = {
  locale: Locale;
  product: CatalogProductListItem;
  endpoint: CatalogOperation;
  pontxSpec: PontxSpec;
};

export type SchemaMetadataDetail = {
  locale: Locale;
  product: CatalogProductListItem;
  schema: CatalogSchema;
  pontxSpec: PontxSpec;
};

export type FullProductMetadata = {
  locale: Locale;
  product: CatalogApi;
  pontxSpec: PontxSpec;
};

export function metadataEnvelope<T>(data: T): MetadataEnvelope<T> {
  return {
    version: "v2",
    metadataRevision: getCatalogMetadataCommit(),
    data
  };
}

function endpointSummary(
  apiSlug: string,
  endpoint: CatalogOperation
): CatalogEndpointSummary {
  return {
    id: `endpoint:${apiSlug}/${endpoint.slug}`,
    slug: endpoint.slug,
    operationId: endpoint.operationId,
    style: endpoint.style,
    tag: endpoint.tag,
    ...(endpoint.method ? { method: endpoint.method } : {}),
    ...(endpoint.path ? { path: endpoint.path } : {}),
    title: endpoint.title,
    ...(endpoint.deprecated ? { deprecated: true } : {}),
    ...(endpoint.proxyEnabled !== undefined
      ? { proxyEnabled: endpoint.proxyEnabled }
      : {}),
    ...(endpoint.proxyDisabledReason
      ? { proxyDisabledReason: endpoint.proxyDisabledReason }
      : {})
  };
}

function schemaSummary(
  apiSlug: string,
  schema: CatalogSchema
): CatalogSchemaSummary {
  return {
    id: `schema:${apiSlug}/${schema.name}`,
    name: schema.name,
    title: schema.title,
    type: schema.type,
    propertyCount: schema.properties.length
  };
}

export function productListItem(api: CatalogApi): CatalogProductListItem {
  const defaultEndpointSlug =
    api.quickStart?.operationSlug ?? api.operations[0]?.slug;
  return {
    id: `api:${api.slug}`,
    slug: api.slug,
    name: api.name,
    provider: api.provider,
    category: api.category,
    featured: api.featured,
    attributionUrl: api.attributionUrl,
    title: api.title,
    summary: api.summary,
    endpointCount: api.operations.length,
    schemaCount: api.schemas.length,
    ...(defaultEndpointSlug ? { defaultEndpointSlug } : {}),
    authTypes: [...new Set(api.auth.map((scheme) => scheme.type))],
    sdk: {
      packageName: api.packageName,
      sdkVersion: api.sdkVersion,
      sdkStatus: api.sdkStatus,
      ...(api.cliName ? { cliName: api.cliName } : {})
    }
  };
}

export function listProductMetadata(): CatalogProductListItem[] {
  return listCatalog().map(productListItem);
}

export function productMetadata(api: CatalogApi): CatalogProductMetadata {
  const { operations, schemas, ...product } = api;
  const defaultEndpointSlug = api.quickStart?.operationSlug ?? operations[0]?.slug;
  return {
    ...product,
    id: `api:${api.slug}`,
    endpointCount: operations.length,
    schemaCount: schemas.length,
    ...(defaultEndpointSlug ? { defaultEndpointSlug } : {}),
    endpoints: operations.map((endpoint) => endpointSummary(api.slug, endpoint)),
    schemas: schemas.map((schema) => schemaSummary(api.slug, schema))
  };
}

export function getProductMetadata(
  apiSlug: string
): CatalogProductMetadata | undefined {
  const api = getCatalogApi(apiSlug);
  return api ? productMetadata(api) : undefined;
}

export function getProductNavigation(
  apiSlug: string
): CatalogProductNavigation | undefined {
  const api = getCatalogApi(apiSlug);
  if (!api) return undefined;
  const defaultEndpointSlug = api.quickStart?.operationSlug ?? api.operations[0]?.slug;

  return {
    operations: api.operations.map((endpoint) => ({
      ...endpointSummary(api.slug, endpoint),
      apiKey: endpoint.apiKey
    })),
    schemas: api.schemas.map((schema) => schemaSummary(api.slug, schema)),
    endpointCount: api.operations.length,
    schemaCount: api.schemas.length,
    executableEndpointCount: api.operations.filter((endpoint) => endpoint.proxyEnabled).length,
    ...(defaultEndpointSlug ? { defaultEndpointSlug } : {}),
    ...(api.schemas[0]?.name ? { defaultSchemaName: api.schemas[0].name } : {})
  };
}

export function catalogApiContext(
  product: CatalogProductMetadata
): CatalogApiContext {
  const {
    id: _id,
    endpointCount: _endpointCount,
    schemaCount: _schemaCount,
    defaultEndpointSlug: _defaultEndpointSlug,
    endpoints,
    schemas,
    ...api
  } = product;
  return {
    ...api,
    operations: endpoints,
    schemas,
    endpointCount: product.endpointCount,
    schemaCount: product.schemaCount,
    executableEndpointCount: endpoints.filter((endpoint) => endpoint.proxyEnabled).length,
    ...(product.defaultEndpointSlug
      ? { defaultEndpointSlug: product.defaultEndpointSlug }
      : {}),
    ...(schemas[0]?.name ? { defaultSchemaName: schemas[0].name } : {})
  };
}

/**
 * Reference routes only need product facts during SSR. The full directory is
 * fetched once after hydration so every route transition does not repeat it.
 */
export function catalogApiPageContext(
  product: CatalogProductMetadata
): CatalogApiContext {
  return {
    ...catalogApiContext(product),
    operations: [],
    schemas: []
  };
}

function schemaNameFromRef(ref: string): string | undefined {
  if (!ref.startsWith(SCHEMA_REF_PREFIX)) return undefined;
  const pointer = ref.slice(SCHEMA_REF_PREFIX.length);
  let name = pointer;
  try {
    name = decodeURIComponent(pointer);
  } catch {
    // A literal percent sign is valid in a JSON Pointer even when it is not a URI escape.
  }
  return name.replaceAll("~1", "/").replaceAll("~0", "~");
}

function referencedSchemaNames(value: unknown): Set<string> {
  const names = new Set<string>();
  const visit = (candidate: unknown) => {
    if (!candidate || typeof candidate !== "object") return;
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    for (const [key, nested] of Object.entries(candidate)) {
      if (key === "$ref" && typeof nested === "string") {
        const name = schemaNameFromRef(nested);
        if (name) names.add(name);
      } else {
        visit(nested);
      }
    }
  };
  visit(value);
  return names;
}

function schemaClosure(
  spec: PontxSpec,
  roots: unknown[]
): Record<string, PontxJsonSchema> {
  const allSchemas = spec.components?.schemas ?? {};
  const pending = [...new Set(roots.flatMap((root) => [...referencedSchemaNames(root)]))];
  const selected = new Map<string, PontxJsonSchema>();

  while (pending.length) {
    const name = pending.shift()!;
    if (selected.has(name)) continue;
    const schema = allSchemas[name];
    if (!schema) continue;
    selected.set(name, schema);
    for (const referenced of referencedSchemaNames(schema)) {
      if (!selected.has(referenced)) pending.push(referenced);
    }
  }

  return Object.fromEntries(selected);
}

function directoryApis(
  spec: PontxSpec,
  product: CatalogProductMetadata,
  locale: Locale,
  selectedOperationId?: string
): Record<string, PontxAPI> {
  const sourceEntries = Object.entries(spec.apis);
  const sourceByOperationId = new Map(
    sourceEntries.map(([key, endpoint]) => [endpoint.operationId, { key, endpoint }])
  );

  return Object.fromEntries(product.endpoints.map((summary) => {
    const source = sourceByOperationId.get(summary.operationId);
    const key = source?.key ?? summary.operationId;
    if (summary.operationId === selectedOperationId && source) {
      return [key, source.endpoint];
    }
    return [key, {
      name: source?.endpoint.name ?? key,
      operationId: summary.operationId,
      summary: summary.title[locale],
      tags: summary.tag ? [summary.tag] : [],
      ...(summary.method ? { method: summary.method } : {}),
      ...(summary.path ? { path: summary.path } : {})
    } as PontxAPI];
  }));
}

function detailSpec(
  spec: PontxSpec,
  product: CatalogProductMetadata,
  locale: Locale,
  roots: unknown[],
  selectedOperationId?: string,
  rootSchemaName?: string,
  includeDirectory = true
): PontxSpec {
  const schemas = schemaClosure(spec, [
    ...roots,
    ...(rootSchemaName
      ? [{ $ref: `${SCHEMA_REF_PREFIX}${encodeURIComponent(rootSchemaName)}` }]
      : [])
  ]);
  return {
    ...spec,
    components: {
      ...(spec.components ?? {}),
      schemas
    },
    apis: includeDirectory
      ? directoryApis(spec, product, locale, selectedOperationId)
      : selectedOperationId
      ? Object.fromEntries(
          Object.entries(spec.apis).filter(
            ([, endpoint]) => endpoint.operationId === selectedOperationId
          )
        )
      : {}
  } as PontxSpec;
}

export function getEndpointMetadata(
  apiSlug: string,
  endpointSlug: string,
  locale: Locale,
  options: { includeDirectory?: boolean } = {}
): EndpointMetadataDetail | undefined {
  const match = getCatalogOperation(apiSlug, endpointSlug);
  if (!match) return undefined;
  const spec = getPontxSpec(apiSlug, locale);
  if (!spec) return undefined;
  const product = productMetadata(match.api);
  const source = Object.values(spec.apis).find(
    (endpoint) => endpoint.operationId === match.operation.operationId
  );
  if (!source) return undefined;
  return {
    locale,
    product: productListItem(match.api),
    endpoint: match.operation,
    pontxSpec: detailSpec(
      spec,
      product,
      locale,
      [source],
      match.operation.operationId,
      undefined,
      options.includeDirectory ?? true
    )
  };
}

export function getSchemaMetadata(
  apiSlug: string,
  schemaName: string,
  locale: Locale,
  options: { includeDirectory?: boolean } = {}
): SchemaMetadataDetail | undefined {
  const match = getCatalogSchema(apiSlug, schemaName);
  if (!match) return undefined;
  const spec = getPontxSpec(apiSlug, locale);
  const sourceSchema = spec?.components?.schemas?.[schemaName];
  if (!spec || !sourceSchema) return undefined;
  return {
    locale,
    product: productListItem(match.api),
    schema: match.schema,
    pontxSpec: detailSpec(
      spec,
      productMetadata(match.api),
      locale,
      [sourceSchema],
      undefined,
      schemaName,
      options.includeDirectory ?? true
    )
  };
}

export function getFullProductMetadata(
  apiSlug: string,
  locale: Locale
): FullProductMetadata | undefined {
  const product = getCatalogApi(apiSlug);
  const pontxSpec = getPontxSpec(apiSlug, locale);
  return product && pontxSpec ? { locale, product, pontxSpec } : undefined;
}
