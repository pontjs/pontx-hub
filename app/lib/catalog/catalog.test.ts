import { describe, expect, it } from "vitest";
import {
  getCatalogOperation,
  listCatalog,
  listCatalogSummaries,
  searchCatalog
} from "./catalog.server";

describe("curated catalog", () => {
  it("loads and validates every YAML manifest", () => {
    const catalog = listCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(3);
    expect(new Set(catalog.map((api) => api.slug)).size).toBe(catalog.length);
  });

  it("returns summaries without operation payloads", () => {
    const summary = listCatalogSummaries()[0];
    expect(summary.operationCount).toBeGreaterThan(0);
    expect(summary).not.toHaveProperty("operations");
    expect(summary).not.toHaveProperty("servers");
  });

  it("finds operations by stable slug", () => {
    const result = getCatalogOperation("github", "get-repository");
    expect(result?.operation.operationId).toBe("repos/get");
    expect(result?.operation.method).toBe("GET");
  });

  it("searches localized operation content", () => {
    expect(searchCatalog("仓库", "zh").length).toBeGreaterThan(0);
    expect(searchCatalog("payment", "en").length).toBeGreaterThan(0);
  });
});
