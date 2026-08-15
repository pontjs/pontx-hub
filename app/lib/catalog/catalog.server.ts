import { loadPontxSpec, validatePontxSpecLocale, type PontxSpec } from "@pontx/spec";
import type {
  CatalogApi,
  CatalogSummary,
  GlobalSearchKind,
  GlobalSearchResponse,
  Locale
} from "./types";
import { catalogApiSchema } from "./schema";
import { buildSearchResponse } from "./search";
import { buildCatalogApi } from "./hierarchy";

const rawManifestFiles = import.meta.glob(
  "../../../.catalog-cache/manifest.json",
  { eager: true, import: "default", query: "?raw" }
) as Record<string, string>;
const rawProductFiles = import.meta.glob(
  "../../../.catalog-cache/products/*/*.json",
  { eager: true, import: "default", query: "?raw" }
) as Record<string, string>;
const rawLocaleFiles = import.meta.glob(
  "../../../.catalog-cache/products/*/locales/en-US/*.json",
  { eager: true, import: "default", query: "?raw" }
) as Record<string, string>;

type HierarchyManifest = {
  formatVersion: 1;
  metadataCommit: string;
  defaultLocale: "zh-CN";
  locales: string[];
  products: string[];
};

type LoadedHierarchy = {
  metadataCommit: string;
  catalog: CatalogApi[];
  specs: Map<string, { zh: PontxSpec; en: PontxSpec }>;
};

let hierarchyCache: LoadedHierarchy | undefined;

function parse(raw: string | undefined, context: string): any {
  if (!raw) throw new Error(`Metadata cache is missing ${context}; run pnpm metadata:sync`);
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Metadata cache file ${context} is not valid JSON`);
  }
}

function rawFile(files: Record<string, string>, suffix: string): string | undefined {
  return Object.entries(files).find(([path]) => path.endsWith(suffix))?.[1];
}

function loadHierarchy(): LoadedHierarchy {
  if (hierarchyCache) return hierarchyCache;
  const manifest = parse(
    Object.values(rawManifestFiles)[0],
    "manifest.json"
  ) as HierarchyManifest;
  if (
    manifest.formatVersion !== 1 ||
    !/^[a-f0-9]{40}$/.test(manifest.metadataCommit) ||
    manifest.defaultLocale !== "zh-CN" ||
    !manifest.locales.includes("en-US") ||
    !Array.isArray(manifest.products)
  ) {
    throw new Error("Metadata hierarchy manifest is invalid");
  }

  const specs = new Map<string, { zh: PontxSpec; en: PontxSpec }>();
  const catalog = manifest.products.map((slug, index) => {
    const prefix = `/products/${slug}`;
    const product = parse(rawFile(rawProductFiles, `${prefix}/product.json`), `${prefix}/product.json`);
    const sdk = parse(rawFile(rawProductFiles, `${prefix}/sdk.json`), `${prefix}/sdk.json`);
    const spec = loadPontxSpec(
      rawFile(rawProductFiles, `${prefix}/spec.pontx.json`),
      { expectedName: slug }
    );
    const localizedProduct = parse(
      rawFile(rawLocaleFiles, `${prefix}/locales/en-US/product.json`),
      `${prefix}/locales/en-US/product.json`
    );
    const localizedSpec = loadPontxSpec(
      rawFile(rawLocaleFiles, `${prefix}/locales/en-US/spec.pontx.json`),
      { expectedName: slug }
    );
    const localeResult = validatePontxSpecLocale(spec, localizedSpec);
    if (!localeResult.valid) {
      throw new Error(`Invalid localized PontxSpec for ${slug}: ${localeResult.issues[0]?.message}`);
    }
    specs.set(slug, { zh: spec, en: localizedSpec });
    const api = buildCatalogApi({
      metadataCommit: manifest.metadataCommit,
      product,
      localizedProduct,
      spec,
      localizedSpec,
      sdk
    });
    const result = catalogApiSchema.safeParse(api);
    if (!result.success) {
      throw new Error(`Invalid metadata product ${slug} at index ${index}: ${result.error.message}`);
    }
    return result.data as CatalogApi;
  }).sort((left, right) => {
    if (left.featured !== right.featured) return left.featured ? -1 : 1;
    return left.name.localeCompare(right.name);
  });

  hierarchyCache = { metadataCommit: manifest.metadataCommit, catalog, specs };
  return hierarchyCache;
}

export function getCatalogMetadataCommit(): string {
  return loadHierarchy().metadataCommit;
}

export function listCatalog(): CatalogApi[] {
  return loadHierarchy().catalog;
}

export function listCatalogSummaries(): CatalogSummary[] {
  return listCatalog().map(({ operations, schemas, servers: _servers, auth, ...api }) => ({
    ...api,
    operationCount: operations.length,
    schemaCount: schemas.length,
    defaultOperationSlug: api.quickStart?.operationSlug ?? operations[0].slug,
    authTypes: [...new Set(auth.map((scheme) => scheme.type))]
  }));
}

export function getCatalogApi(slug: string): CatalogApi | undefined {
  return listCatalog().find((api) => api.slug === slug);
}

export function getPontxSpec(slug: string, locale: Locale): PontxSpec | undefined {
  return loadHierarchy().specs.get(slug)?.[locale];
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

  return listCatalog().flatMap((api) =>
    api.operations
      .filter((operation) => [
        api.name,
        api.provider,
        api.title[locale],
        api.summary[locale],
        operation.operationId,
        operation.title[locale],
        operation.description[locale],
        operation.style,
        operation.method,
        operation.path,
        operation.tag
      ].join(" ").toLocaleLowerCase().includes(needle))
      .map((operation) => ({
        apiSlug: api.slug,
        apiName: api.name,
        operationSlug: operation.slug,
        operationId: operation.operationId,
        style: operation.style,
        ...(operation.method ? { method: operation.method } : {}),
        ...(operation.path ? { path: operation.path } : {}),
        title: operation.title[locale],
        description: operation.description[locale]
      }))
  );
}

export function searchCatalog(
  query: string,
  locale: Locale,
  options: { kinds?: GlobalSearchKind[]; limit?: number; offset?: number } = {}
): GlobalSearchResponse {
  return buildSearchResponse(listCatalog(), query, locale, options);
}
