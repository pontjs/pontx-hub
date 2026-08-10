import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import type { CatalogApi } from "../app/lib/catalog/types";
import { buildSearchResponse } from "../app/lib/catalog/search";
import { searchEvaluationCases } from "../app/lib/catalog/search-evaluation-cases";
import { evaluateSearch } from "../app/lib/catalog/search-evaluation";

const payload = JSON.parse(
  readFileSync(new URL("../.catalog-cache/catalog.json", import.meta.url), "utf8")
) as { apis: unknown[] };
// metadata:sync and the application test suite own catalog validation. This
// runner reads the same artifact directly so it also works while catalog
// schema migrations are in progress.
const catalog = payload.apis as CatalogApi[];
const searchCatalog = (
  query: Parameters<typeof buildSearchResponse>[1],
  locale: Parameters<typeof buildSearchResponse>[2],
  options: Parameters<typeof buildSearchResponse>[3]
) => buildSearchResponse(catalog, query, locale, options);

const thresholds = {
  successAt1: 0.75,
  recallAt5: 0.8,
  mrrAt10: 0.85,
  ndcgAt10: 0.8,
  zeroResultRate: 0,
  requiredTopKPassRate: 1,
  meanLatencyMs: 100,
  p95LatencyMs: 175,
  minimumQueriesPerSecond: 10
};

const report = evaluateSearch(searchEvaluationCases, searchCatalog);

for (const evaluationCase of searchEvaluationCases) {
  searchCatalog(evaluationCase.query, evaluationCase.locale, {
    kinds: evaluationCase.kinds,
    limit: 10
  });
}

const timings: number[] = [];
for (let iteration = 0; iteration < 20; iteration++) {
  for (const evaluationCase of searchEvaluationCases) {
    const startedAt = performance.now();
    searchCatalog(evaluationCase.query, evaluationCase.locale, {
      kinds: evaluationCase.kinds,
      limit: 10
    });
    timings.push(performance.now() - startedAt);
  }
}

timings.sort((left, right) => left - right);
const totalDuration = timings.reduce((total, duration) => total + duration, 0);
const performanceMetrics = {
  samples: timings.length,
  meanLatencyMs: totalDuration / timings.length,
  p95LatencyMs: timings[Math.ceil(timings.length * 0.95) - 1],
  queriesPerSecond: timings.length / (totalDuration / 1000)
};

const failedCases = report.cases.filter((result) => !result.requiredTopKPassed);
const failures = [
  report.metrics.successAt1 < thresholds.successAt1 && "Success@1",
  report.metrics.recallAt5 < thresholds.recallAt5 && "Recall@5",
  report.metrics.mrrAt10 < thresholds.mrrAt10 && "MRR@10",
  report.metrics.ndcgAt10 < thresholds.ndcgAt10 && "nDCG@10",
  report.metrics.zeroResultRate > thresholds.zeroResultRate && "zero-result rate",
  report.metrics.requiredTopKPassRate < thresholds.requiredTopKPassRate &&
    "required Top-K pass rate",
  performanceMetrics.meanLatencyMs > thresholds.meanLatencyMs && "mean latency",
  performanceMetrics.p95LatencyMs > thresholds.p95LatencyMs && "p95 latency",
  performanceMetrics.queriesPerSecond < thresholds.minimumQueriesPerSecond &&
    "throughput"
].filter(Boolean);

console.log(JSON.stringify({ thresholds, ...report, performance: performanceMetrics }, null, 2));

if (failedCases.length) {
  console.error(
    `Required Top-K failures: ${failedCases
      .map((result) => `${result.id} [${result.topIds.slice(0, 5).join(", ")}]`)
      .join("; ")}`
  );
}
if (failures.length) {
  console.error(`Search evaluation failed: ${failures.join(", ")}`);
  process.exitCode = 1;
}
