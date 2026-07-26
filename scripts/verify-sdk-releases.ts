import { manifests } from "./catalog-files";

let verified = 0;
let drafts = 0;

for (const { manifest } of await manifests()) {
  if (manifest.approvedSha256 === "pending") {
    console.log(`${manifest.slug}: draft skipped until its OAS hash is approved`);
    drafts++;
    continue;
  }
  const encoded = encodeURIComponent(manifest.packageName);
  const response = await fetch(
    `https://registry.npmjs.org/${encoded}/${manifest.sdkVersion}`,
    { headers: { Accept: "application/json" } }
  );
  if (!response.ok) {
    throw new Error(
      `${manifest.packageName}@${manifest.sdkVersion} is not prepublished (HTTP ${response.status})`
    );
  }
  const metadata = (await response.json()) as {
    name?: string;
    version?: string;
    engines?: { node?: string };
  };
  if (
    metadata.name !== manifest.packageName ||
    metadata.version !== manifest.sdkVersion
  ) {
    throw new Error(`Registry metadata mismatch for ${manifest.packageName}`);
  }
  console.log(
    `${manifest.slug}: verified ${metadata.name}@${metadata.version} (${metadata.engines?.node ?? "node engine unspecified"})`
  );
  verified++;
}

console.log(`Verified ${verified} prepublished SDK(s); ${drafts} draft(s) skipped.`);
