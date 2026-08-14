import { describe, expect, it } from "vitest";
import {
  getCatalogOperation,
  getCatalogSchema,
  listCatalog,
  listCatalogSummaries,
  searchCatalog
} from "./catalog.server";
import { catalogApiSchema } from "./schema";

describe("curated catalog", () => {
  it("loads and validates every synchronized metadata API", () => {
    const catalog = listCatalog();
    expect(catalog.map((api) => api.slug)).toEqual([
      "dida365",
      "frankfurter",
      "frankfurter-v2",
      "massive"
    ]);
    expect(new Set(catalog.map((api) => api.slug)).size).toBe(catalog.length);
  });

  it("accepts canonical scoped SDK package names", () => {
    const api = listCatalog().find((candidate) => candidate.slug === "dida365");
    expect(catalogApiSchema.parse({
      ...api,
      packageName: "@pontx/dida365"
    }).packageName).toBe("@pontx/dida365");
    expect(catalogApiSchema.safeParse({
      ...api,
      packageName: "@other/dida365"
    }).success).toBe(false);
  });

  it("accepts version-bound SDK quality evidence and rejects mismatched claims", () => {
    const api = listCatalog().find((candidate) => candidate.slug === "dida365");
    const sdkQuality = {
      testedVersion: api?.sdkVersion,
      unitTests: { passed: 4, total: 4, skipped: 0 },
      e2eStatus: "passed" as const,
      nodeVersions: ["18", "20", "22"],
      sourceCommit: "a".repeat(40),
      testedAt: "2026-08-14",
      repositoryUrl: "https://github.com/pontjs/dida365",
      workflowRunUrl: "https://github.com/pontjs/dida365/actions/runs/1"
    };
    expect(catalogApiSchema.safeParse({ ...api, sdkQuality }).success).toBe(true);
    expect(catalogApiSchema.safeParse({
      ...api,
      sdkQuality: { ...sdkQuality, testedVersion: "9.9.9" }
    }).success).toBe(false);
    expect(catalogApiSchema.safeParse({
      ...api,
      sdkQuality: {
        ...sdkQuality,
        workflowRunUrl: "https://github.com/pontjs/other/actions/runs/1"
      }
    }).success).toBe(false);
  });

  it("provides every endpoint with a successful request example and a ready Quick Start", () => {
    const catalog = listCatalog();
    const operations = catalog.flatMap((api) => api.operations);
    expect(operations).toHaveLength(53);
    expect(operations.every((operation) => operation.requestExamples.length > 0)).toBe(true);
    expect(
      operations.flatMap((operation) => operation.requestExamples).every(
        (example) =>
          (example.completeness === "ready") === (example.unresolved.length === 0)
      )
    ).toBe(true);
    for (const api of catalog) {
      const operation = api.operations.find(
        (candidate) => candidate.slug === api.quickStart?.operationSlug
      );
      const example = operation?.requestExamples.find(
        (candidate) => candidate.id === api.quickStart?.requestExampleId
      );
      expect(example?.completeness, api.slug).toBe("ready");
    }
  });

  it("returns summaries without operation payloads", () => {
    const summaries = listCatalogSummaries();
    const summary = summaries[0];
    expect(summary.operationCount).toBeGreaterThan(0);
    expect(summary.defaultOperationSlug).toBeTruthy();
    expect(summary).not.toHaveProperty("operations");
    expect(summary).not.toHaveProperty("servers");
    expect(
      summaries.find((candidate) => candidate.slug === "massive")
        ?.defaultOperationSlug
    ).toBe("get-previous-close");
  });

  it("finds operations by stable slug", () => {
    const result = getCatalogOperation("frankfurter", "get-latest-rates");
    expect(result?.operation.operationId).toBe("getLatestRates");
    expect(result?.operation.method).toBe("GET");
    expect(result?.operation.responses[0].schemaName).toBe("ExchangeRateResponse");
  });

  it("preserves request and response schema relationships", () => {
    const result = getCatalogOperation("dida365", "create-task");
    expect(result?.operation.requestBody?.schemaName).toBe("TaskCreate");
    expect(result?.operation.requestBody?.properties).toContain("projectId");
    expect(result?.operation.responses.find((response) => response.status === "200")?.schemaName).toBe("Task");
  });

  it("finds schemas by stable name", () => {
    const result = getCatalogSchema("dida365", "TaskCreate");
    expect(result?.schema.title.zh).toBe("创建任务请求");
    expect(result?.schema.properties.map((property) => property.name)).toContain("projectId");
    expect(result?.schema.schema).toMatchObject({
      properties: { projectId: { description: "Project id" } }
    });

    const localizedApi = catalogApiSchema.parse({
      ...result?.api,
      schemas: result?.api.schemas.map((schema) =>
        schema.name === "TaskCreate"
          ? {
              ...schema,
              localizedSchema: {
                zh: { properties: { projectId: { description: "项目 ID" } } }
              }
            }
          : schema
      )
    });
    expect(localizedApi.schemas.find((schema) => schema.name === "TaskCreate")?.localizedSchema?.zh).toMatchObject({
      properties: { projectId: { description: "项目 ID" } }
    });
  });

  it("searches APIs, endpoints, schemas, and schema properties", () => {
    const rates = searchCatalog("汇率", "zh");
    expect(rates.items.some((item) => item.kind === "api")).toBe(true);
    expect(rates.items.some((item) => item.kind === "endpoint")).toBe(true);
    expect(rates.items.some((item) => item.kind === "schema")).toBe(true);

    const property = searchCatalog("projectId", "en", { kinds: ["schema"] });
    expect(property.items.every((item) => item.kind === "schema")).toBe(true);
    expect(property.items.some((item) => item.id === "schema:dida365/TaskCreate")).toBe(true);
  });

  it("ranks exact schema names and paginates deterministically", () => {
    const result = searchCatalog("Task", "en", { limit: 2 });
    expect(result.total).toBeGreaterThan(2);
    expect(result.items[0].id).toBe("schema:dida365/Task");
    expect(result.items).toHaveLength(2);
  });

  it("uses bilingual semantics and input/output schema graphs", () => {
    const create = searchCatalog("新增待办", "zh", { kinds: ["endpoint"] });
    expect(create.strategy).toBe("hybrid-semantic");
    expect(create.items[0].id).toBe("endpoint:dida365/create-task");
    expect(create.items[0].match.mode).toBe("semantic");

    const input = searchCatalog("创建任务的入参", "zh", {
      kinds: ["endpoint"]
    });
    expect(input.items[0].id).toBe("endpoint:dida365/create-task");
    expect(input.items[0].match.fields).toContain("request");

    const output = searchCatalog("返回 dueDate 的接口", "zh", {
      kinds: ["endpoint"]
    });
    expect(output.items[0].apiSlug).toBe("dida365");
    expect(output.items[0].match.fields).toContain("response");

    const product = searchCatalog("Productivity", "en", {
      kinds: ["endpoint"]
    });
    expect(product.items.some((item) => item.apiSlug === "dida365")).toBe(true);
    expect(product.items[0].match.fields).toContain("product");

    const currency = searchCatalog("把欧元换算成美元", "zh", {
      kinds: ["endpoint"]
    });
    expect(currency.items.some((item) => item.apiSlug === "frankfurter")).toBe(true);
  });

  it("preserves official provenance and disables market-data redistribution", () => {
    const catalog = listCatalog();
    const massive = catalog.find((api) => api.slug === "massive");
    expect(massive).toBeDefined();
    expect(massive?.proxyEnabled).toBe(false);
    expect(massive?.operations.every((operation) => operation.serverIds.length > 0)).toBe(true);
    expect(massive?.documentationStatus).toBe("official");
    expect(massive?.evidenceUrls.length).toBeGreaterThan(0);
  });
});
