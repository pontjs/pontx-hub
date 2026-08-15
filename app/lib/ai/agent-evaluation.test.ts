import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { listCatalog } from "~/lib/catalog/catalog.server";
import { runAgentTool } from "./tools.server";

type EvaluationCase = {
  id: string;
  tool: string;
  input: unknown;
  expectResource?: string;
  expectPath?: string;
  expectAuthType?: string;
  expectText?: string;
  expectMethod?: string;
  expectHref?: string;
  expectConfirmation?: boolean;
  expectUiEvent?: string;
  expectPricingStatusOneOf?: string[];
  requiresProducts?: string[];
};

const cases = JSON.parse(readFileSync(
  new URL("../../../qa/ai-agent-evals.json", import.meta.url),
  "utf8"
)) as EvaluationCase[];

describe("Pontx AI assistant deterministic tool evaluations", () => {
  const availableProducts = new Set(listCatalog().map((api) => api.slug));
  for (const evaluation of cases) {
    const requires = evaluation.requiresProducts ?? [];
    it.skipIf(requires.some((slug) => !availableProducts.has(slug)))(evaluation.id, async () => {
      const result = await runAgentTool(evaluation.tool, evaluation.input);
      const value = JSON.parse(result.content) as Record<string, any>;
      if (evaluation.expectResource) {
        expect(value.items.map((item: { id: string }) => item.id)).toContain(evaluation.expectResource);
      }
      if (evaluation.expectPath) expect(value.operation.path).toBe(evaluation.expectPath);
      if (evaluation.expectAuthType) {
        expect(value.auth.map((item: { type: string }) => item.type)).toContain(evaluation.expectAuthType);
      }
      if (evaluation.expectText) expect(result.content).toContain(evaluation.expectText);
      if (evaluation.expectMethod) expect(value.preview.method).toBe(evaluation.expectMethod);
      if (evaluation.expectHref) expect(value.operation.href).toBe(evaluation.expectHref);
      if (evaluation.expectConfirmation !== undefined) {
        expect(value.preview.requiresConfirmation).toBe(evaluation.expectConfirmation);
      }
      if (evaluation.expectUiEvent) expect(result.uiEvent?.name).toBe(evaluation.expectUiEvent);
      if (evaluation.expectPricingStatusOneOf) {
        expect(evaluation.expectPricingStatusOneOf).toContain(value.pricing.status);
      }
      expect(result.content).not.toMatch(/dida_secret|ANTHROPIC_API_KEY/);
    });
  }
});
