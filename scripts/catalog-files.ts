import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";

export type CatalogManifest = {
  slug: string;
  sourceUrl: string;
  approvedSha256: string;
  packageName: string;
  sdkVersion: string;
};

export const catalogDirectory = resolve(process.cwd(), "catalog/apis");

export async function manifests(): Promise<
  Array<{ path: string; manifest: CatalogManifest }>
> {
  const names = (await readdir(catalogDirectory))
    .filter((name) => name.endsWith(".yaml"))
    .sort();
  return Promise.all(
    names.map(async (name) => {
      const path = resolve(catalogDirectory, name);
      return {
        path,
        manifest: parse(await readFile(path, "utf8")) as CatalogManifest
      };
    })
  );
}

export async function fetchSource(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Pontx-Hub-Catalog/0.1" }
  });
  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: HTTP ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
