import type { GlobalSearchKind, GlobalSearchResponse, Locale } from "./types";

export type SearchJudgment = {
  id: string;
  relevance: 1 | 2 | 3;
};

export type SearchEvaluationCase = {
  id: string;
  query: string;
  locale: Locale;
  kinds?: GlobalSearchKind[];
  judgments: SearchJudgment[];
  requiredTopK?: number;
  tags: string[];
};

export type SearchEvaluationMetrics = {
  caseCount: number;
  successAt1: number;
  recallAt5: number;
  mrrAt10: number;
  ndcgAt10: number;
  zeroResultRate: number;
  requiredTopKPassRate: number;
};

export type SearchEvaluationCaseResult = {
  id: string;
  query: string;
  topIds: string[];
  successAt1: number;
  recallAt5: number;
  reciprocalRank: number;
  ndcgAt10: number;
  requiredTopKPassed: boolean;
};

export type SearchEvaluationReport = {
  metrics: SearchEvaluationMetrics;
  cases: SearchEvaluationCaseResult[];
};

type Searcher = (
  query: string,
  locale: Locale,
  options: { kinds?: GlobalSearchKind[]; limit: number }
) => GlobalSearchResponse;

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function discountedCumulativeGain(relevances: number[]): number {
  return relevances.reduce(
    (total, relevance, index) =>
      total + (2 ** relevance - 1) / Math.log2(index + 2),
    0
  );
}

export function evaluateSearch(
  cases: SearchEvaluationCase[],
  search: Searcher
): SearchEvaluationReport {
  if (!cases.length) throw new Error("Search evaluation set must not be empty");

  const results = cases.map((evaluationCase): SearchEvaluationCaseResult => {
    const response = search(evaluationCase.query, evaluationCase.locale, {
      kinds: evaluationCase.kinds,
      limit: 10
    });
    const topIds = response.items.map((item) => item.id);
    const relevanceById = new Map(
      evaluationCase.judgments.map((judgment) => [judgment.id, judgment.relevance])
    );
    const relevantIds = new Set(relevanceById.keys());
    const firstRelevantIndex = topIds.findIndex((id) => relevantIds.has(id));
    const retrievedAt5 = topIds.slice(0, 5).filter((id) => relevantIds.has(id)).length;
    const actualRelevances = topIds
      .slice(0, 10)
      .map((id) => relevanceById.get(id) ?? 0);
    const idealRelevances = evaluationCase.judgments
      .map((judgment) => judgment.relevance)
      .sort((left, right) => right - left)
      .slice(0, 10);
    const idealDcg = discountedCumulativeGain(idealRelevances);
    const requiredTopK = evaluationCase.requiredTopK ?? 5;

    return {
      id: evaluationCase.id,
      query: evaluationCase.query,
      topIds,
      successAt1: topIds[0] && relevantIds.has(topIds[0]) ? 1 : 0,
      recallAt5: retrievedAt5 / relevantIds.size,
      reciprocalRank:
        firstRelevantIndex >= 0 && firstRelevantIndex < 10
          ? 1 / (firstRelevantIndex + 1)
          : 0,
      ndcgAt10:
        idealDcg > 0 ? discountedCumulativeGain(actualRelevances) / idealDcg : 0,
      requiredTopKPassed: topIds
        .slice(0, requiredTopK)
        .some((id) => relevantIds.has(id))
    };
  });

  return {
    metrics: {
      caseCount: results.length,
      successAt1: average(results.map((result) => result.successAt1)),
      recallAt5: average(results.map((result) => result.recallAt5)),
      mrrAt10: average(results.map((result) => result.reciprocalRank)),
      ndcgAt10: average(results.map((result) => result.ndcgAt10)),
      zeroResultRate:
        results.filter((result) => result.topIds.length === 0).length / results.length,
      requiredTopKPassRate:
        results.filter((result) => result.requiredTopKPassed).length / results.length
    },
    cases: results
  };
}
