import { describe, expect, it } from "vitest";
import { loader as robotsLoader } from "./robots";
import { loader as sitemapLoader } from "./sitemap";
import { readFile } from "node:fs/promises";

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
    expect(body).toContain("<lastmod>2026-08-10</lastmod>");
    expect(body).not.toContain("<priority>");
    expect(body).not.toContain("<changefreq>");
    expect(body).not.toContain("/sdks/dida365");
    expect(body).not.toContain("/account/");
    expect(body).not.toContain("/sign-in");
    expect(body).not.toContain("<!DOCTYPE html>");
    expect(body.match(/<url>/g)).toHaveLength(360);
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
