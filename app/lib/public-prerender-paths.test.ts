import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listSitemapUrls } from "~/lib/sitemap.server";
import {
  listAllPrerenderPaths,
  listPublicPrerenderPaths,
  listStaticResourcePrerenderPaths
} from "../../scripts/public-prerender-paths";

const cacheDirectory = path.resolve(".catalog-cache");

describe("public prerender paths", () => {
  it("prerenders every canonical sitemap page and no additional HTML page", () => {
    expect(listPublicPrerenderPaths(cacheDirectory).sort()).toEqual(
      listSitemapUrls().map(({ path: sitemapPath }) => sitemapPath).sort()
    );
  });

  it("also prerenders one CDN-served directory resource per API", () => {
    const resourcePaths = listStaticResourcePrerenderPaths(cacheDirectory);
    const apiSlugs = JSON.parse(
      readFileSync(path.join(cacheDirectory, "manifest.json"), "utf8")
    ).products as string[];

    expect(resourcePaths).toHaveLength(apiSlugs.length);
    expect(resourcePaths).toEqual(
      apiSlugs.map(
        (slug) => `/api/ui/v1/products/${encodeURIComponent(slug)}/navigation`
      )
    );
  });

  it("never prerenders transient, account, auth, search, or Playground state", () => {
    const paths = listAllPrerenderPaths(cacheDirectory);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((prerenderPath) => !prerenderPath.includes("?"))).toBe(true);
    expect(paths.some((prerenderPath) => /\/(?:account|sign-in)(?:\/|$)/.test(prerenderPath))).toBe(false);
    expect(paths.some((prerenderPath) => /\/(?:auth|ai|playground)(?:\/|$)/.test(prerenderPath))).toBe(false);
  });
});
