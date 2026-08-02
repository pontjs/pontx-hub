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
    expect(catalog.map((api) => api.slug).sort()).toEqual(["dida365", "frankfurter"]);
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
  });

  it("finds schemas by stable name", () => {
    const result = getCatalogSchema("dida365", "TaskCreate");
    expect(result?.schema.title.zh).toBe("创建任务请求");
    expect(result?.schema.properties.map((property) => property.name)).toContain("projectId");
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
});
