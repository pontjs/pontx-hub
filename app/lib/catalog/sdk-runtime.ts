import type { CatalogApi } from "./types";

/**
 * Runtime guidance comes from the version-bound SDK quality matrix. It must
 * never claim a lower Node.js version than the package was actually tested on.
 */
export function sdkRuntime(api: Pick<CatalogApi, "sdkQuality">): string {
  const testedVersions = api.sdkQuality?.nodeVersions
    .map((version) => Number.parseInt(version, 10))
    .filter(Number.isSafeInteger) ?? [];
  return testedVersions.length
    ? `node>=${Math.min(...testedVersions)}`
    : "node";
}
