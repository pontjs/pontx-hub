import { describe, expect, it } from "vitest";
import { loader as robotsLoader } from "./robots";
import { loader as sitemapLoader } from "./sitemap";
import { readFile } from "node:fs/promises";
import { listCatalog } from "~/lib/catalog/catalog.server";

describe("SEO resource routes", () => {
  it("serves robots.txt as a plain-text resource", async () => {
    const response = robotsLoader();
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Sitemap: https://pontx.dev/sitemap.xml");
    expect(body).not.toContain("<!DOCTYPE html>");
  });

  it("serves a bilingual XML sitemap with endpoint and Schema alternates", async () => {
    const response = sitemapLoader();
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(body).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(body).toContain("/zh/apis/dida365/create-project</loc>");
    expect(body).toContain("/en/apis/dida365/create-project</loc>");
    expect(body).toContain("/zh/apis/dida365</loc>");
    expect(body).toContain("/en/apis/dida365</loc>");
    expect(body).toContain('hreflang="zh-CN"');
    expect(body).toContain('hreflang="en"');
    expect(body).toContain('hreflang="x-default"');
    const catalog = listCatalog();
    const datedApi = catalog.find((api) => api.contentUpdatedAt);
    if (datedApi?.contentUpdatedAt) {
      expect(body).toContain(`<lastmod>${datedApi.contentUpdatedAt}</lastmod>`);
    }
    expect(body).not.toContain("<priority>");
    expect(body).not.toContain("<changefreq>");
    for (const api of catalog.filter((item) => item.sdkStatus === "planned")) {
      expect(body).not.toContain(`<loc>https://pontx.dev/zh/sdks/${api.slug}</loc>`);
      expect(body).not.toContain(`<loc>https://pontx.dev/en/sdks/${api.slug}</loc>`);
    }
    expect(body).not.toContain("/account/");
    expect(body).not.toContain("/sign-in");
    expect(body).not.toContain("<!DOCTYPE html>");
    const expectedPerLocale = 2 + catalog.reduce(
      (count, api) => count + 1 + api.operations.length + api.schemas.length + (api.sdkStatus === "published" ? 1 : 0),
      0
    );
    expect(body.match(/<url>/g)).toHaveLength(expectedPerLocale * 2);
  });

  it("permanently redirects alternate hosts without an intermediate hop", async () => {
    const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
    expect(config.redirects).toEqual([
      expect.objectContaining({
        source: "/:path*",
        destination: "https://pontx.dev/:path*",
        permanent: true,
        has: [{ type: "host", value: "www.pontx.dev" }]
      }),
      expect.objectContaining({
        source: "/:path*",
        destination: "https://pontx.dev/:path*",
        permanent: true,
        has: [{ type: "host", value: "pontx-hub.vercel.app" }]
      })
    ]);
  });
});
