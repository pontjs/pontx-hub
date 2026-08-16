import { afterEach, describe, expect, it, vi } from "vitest";
import {
  trackCatalogSearchViewed,
  trackCodeCopied,
  trackPlaygroundRequest,
  trackSearchResultOpened
} from "./events";
import type { GlobalSearchResult } from "~/lib/catalog/types";

const result = {
  id: "endpoint:frankfurter/get-rates",
  kind: "endpoint" as const,
  score: 1,
  apiSlug: "frankfurter",
  apiTitle: "Frankfurter",
  provider: "Frankfurter",
  title: "Get rates",
  description: "Returns rates.",
  href: "/en/apis/frankfurter/get-rates",
  match: { mode: "hybrid" as const, fields: ["title"] },
  operationSlug: "get-rates",
  operationId: "getRates",
  method: "GET",
  path: "/v1/rates",
  tag: "Rates"
} satisfies GlobalSearchResult;

describe("product analytics events", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only safe, summarized search metadata", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag });

    trackCatalogSearchViewed({
      locale: "en",
      query: "Bearer token_should_not_leave_the_browser",
      resultCount: 6
    });

    expect(gtag).toHaveBeenCalledWith("event", "catalog_search_viewed", {
      surface: "catalog",
      locale: "en",
      query_length_bucket: "21-100",
      result_count_bucket: "6-20"
    });
    expect(JSON.stringify(gtag.mock.calls)).not.toContain("token_should_not_leave_the_browser");
  });

  it("records public resource and conversion milestones without request data", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag });

    trackSearchResultOpened({ locale: "zh", result });
    trackCodeCopied({ surface: "sdk", kind: "typescript", apiSlug: "frankfurter" });
    trackPlaygroundRequest({
      apiSlug: "frankfurter",
      operationSlug: "get-rates",
      mode: "preview_only",
      outcome: "previewed"
    });

    expect(gtag.mock.calls).toEqual([
      ["event", "search_result_opened", {
        locale: "zh",
        resource_kind: "endpoint",
        api_slug: "frankfurter",
        operation_slug: "get-rates",
        match_mode: "hybrid"
      }],
      ["event", "code_copied", {
        surface: "sdk",
        code_kind: "typescript",
        api_slug: "frankfurter"
      }],
      ["event", "playground_request", {
        api_slug: "frankfurter",
        operation_slug: "get-rates",
        request_mode: "preview_only",
        outcome: "previewed"
      }]
    ]);
  });
});
