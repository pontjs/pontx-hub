import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const localFile =
  process.env.METADATA_REPO_LOCAL_PATH ??
  resolve(process.cwd(), "../pontx-api-metadata/catalog/catalog.json");
let payload: unknown;
try {
  await access(localFile);
  payload = JSON.parse(await readFile(localFile, "utf8"));
  console.log(`Read Pontx API metadata from ${localFile}.`);
} catch {
  const rawBase = (
    process.env.METADATA_REPO_RAW_URL ??
    "https://raw.githubusercontent.com/pontjs/pontx-api-metadata/main"
  ).replace(/\/$/, "");
  const response = await fetch(`${rawBase}/catalog/catalog.json`, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Unable to sync Pontx API metadata: HTTP ${response.status}`);
  }
  payload = await response.json();
  console.log(`Read Pontx API metadata from ${rawBase}.`);
}
if (
  !payload ||
  typeof payload !== "object" ||
  (payload as { version?: unknown }).version !== 1 ||
  !Array.isArray((payload as { apis?: unknown }).apis)
) {
  throw new Error("Remote Pontx API metadata has an invalid catalog payload");
}

const cacheDirectory = resolve(process.cwd(), ".catalog-cache");
await mkdir(cacheDirectory, { recursive: true });
await writeFile(
  resolve(cacheDirectory, "catalog.json"),
  `${JSON.stringify(payload, null, 2)}\n`
);
console.log(
  `Synced ${(payload as { apis: unknown[] }).apis.length} APIs from Pontx API Metadata.`
);
