import { readFileSync } from "node:fs";
import path from "node:path";
import { DOC_SLUGS } from "../app/lib/docs";
import { operationSlug } from "../app/lib/catalog/operation-slug";

type HierarchyManifest = {
  formatVersion: 1;
  products: string[];
};

type CachedSpec = {
  apis?: Record<string, { operationId?: string }>;
  components?: { schemas?: Record<string, unknown> };
};

type CachedSdk = {
  package?: { status?: string };
};

type SkillRegistry = {
  formatVersion: 1;
  skills: Array<{ name: string }>;
};

const locales = ["zh", "en"] as const;

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function cacheFile(cacheDirectory: string, ...segments: string[]): string {
  return path.join(cacheDirectory, ...segments);
}

function productResourcePaths(cacheDirectory: string, slug: string): string[] {
  const spec = readJson<CachedSpec>(
    cacheFile(cacheDirectory, "products", slug, "spec.pontx.json")
  );
  const sdk = readJson<CachedSdk>(
    cacheFile(cacheDirectory, "products", slug, "sdk.json")
  );
  const paths = [`/apis/${slug}`];

  if (sdk.package?.status === "published") {
    paths.push(`/sdks/${slug}`);
  }

  for (const endpoint of Object.values(spec.apis ?? {})) {
    if (!endpoint.operationId) {
      throw new Error(`${slug}: cached Endpoint is missing operationId`);
    }
    paths.push(`/apis/${slug}/${operationSlug(endpoint.operationId)}`);
  }

  for (const schemaName of Object.keys(spec.components?.schemas ?? {})) {
    paths.push(`/apis/${slug}/schemas/${encodeURIComponent(schemaName)}`);
  }

  return paths;
}

function hierarchyManifest(cacheDirectory: string): HierarchyManifest {
  const manifest = readJson<HierarchyManifest>(
    cacheFile(cacheDirectory, "manifest.json")
  );
  if (manifest.formatVersion !== 1 || !Array.isArray(manifest.products)) {
    throw new Error("Metadata hierarchy manifest is invalid");
  }
  return manifest;
}

export function listPublicPrerenderPaths(
  cacheDirectory = path.resolve(".catalog-cache")
): string[] {
  const manifest = hierarchyManifest(cacheDirectory);
  const registry = readJson<SkillRegistry>(
    cacheFile(cacheDirectory, "skills", "registry.json")
  );
  const localeIndependentPaths = [
    "",
    ...DOC_SLUGS.map((slug) =>
      slug === "overview" ? "/docs" : `/docs/${slug}`
    ),
    "/skills",
    "/skills/pontx-hub",
    ...registry.skills.map((skill) => `/skills/${skill.name}`),
    ...manifest.products.flatMap((slug) =>
      productResourcePaths(cacheDirectory, slug)
    )
  ];

  return locales.flatMap((locale) =>
    localeIndependentPaths.map((resourcePath) => `/${locale}${resourcePath}`)
  );
}

export function listStaticResourcePrerenderPaths(
  cacheDirectory = path.resolve(".catalog-cache")
): string[] {
  return hierarchyManifest(cacheDirectory).products.map(
    (slug) => `/api/ui/v1/products/${encodeURIComponent(slug)}/navigation`
  );
}

export function listAllPrerenderPaths(
  cacheDirectory = path.resolve(".catalog-cache")
): string[] {
  return [
    ...listPublicPrerenderPaths(cacheDirectory),
    ...listStaticResourcePrerenderPaths(cacheDirectory)
  ];
}
