import { parse } from "yaml";
import type { CatalogApi, CatalogSummary, Locale } from "./types";
import { catalogApiSchema } from "./schema";

const rawCatalogFiles = import.meta.glob(
  "../../../catalog/apis/*.yaml",
  {
    eager: true,
    import: "default",
    query: "?raw"
  }
) as Record<string, string>;

let catalogCache: CatalogApi[] | undefined;

function loadCatalog(): CatalogApi[] {
  if (catalogCache) return catalogCache;

  catalogCache = Object.entries(rawCatalogFiles)
    .map(([file, contents]) => {
      const result = catalogApiSchema.safeParse(parse(contents));
      if (!result.success) {
        throw new Error(
          `Invalid catalog manifest ${file}: ${result.error.message}`
        );
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
  return loadCatalog().map(({ operations, servers: _servers, auth, ...api }) => ({
    ...api,
    operationCount: operations.length,
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

export function searchCatalog(query: string, locale: Locale) {
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
