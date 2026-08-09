import { describe, expect, it } from "vitest";
import { loader as robotsLoader } from "./robots";
import { loader as sitemapLoader } from "./sitemap";

describe("SEO resource routes", () => {
  it("serves robots.txt as a plain-text resource", async () => {
    const response = robotsLoader();
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Sitemap: https://pontx-hub.vercel.app/sitemap.xml");
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
    expect(body).toContain('hreflang="zh-CN"');
    expect(body).toContain('hreflang="en"');
    expect(body).toContain('hreflang="x-default"');
    expect(body).not.toContain("<!DOCTYPE html>");
  });
});
