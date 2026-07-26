import { readFile, writeFile } from "node:fs/promises";
import { fetchSource, manifests, sha256 } from "./catalog-files";

const [slug, candidate] = process.argv.slice(2);
if (!slug || !/^[a-f0-9]{64}$/.test(candidate ?? "")) {
  throw new Error("Usage: pnpm catalog:accept <slug> <candidate-sha256>");
}

const entry = (await manifests()).find((item) => item.manifest.slug === slug);
if (!entry) throw new Error(`Unknown catalog API: ${slug}`);

const actual = sha256(await fetchSource(entry.manifest.sourceUrl));
if (actual !== candidate) {
  throw new Error(`Candidate changed: expected ${candidate}, fetched ${actual}`);
}

const source = await readFile(entry.path, "utf8");
const next = source.replace(
  /^approvedSha256:\s*(?:pending|[a-f0-9]{64})$/m,
  `approvedSha256: ${actual}`
);
if (source === next) throw new Error("approvedSha256 field was not found");
await writeFile(entry.path, next, "utf8");
console.log(`Accepted ${slug} source ${actual}. Review and commit the manifest diff.`);
