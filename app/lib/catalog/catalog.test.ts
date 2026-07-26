import { describe, expect, it } from "vitest";
import {
  getCatalogOperation,
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
    expect(summary).not.toHaveProperty("operations");
    expect(summary).not.toHaveProperty("servers");
  });

  it("finds operations by stable slug", () => {
    const result = getCatalogOperation("frankfurter", "get-latest-rates");
    expect(result?.operation.operationId).toBe("getLatestRates");
    expect(result?.operation.method).toBe("GET");
  });

  it("searches localized operation content", () => {
    expect(searchCatalog("汇率", "zh").length).toBeGreaterThan(0);
    expect(searchCatalog("project", "en").length).toBeGreaterThan(0);
  });
});
