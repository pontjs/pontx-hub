import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadPontxSpec, validatePontxSpecLocale } from "@pontx/spec";
import { buildCatalogApi } from "../app/lib/catalog/hierarchy";
import { catalogApiSchema } from "../app/lib/catalog/schema";
import type { CatalogApi } from "../app/lib/catalog/types";

async function json(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function loadCatalogShards(
  cacheRoot = resolve(process.cwd(), ".catalog-cache")
): Promise<CatalogApi[]> {
  const manifest = await json(resolve(cacheRoot, "manifest.json")) as {
    metadataCommit: string;
    products: string[];
  };
  return Promise.all(manifest.products.map(async (slug) => {
    const productRoot = resolve(cacheRoot, "products", slug);
    const [product, sdk, specText, localizedProduct, localizedSpecText] = await Promise.all([
      json(resolve(productRoot, "product.json")),
      json(resolve(productRoot, "sdk.json")),
      readFile(resolve(productRoot, "spec.pontx.json"), "utf8"),
      json(resolve(productRoot, "locales/en-US/product.json")),
      readFile(resolve(productRoot, "locales/en-US/spec.pontx.json"), "utf8")
    ]);
    const spec = loadPontxSpec(specText, { expectedName: slug });
    const localizedSpec = loadPontxSpec(localizedSpecText, { expectedName: slug });
    const localeResult = validatePontxSpecLocale(spec, localizedSpec);
    if (!localeResult.valid) throw new Error(`${slug}: localized PontxSpec is not isomorphic`);
    return catalogApiSchema.parse(buildCatalogApi({
      metadataCommit: manifest.metadataCommit,
      product,
      localizedProduct,
      spec,
      localizedSpec,
      sdk
    })) as CatalogApi;
  }));
}
