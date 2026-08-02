import type {
  CatalogApi,
  CatalogSummary,
  GlobalSearchKind,
  GlobalSearchResponse,
  Locale
} from "./types";
import { catalogApiSchema } from "./schema";
import { buildSearchResponse } from "./search";

const rawCatalogFiles = import.meta.glob(
  "../../../.catalog-cache/catalog.json",
  {
    eager: true,
    import: "default",
    query: "?raw"
  }
) as Record<string, string>;

let catalogCache: CatalogApi[] | undefined;

function loadCatalog(): CatalogApi[] {
  if (catalogCache) return catalogCache;

  const entry = Object.entries(rawCatalogFiles)[0];
  if (!entry) {
    throw new Error("Catalog cache is missing; run pnpm metadata:sync");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(entry[1]);
  } catch {
    throw new Error("Catalog cache is not valid JSON");
  }
  const apis = (payload as { apis?: unknown }).apis;
  if (!Array.isArray(apis)) throw new Error("Catalog cache has no API list");

  catalogCache = apis
    .map((api, index) => {
      const result = catalogApiSchema.safeParse(api);
      if (!result.success) {
        throw new Error(`Invalid metadata API at index ${index}: ${result.error.message}`);
      }
      return result.data as CatalogApi;
    })
    .sort((left, right) => {
      if (left.featured !== right.featured) return left.featured ? -1 : 1;
      return left.name.localeCompare(right.name);
    });

  return catalogCache;
}

export function listCatalog(): CatalogApi[] {
  return loadCatalog();
}

export function listCatalogSummaries(): CatalogSummary[] {
  return loadCatalog().map(({ operations, schemas, servers: _servers, auth, ...api }) => ({
    ...api,
    operationCount: operations.length,
    schemaCount: schemas.length,
    defaultOperationSlug: operations[0].slug,
    authTypes: [...new Set(auth.map((scheme) => scheme.type))]
  }));
}

export function getCatalogApi(slug: string): CatalogApi | undefined {
  return loadCatalog().find((api) => api.slug === slug);
}

export function getCatalogOperation(apiSlug: string, operationSlug: string) {
  const api = getCatalogApi(apiSlug);
  const operation = api?.operations.find((item) => item.slug === operationSlug);
  return api && operation ? { api, operation } : undefined;
}

export function getCatalogSchema(apiSlug: string, schemaName: string) {
  const api = getCatalogApi(apiSlug);
  const schema = api?.schemas.find((item) => item.name === schemaName);
  return api && schema ? { api, schema } : undefined;
}

export function searchCatalogOperations(query: string, locale: Locale) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];

  return loadCatalog().flatMap((api) =>
    api.operations
      .filter((operation) => {
        const haystack = [
          api.name,
          api.provider,
          api.title[locale],
          api.summary[locale],
          operation.operationId,
          operation.title[locale],
          operation.description[locale],
          operation.method,
          operation.path,
          operation.tag
        ]
          .join(" ")
          .toLocaleLowerCase();
        return haystack.includes(needle);
      })
      .map((operation) => ({
        apiSlug: api.slug,
        apiName: api.name,
        operationSlug: operation.slug,
        operationId: operation.operationId,
        method: operation.method,
        path: operation.path,
        title: operation.title[locale],
        description: operation.description[locale]
      }))
  );
}

export function searchCatalog(
  query: string,
  locale: Locale,
  options: {
    kinds?: GlobalSearchKind[];
    limit?: number;
    offset?: number;
  } = {}
): GlobalSearchResponse {
  return buildSearchResponse(loadCatalog(), query, locale, options);
}
