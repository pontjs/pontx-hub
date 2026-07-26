import { fetchSource, manifests, sha256 } from "./catalog-files";

let changed = 0;

for (const { manifest } of await manifests()) {
  const digest = sha256(await fetchSource(manifest.sourceUrl));
  if (manifest.approvedSha256 === "pending") {
    console.log(`${manifest.slug}: candidate ${digest} (awaiting initial review)`);
    changed++;
  } else if (manifest.approvedSha256 !== digest) {
    console.log(
      `${manifest.slug}: candidate ${digest} (approved ${manifest.approvedSha256})`
    );
    changed++;
  } else {
    console.log(`${manifest.slug}: unchanged ${digest}`);
  }
}

console.log(`${changed} candidate update(s); no catalog version was activated.`);
