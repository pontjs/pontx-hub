import { describe, expect, it } from "vitest";
import { listCatalog, searchCatalog } from "./catalog.server";
import { selectSearchEvaluationCases } from "./search-evaluation-cases";
import { evaluateSearch } from "./search-evaluation";

describe("search relevance evaluation", () => {
  it("meets the checked-in relevance baseline", () => {
    const report = evaluateSearch(
      selectSearchEvaluationCases(listCatalog().map((api) => api.slug)),
      searchCatalog
    );
    const failures = report.cases
      .filter((result) => !result.requiredTopKPassed)
      .map((result) => `${result.id}: ${result.topIds.slice(0, 5).join(", ")}`);

    expect(failures, "required result missing from top K").toEqual([]);
    expect(report.metrics.successAt1).toBeGreaterThanOrEqual(0.75);
    expect(report.metrics.recallAt5).toBeGreaterThanOrEqual(0.8);
    expect(report.metrics.mrrAt10).toBeGreaterThanOrEqual(0.85);
    expect(report.metrics.ndcgAt10).toBeGreaterThanOrEqual(0.8);
    expect(report.metrics.zeroResultRate).toBe(0);
  }, 90_000);
});
