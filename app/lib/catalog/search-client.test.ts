import { afterEach, describe, expect, it, vi } from "vitest";
import {
  catalogSearchApiHref,
  fetchCatalogSearch,
} from "./search-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("catalog client search", () => {
  it("uses the bounded dynamic search API instead of prerendered route data", () => {
    expect(catalogSearchApiHref(" WPS 日历 ", "zh")).toBe(
      "/api/v2/search?q=WPS+%E6%97%A5%E5%8E%86&locale=zh&limit=60",
    );
  });

  it("returns the typed search payload", async () => {
    const data = {
      query: "rates",
      total: 0,
      counts: { api: 0, endpoint: 0, schema: 0 },
      items: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ version: "v2", data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCatalogSearch("rates", "en")).resolves.toEqual(data);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v2/search?q=rates&locale=en&limit=60",
      { signal: undefined },
    );
  });

  it("surfaces API errors without replacing the current catalog", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Search unavailable" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    ));

    await expect(fetchCatalogSearch("rates", "en")).rejects.toThrow(
      "Search unavailable",
    );
  });
});
