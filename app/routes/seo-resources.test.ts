import { describe, expect, it } from "vitest";
import { loader as robotsLoader } from "./robots";
import { loader as sitemapLoader } from "./sitemap";
import { loader as llmsLoader } from "./llms";
import { loader as openApiLoader } from "./openapi";
import {
  action as skillDiscoveryAction,
  loader as skillDiscoveryLoader
} from "./skill-discovery";
import { loader as agentSkillRedirectLoader } from "./agent-skill-redirect";
import { readFile } from "node:fs/promises";
import { listCatalog } from "~/lib/catalog/catalog.server";
import { DOC_SLUGS, docHref } from "~/lib/docs";

describe("SEO resource routes", () => {
  it("serves robots.txt as a plain-text resource", async () => {
    const response = robotsLoader();
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Sitemap: https://pontx.dev/sitemap.xml");
    expect(body).not.toContain("<!DOCTYPE html>");
  });

  it("publishes an Agent-readable site map without presenting it as HTML", async () => {
    const response = llmsLoader();
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(body).toContain("# Pontx API");
    expect(body).toContain("https://pontx.dev/en/docs");
    expect(body).toContain("https://pontx.dev/zh/docs");
    expect(body).toContain("https://pontx.dev/en/skills/pontx-hub");
    expect(body).toContain("https://pontx.dev/.well-known/skills/index.json");
    expect(body).toContain("https://pontx.dev/openapi.json");
    expect(body).toContain("Published package in the Unified SDK for");
    expect(body).not.toContain("Published TypeScript and Node.js SDK");
    expect(body).not.toContain("pontx-hub.vercel.app");
  });

  it("publishes a discovery-only OpenAPI description", async () => {
    const response = openApiLoader();
    const document = await response.json() as {
      openapi: string;
      servers: Array<{ url: string }>;
      paths: Record<string, unknown>;
    };

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(document.openapi).toBe("3.1.0");
    expect(document.servers).toEqual([{ url: "https://pontx.dev" }]);
    expect(document.paths).toHaveProperty("/api/v2/search");
    expect(document.paths).toHaveProperty("/api/v1/skill");
    expect(document.paths).not.toHaveProperty("/api/v1/playground/execute");
  });

  it("serves the official Skill through the well-known discovery contract", async () => {
    const indexResponse = skillDiscoveryLoader({
      params: { "*": "index.json" }
    } as never);
    const index = await indexResponse.json() as {
      skills: Array<{ name: string; description: string; files: string[] }>;
    };

    expect(indexResponse.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(index.skills).toHaveLength(1);
    expect(index.skills[0]).toEqual(expect.objectContaining({
      name: "pontx-hub",
      description: expect.stringContaining("API discovery"),
      files: expect.arrayContaining(["SKILL.md", "references/auth-and-safety.md"])
    }));

    const skillResponse = skillDiscoveryLoader({
      params: { "*": "pontx-hub/SKILL.md" }
    } as never);
    expect(skillResponse.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(await skillResponse.text()).toContain("name: pontx-hub");

    const optionsResponse = skillDiscoveryAction({
      request: new Request("https://pontx.dev/.well-known/skills/index.json", {
        method: "OPTIONS"
      })
    } as never);
    expect(optionsResponse.status).toBe(204);
    expect(optionsResponse.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
  });

  it("permanently redirects the retired Agent Skill route", async () => {
    const response = agentSkillRedirectLoader({
      params: { locale: "en" },
      request: new Request("https://pontx.dev/en/agent-skill?source=legacy")
    } as never);
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("/en/skills/pontx-hub?source=legacy");
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
    expect(body).toContain("https://pontx.dev/en/skills/pontx-hub");
    for (const locale of ["zh", "en"] as const) {
      for (const slug of DOC_SLUGS) {
        expect(body).toContain(`<loc>https://pontx.dev${docHref(locale, slug)}</loc>`);
      }
    }
    expect(body).not.toContain("/docs/overview");
    expect(body).not.toMatch(/https:\/\/pontx\.dev\/(?:zh|en)\/agent-skill<\/loc>/);
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
    const expectedPerLocale = 2 + DOC_SLUGS.length + catalog.reduce(
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
