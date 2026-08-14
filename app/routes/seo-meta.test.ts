import { describe, expect, it } from "vitest";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { meta as agentSkillMeta } from "./agent-skill";
import { loader as apiLoader, meta as apiMeta } from "./api-detail";
import { meta as operationMeta } from "./operation-detail";
import { meta as schemaMeta } from "./schema-detail";
import { meta as sdkMeta } from "./sdk-detail";
import { meta as savedApisMeta } from "./saved-apis";
import { meta as catalogMeta } from "./catalog";
import { siteVerificationMeta } from "~/root";

type Descriptor = Record<string, unknown>;

function descriptors(value: unknown): Descriptor[] {
  return value as Descriptor[];
}

function expectLocalizedPublicMeta(meta: Descriptor[], canonical: string) {
  expect(meta).toContainEqual({ tagName: "link", rel: "canonical", href: canonical });
  expect(meta.filter((item) => item.rel === "alternate")).toEqual([
    expect.objectContaining({ hrefLang: "zh-CN" }),
    expect.objectContaining({ hrefLang: "en" }),
    expect.objectContaining({ hrefLang: "x-default" })
  ]);
  expect(meta).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: "description" }),
    expect.objectContaining({ property: "og:title" }),
    expect.objectContaining({ property: "og:description" }),
    expect.objectContaining({ name: "twitter:title" }),
    expect.objectContaining({ name: "twitter:description" })
  ]));
}

describe("public route SEO metadata", () => {
  const api = getCatalogApi("dida365");
  if (!api) throw new Error("Expected synchronized Dida365 metadata");
  const plannedApi = { ...api, sdkStatus: "planned" as const };

  it("publishes the Pontx brand graph and search ownership meta tags", () => {
    const catalogDescriptors = descriptors(catalogMeta({
      data: { locale: "en", query: "", apis: [api] }
    } as never));
    const graph = JSON.stringify(catalogDescriptors);
    expect(graph).toContain('"@type":"WebSite"');
    expect(graph).toContain('"alternateName":"Pontx API Hub"');
    expect(graph).toContain('"@type":"Organization"');
    expect(graph).toContain('"logo":"https://pontx.dev/pontx-logo.svg"');
    expect(graph).toContain('"@type":"CollectionPage"');

    expect(descriptors(siteVerificationMeta({
      google: "google-token", bing: "bing-token", baidu: "baidu-token"
    }))).toEqual(expect.arrayContaining([
      { name: "google-site-verification", content: "google-token" },
      { name: "msvalidate.01", content: "bing-token" },
      { name: "baidu-site-verification", content: "baidu-token" }
    ]));
  });

  it("keeps Endpoint and Schema pages canonical, localized, and breadcrumbed", () => {
    const operation = api.operations[0];
    const operationDescriptors = descriptors(operationMeta({
      data: { locale: "en", api, operation }
    } as never));
    expectLocalizedPublicMeta(
      operationDescriptors,
      `https://pontx.dev/en/apis/${api.slug}/${operation.slug}`
    );
    expect(JSON.stringify(operationDescriptors)).toContain("BreadcrumbList");
    expect(JSON.stringify(operationDescriptors)).toContain("TechArticle");

    const schema = api.schemas[0];
    const schemaDescriptors = descriptors(schemaMeta({
      data: { locale: "zh", api, schema }
    } as never));
    expectLocalizedPublicMeta(
      schemaDescriptors,
      `https://pontx.dev/zh/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`
    );
    expect(JSON.stringify(schemaDescriptors)).toContain("BreadcrumbList");
    expect(JSON.stringify(schemaDescriptors)).toContain("TechArticle");
  });

  it("describes the Agent Skill as software and keeps planned SDKs out of rich results", () => {
    const skillDescriptors = descriptors(agentSkillMeta({ data: { locale: "en" } } as never));
    expectLocalizedPublicMeta(
      skillDescriptors,
      "https://pontx.dev/en/skills/pontx-hub"
    );
    expect(JSON.stringify(skillDescriptors)).toContain("SoftwareApplication");
    expect(JSON.stringify(skillDescriptors)).toContain("Agent API Workflow");
    expect(JSON.stringify(skillDescriptors)).toContain("one agent workflow");

    const sdkDescriptors = descriptors(sdkMeta({
      data: { locale: "en", api: plannedApi }
    } as never));
    expectLocalizedPublicMeta(
      sdkDescriptors,
      `https://pontx.dev/en/sdks/${plannedApi.slug}`
    );
    expect(sdkDescriptors).toContainEqual({ name: "robots", content: "noindex,follow" });
    expect(JSON.stringify(sdkDescriptors)).not.toContain("SoftwareApplication");
  });

  it("serves an indexable API overview with a ready quick-start Endpoint", async () => {
    const loaded = await apiLoader({
      params: { locale: "zh", apiSlug: "frankfurter" }
    } as never);
    expect(loaded.operation.slug).toBe("get-latest-rates");

    const apiDescriptors = descriptors(apiMeta({ data: loaded } as never));
    expectLocalizedPublicMeta(
      apiDescriptors,
      "https://pontx.dev/zh/apis/frankfurter"
    );
    expect(JSON.stringify(apiDescriptors)).toContain("WebAPI");
    expect(JSON.stringify(apiDescriptors)).toContain("BreadcrumbList");
  });
});

describe("private account route metadata", () => {
  it("keeps saved Endpoints out of search indexes", () => {
    const meta = descriptors(savedApisMeta({ data: { locale: "zh" } } as never));
    expect(meta).toContainEqual({ name: "robots", content: "noindex,nofollow" });
    expect(meta).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ tagName: "link", rel: "canonical" })
    ]));
  });
});
