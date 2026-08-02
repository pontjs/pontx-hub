import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type CatalogSdk = {
  slug: string;
  packageName: string;
  sdkVersion: string;
  sdkStatus: "planned" | "published";
};

const catalog = JSON.parse(
  await readFile(resolve(process.cwd(), ".catalog-cache/catalog.json"), "utf8")
) as { apis: CatalogSdk[] };

let verified = 0;
let drafts = 0;

for (const api of catalog.apis) {
  if (api.sdkStatus !== "published") {
    console.log(`${api.slug}: planned SDK skipped until the operator publishes it`);
    drafts++;
    continue;
  }
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
  console.log(
    `${api.slug}: verified ${metadata.name}@${metadata.version} (${metadata.engines?.node ?? "node engine unspecified"})`
  );
  verified++;
}

console.log(`Verified ${verified} prepublished SDK(s); ${drafts} draft(s) skipped.`);
