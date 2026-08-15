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

type ProductSkillFile = {
  path: string;
  sha256: string;
  content: string;
};

class MissingOptionalSourceFileError extends Error {}

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

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function safeSkillPath(path: string): boolean {
  if (!path || path.length > 512 || path.startsWith("/") || path.includes("\\") || path.includes("\0")) {
    return false;
  }
  return path.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

function validateSkillRegistry(value: unknown, productSlugs: string[]): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("skills/registry.json must be an object");
  }
  const registry = value as Record<string, unknown>;
  if (!hasExactKeys(registry, ["formatVersion", "skills"])) {
    throw new Error("skills/registry.json may contain only formatVersion and skills");
  }
  if (registry.formatVersion !== 1 || !Array.isArray(registry.skills)) {
    throw new Error("Unsupported product Skill registry format");
  }

  const products = new Set(productSlugs);
  const names = new Set<string>();
  const apiSlugs = new Set<string>();
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
  const shaPattern = /^[a-f0-9]{64}$/;

  for (const [skillIndex, value] of registry.skills.entries()) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`skills/registry.json skills[${skillIndex}] must be an object`);
    }
    const skill = value as Record<string, unknown>;
    if (!hasExactKeys(skill, [
      "name", "apiSlug", "version", "description", "license", "contentHash", "files"
    ])) {
      throw new Error(`skills/registry.json skills[${skillIndex}] has unsupported fields`);
    }
    if (typeof skill.apiSlug !== "string" || !slugPattern.test(skill.apiSlug) || !products.has(skill.apiSlug)) {
      throw new Error(`skills/registry.json skills[${skillIndex}] has an unknown apiSlug`);
    }
    if (skill.name !== `pontx-${skill.apiSlug}` || names.has(skill.name)) {
      throw new Error(`${skill.apiSlug}: product Skill name is invalid or duplicated`);
    }
    if (apiSlugs.has(skill.apiSlug)) {
      throw new Error(`${skill.apiSlug}: product Skill apiSlug is duplicated`);
    }
    names.add(skill.name);
    apiSlugs.add(skill.apiSlug);
    if (typeof skill.version !== "string" || !semverPattern.test(skill.version)) {
      throw new Error(`${skill.name}: version must be valid SemVer`);
    }
    if (typeof skill.description !== "string" || !skill.description.trim() || skill.description.length > 300) {
      throw new Error(`${skill.name}: description must contain at most 300 characters`);
    }
    if (typeof skill.license !== "string" || !skill.license.trim()) {
      throw new Error(`${skill.name}: license must be a non-empty string`);
    }
    if (typeof skill.contentHash !== "string" || !shaPattern.test(skill.contentHash)) {
      throw new Error(`${skill.name}: contentHash must be a lowercase SHA-256 digest`);
    }
    if (!Array.isArray(skill.files) || skill.files.length === 0) {
      throw new Error(`${skill.name}: files must be a non-empty array`);
    }

    const files = skill.files.map((value, fileIndex): ProductSkillFile => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${skill.name}: files[${fileIndex}] must be an object`);
      }
      const file = value as Record<string, unknown>;
      if (!hasExactKeys(file, ["path", "sha256", "content"])) {
        throw new Error(`${skill.name}: files[${fileIndex}] has unsupported fields`);
      }
      if (typeof file.path !== "string" || !safeSkillPath(file.path)) {
        throw new Error(`${skill.name}: files[${fileIndex}] has an unsafe path`);
      }
      if (typeof file.content !== "string" || typeof file.sha256 !== "string" || !shaPattern.test(file.sha256)) {
        throw new Error(`${skill.name}: ${String(file.path)} has invalid content or sha256`);
      }
      const actualFileHash = createHash("sha256").update(file.content, "utf8").digest("hex");
      if (file.sha256 !== actualFileHash) {
        throw new Error(`${skill.name}: ${file.path} sha256 does not match its content`);
      }
      return file as ProductSkillFile;
    });
    const paths = files.map((file) => file.path);
    const sortedPaths = [...paths].sort((left, right) =>
      Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"))
    );
    if (new Set(paths).size !== paths.length || JSON.stringify(paths) !== JSON.stringify(sortedPaths)) {
      throw new Error(`${skill.name}: files must have unique paths sorted by path`);
    }
    if (!paths.includes("SKILL.md")) {
      throw new Error(`${skill.name}: files must include SKILL.md`);
    }
    const contentHash = createHash("sha256");
    for (const file of files) {
      contentHash.update(file.path, "utf8");
      contentHash.update("\0");
      contentHash.update(file.content, "utf8");
      contentHash.update("\0");
    }
    if (contentHash.digest("hex") !== skill.contentHash) {
      throw new Error(`${skill.name}: contentHash does not match its files`);
    }
  }
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
      if (response.status === 404 && path === "skills/registry.json") {
        throw new MissingOptionalSourceFileError(`Unable to sync ${path}: HTTP 404`);
      }
      if (!response.ok) throw new Error(`Unable to sync ${path}: HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
  };
}

async function readOptionalSkillRegistry(source: Source, index: ProductIndex): Promise<Uint8Array | undefined> {
  let bytes: Uint8Array;
  try {
    bytes = await source.read("skills/registry.json");
  } catch (error) {
    if (
      error instanceof MissingOptionalSourceFileError ||
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      console.warn("Product Skill registry is unavailable; continuing with the universal Skill only.");
      return undefined;
    }
    throw error;
  }

  try {
    validateSkillRegistry(parseJson(bytes, "skills/registry.json"), index.products);
    return bytes;
  } catch (error) {
    console.warn(
      `Product Skill registry is invalid; continuing with the universal Skill only: ${error instanceof Error ? error.message : String(error)}`
    );
    return undefined;
  }
}

const source = await localSource() ?? remoteSource();
const indexBytes = await source.read("catalog/products.json");
const index = validateIndex(parseJson(indexBytes, "catalog/products.json"));
const skillRegistryBytes = await readOptionalSkillRegistry(source, index);

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
if (skillRegistryBytes) {
  const destination = resolve(cacheRoot, "skills/registry.json");
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, skillRegistryBytes);
}

console.log(
  `Synced ${index.products.length} product shards${skillRegistryBytes ? " and the product Skill registry" : ""} from ${source.description} at ${source.commit}.`
);
