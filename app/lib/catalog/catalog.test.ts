import { describe, expect, it } from "vitest";
import {
  getCatalogOperation,
  getCatalogSchema,
  listCatalog,
  listCatalogSummaries,
  searchCatalog
} from "./catalog.server";

describe("curated catalog", () => {
  it("loads and validates every synchronized metadata API", () => {
    const catalog = listCatalog();
    expect(catalog.map((api) => api.slug).sort()).toEqual([
      "cnbc-market-data",
      "dida365",
      "eastmoney-funds",
      "frankfurter",
      "i3investor-sgx",
      "massive",
      "sina-finance",
      "stooq",
      "tencent-finance",
      "yahoo-finance"
    ]);
    expect(new Set(catalog.map((api) => api.slug)).size).toBe(catalog.length);
  });

  it("returns summaries without operation payloads", () => {
    const summary = listCatalogSummaries()[0];
    expect(summary.operationCount).toBeGreaterThan(0);
    expect(summary.defaultOperationSlug).toBeTruthy();
    expect(summary).not.toHaveProperty("operations");
    expect(summary).not.toHaveProperty("servers");
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
    expect(result?.schema.localizedSchema?.zh).toMatchObject({
      properties: { projectId: { description: "项目 ID" } }
    });
    expect(result?.schema.schema).toMatchObject({
      properties: { projectId: { description: "Project id" } }
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

  it("preserves documentation provenance and read-only proxy configuration", () => {
    const catalog = listCatalog();
    const marketApis = catalog.filter((api) =>
      ["massive", "yahoo-finance", "stooq", "sina-finance", "tencent-finance", "eastmoney-funds", "cnbc-market-data", "i3investor-sgx"].includes(api.slug)
    );
    expect(marketApis).toHaveLength(8);
    expect(marketApis.every((api) => api.proxyEnabled === true)).toBe(true);
    expect(marketApis.flatMap((api) => api.operations).every((operation) => operation.serverIds.length > 0)).toBe(true);
    expect(marketApis.find((api) => api.slug === "massive")?.documentationStatus).toBe("official");
    expect(marketApis.find((api) => api.slug === "i3investor-sgx")?.documentationStatus).toBe("inferred");
    expect(marketApis.every((api) => api.evidenceUrls.length > 0)).toBe(true);
  });
});
