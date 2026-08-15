import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import type { CatalogApi } from "../app/lib/catalog/types";
import { generateSdkSnippet } from "../app/lib/sdk-codegen";
import { loadCatalogShards } from "./load-catalog";

const execFileAsync = promisify(execFile);

const catalog = await loadCatalogShards();

async function registryVersion(api: CatalogApi) {
  const encoded = encodeURIComponent(api.packageName);
  const response = await fetch(
    `https://registry.npmjs.org/${encoded}/${api.sdkVersion}`,
    { headers: { Accept: "application/json" } }
  );
  if (!response.ok) {
    throw new Error(
      `${api.packageName}@${api.sdkVersion} is not prepublished (HTTP ${response.status})`
    );
  }
  const metadata = (await response.json()) as {
    name?: string;
    version?: string;
    engines?: { node?: string };
  };
  if (
    metadata.name !== api.packageName ||
    metadata.version !== api.sdkVersion
  ) {
    throw new Error(`Registry metadata mismatch for ${api.packageName}`);
  }
  return metadata;
}

function declaredApiLockKeys(api: CatalogApi): string[] {
  const contract = api.sdkContract;
  if (!contract) return [];
  return contract.operations.map((operationId) => {
    const operation = api.operations.find(
      (candidate) => candidate.operationId === operationId
    );
    if (!operation) {
      throw new Error(`${api.slug}: unknown SDK operation ${operationId}`);
    }
    if (!operation.tag) return operationId;
    const controller = contract.controllers[operation.tag];
    if (!controller) throw new Error(`${api.slug}: no SDK controller for explicit tag ${operation.tag}`);
    return `${controller}/${operationId}`;
  }).sort();
}

async function verifyInstalledSdk(api: CatalogApi, projectDirectory: string) {
  const packageDirectory = resolve(
    projectDirectory,
    "node_modules",
    ...api.packageName.split("/")
  );
  const apiLock = JSON.parse(
    await readFile(resolve(packageDirectory, "dist/bin/api-lock.json"), "utf8")
  ) as { apis?: Record<string, unknown> };
  const packagedKeys = Object.keys(apiLock.apis ?? {}).sort();
  const declaredKeys = declaredApiLockKeys(api);
  if (JSON.stringify(packagedKeys) !== JSON.stringify(declaredKeys)) {
    const missing = packagedKeys.filter((key) => !declaredKeys.includes(key));
    const unexpected = declaredKeys.filter((key) => !packagedKeys.includes(key));
    throw new Error(
      `${api.packageName}@${api.sdkVersion} SDK contract differs from api-lock.json` +
      `; undeclared package APIs: ${missing.join(", ") || "none"}` +
      `; missing package APIs: ${unexpected.join(", ") || "none"}`
    );
  }

  for (const operationId of api.sdkContract!.operations) {
    const operation = api.operations.find(
      (candidate) => candidate.operationId === operationId
    )!;
    const request = operation.requestExamples[0]?.request ?? {
      path: {},
      query: {},
      headers: {}
    };
    const code = generateSdkSnippet(api, operation, request);
    await writeFile(
      resolve(projectDirectory, "generated", `${api.slug}-${operation.slug}.mts`),
      `${code}\n`
    );
  }
}

const published: CatalogApi[] = [];
let drafts = 0;
let registryOnly = 0;

for (const api of catalog) {
  if (api.sdkStatus !== "published") {
    console.log(`${api.slug}: planned SDK skipped until the operator publishes it`);
    drafts++;
    continue;
  }
  const metadata = await registryVersion(api);
  console.log(
    `${api.slug}: verified ${metadata.name}@${metadata.version} (${metadata.engines?.node ?? "node engine unspecified"})`
  );
  if (!api.sdkContract) {
    console.warn(
      `${api.slug}: sdkContract is not available yet; install/typecheck verification skipped`
    );
    registryOnly++;
    continue;
  }
  published.push(api);
}

if (published.length) {
  const projectDirectory = await mkdtemp(join(tmpdir(), "pontx-sdk-verify-"));
  try {
    await mkdir(resolve(projectDirectory, "generated"));
    await writeFile(
      resolve(projectDirectory, "package.json"),
      `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`
    );
    const packages = published.map(
      (api) => `${api.packageName}@${api.sdkVersion}`
    );
    await execFileAsync("npm", [
      "install",
      "--ignore-scripts",
      "--legacy-peer-deps",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      "typescript@5.9.3",
      "@types/node@22",
      ...packages
    ], { cwd: projectDirectory });

    for (const api of published) {
      await verifyInstalledSdk(api, projectDirectory);
    }
    await writeFile(
      resolve(projectDirectory, "tsconfig.json"),
      `${JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM"],
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: ["node"]
        },
        include: ["generated/**/*.mts"]
      }, null, 2)}\n`
    );
    await execFileAsync(
      resolve(projectDirectory, "node_modules/.bin/tsc"),
      ["--project", "tsconfig.json"],
      { cwd: projectDirectory }
    );
    console.log(
      `Installed and typechecked ${published.reduce(
        (total, api) => total + api.sdkContract!.operations.length,
        0
      )} generated snippet(s) across ${published.length} exact SDK package version(s).`
    );
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
}

console.log(
  `Verified ${published.length + registryOnly} prepublished SDK(s); ` +
  `${registryOnly} registry-only rollout check(s); ${drafts} draft(s) skipped.`
);
