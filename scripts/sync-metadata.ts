import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { loadPontxSpec, validatePontxSpecLocale } from "@pontx/spec";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cacheRoot = resolve(repositoryRoot, ".catalog-cache");
const commitPattern = /^[a-f0-9]{40}$/;

type ProductIndex = {
  formatVersion: 1;
  defaultLocale: "zh-CN";
  locales: string[];
  products: string[];
};

type Source = {
  description: string;
  commit: string;
  read(relativePath: string): Promise<Uint8Array>;
};

function parseJson(bytes: Uint8Array, path: string): unknown {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateIndex(value: unknown): ProductIndex {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("catalog/products.json must be an object");
  }
  const index = value as Record<string, unknown>;
  const expectedKeys = ["defaultLocale", "formatVersion", "locales", "products"];
  if (JSON.stringify(Object.keys(index).sort()) !== JSON.stringify(expectedKeys)) {
    throw new Error("catalog/products.json may contain only formatVersion, defaultLocale, locales, and products");
  }
  if (index.formatVersion !== 1 || index.defaultLocale !== "zh-CN") {
    throw new Error("Unsupported metadata hierarchy version or default locale");
  }
  if (!Array.isArray(index.locales) || !index.locales.includes("en-US")) {
    throw new Error("Metadata hierarchy must publish en-US");
  }
  if (!Array.isArray(index.products) || !index.products.length ||
      index.products.some((slug) => typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
    throw new Error("catalog/products.json has an invalid product list");
  }
  if (new Set(index.products).size !== index.products.length) {
    throw new Error("catalog/products.json contains duplicate products");
  }
  return index as ProductIndex;
}

async function localSource(): Promise<Source | undefined> {
  const configured = process.env.METADATA_REPO_LOCAL_PATH;
  const candidates = configured
    ? [resolve(configured)]
    : [
        resolve(repositoryRoot, "../pontx-api-metadata"),
        resolve(repositoryRoot, "../metadata")
      ];
  for (const candidate of candidates) {
    const root = candidate.endsWith("products.json")
      ? resolve(dirname(candidate), "..")
      : candidate;
    try {
      await access(resolve(root, "catalog/products.json"));
      const configuredCommit = process.env.METADATA_REPO_COMMIT;
      const actualCommit = (await execFileAsync(
        "git", ["rev-parse", "HEAD"], { cwd: root }
      )).stdout.trim();
      if (configuredCommit && configuredCommit !== actualCommit) {
        throw new Error(
          `Local metadata is at ${actualCommit}, but METADATA_REPO_COMMIT requests ${configuredCommit}`
        );
      }
      const commit = actualCommit;
      if (!commitPattern.test(commit)) {
        throw new Error(`Local metadata commit is invalid: ${commit}`);
      }
      return {
        description: root,
        commit,
        read: (path) => readFile(resolve(root, path))
      };
    } catch (error) {
      if (configured) throw error;
    }
  }
  return undefined;
}

function remoteSource(): Source {
  const commit = process.env.METADATA_REPO_COMMIT;
  if (!commitPattern.test(commit ?? "")) {
    throw new Error(
      "Remote metadata sync requires METADATA_REPO_COMMIT to be an exact 40-character commit SHA"
    );
  }
  const rawBase = (
    process.env.METADATA_REPO_RAW_URL ??
    `https://raw.githubusercontent.com/pontjs/pontx-api-metadata/${commit}`
  ).replace(/\/$/, "");
  return {
    description: rawBase,
    commit: commit!,
    async read(path) {
      const url = `${rawBase}/${path}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Unable to sync ${path}: HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
  };
}

const source = await localSource() ?? remoteSource();
const indexBytes = await source.read("catalog/products.json");
const index = validateIndex(parseJson(indexBytes, "catalog/products.json"));

const files = await Promise.all(index.products.map(async (slug) => {
  const prefix = `products/${slug}`;
  const required = [
    `${prefix}/product.json`,
    `${prefix}/spec.pontx.json`,
    `${prefix}/sdk.json`,
    ...index.locales.flatMap((locale) => [
      `${prefix}/locales/${locale}/product.json`,
      `${prefix}/locales/${locale}/spec.pontx.json`
    ])
  ];
  const entries = await Promise.all(required.map(async (path) => [path, await source.read(path)] as const));
  const byPath = new Map(entries);
  const specPath = `${prefix}/spec.pontx.json`;
  const spec = loadPontxSpec(Buffer.from(byPath.get(specPath)!).toString("utf8"), { expectedName: slug });
  const sdk = parseJson(byPath.get(`${prefix}/sdk.json`)!, `${prefix}/sdk.json`) as {
    spec?: { path?: string; sha256?: string; metadataCommit?: string | null };
  };
  const actualSha = createHash("sha256").update(byPath.get(specPath)!).digest("hex");
  if (sdk.spec?.path !== specPath || sdk.spec.sha256 !== actualSha) {
    throw new Error(`${slug}: sdk.json does not pin the canonical PontxSpec bytes`);
  }
  if (sdk.spec.metadataCommit && !commitPattern.test(sdk.spec.metadataCommit)) {
    throw new Error(`${slug}: SDK metadata evidence has an invalid commit`);
  }
  for (const locale of index.locales) {
    const localePath = `${prefix}/locales/${locale}/spec.pontx.json`;
    const localizedSpec = loadPontxSpec(
      Buffer.from(byPath.get(localePath)!).toString("utf8"),
      { expectedName: slug }
    );
    const result = validatePontxSpecLocale(spec, localizedSpec);
    if (!result.valid) {
      throw new Error(`${slug}/${locale}: ${result.issues[0]?.message ?? "locale structure mismatch"}`);
    }
  }
  return entries;
}));

await rm(cacheRoot, { recursive: true, force: true });
await mkdir(cacheRoot, { recursive: true });
await writeFile(resolve(cacheRoot, "manifest.json"), `${JSON.stringify({
  formatVersion: 1,
  metadataCommit: source.commit,
  defaultLocale: index.defaultLocale,
  locales: index.locales,
  products: index.products
}, null, 2)}\n`);
for (const productEntries of files) {
  for (const [path, bytes] of productEntries) {
    const destination = resolve(cacheRoot, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
  }
}

console.log(
  `Synced ${index.products.length} product shards from ${source.description} at ${source.commit}.`
);
