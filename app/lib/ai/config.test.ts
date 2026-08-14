import { describe, expect, it } from "vitest";
import { readAiConfiguration } from "./config.server";
import { estimateModelCostMicros } from "./usage.server";

describe("AI assistant configuration", () => {
  it("is opt-in and requires both model and quota backing services", () => {
    expect(readAiConfiguration({})).toEqual({ status: "disabled" });
    expect(readAiConfiguration({ PONTX_AI_ENABLED: "true" })).toEqual({
      status: "invalid",
      missing: ["PONTX_AI_API_KEY", "DATABASE_URL"]
    });
  });

  it("defaults to 20 messages and a one-dollar global daily budget", () => {
    expect(readAiConfiguration({
      PONTX_AI_ENABLED: "true",
      ANTHROPIC_API_KEY: "test",
      DATABASE_URL: "postgres://test"
    })).toMatchObject({ status: "ready", userDailyMessages: 20, dailyBudgetUsd: 1 });
  });

  it("supports an Anthropic-compatible provider and its token prices", () => {
    const configuration = readAiConfiguration({
      PONTX_AI_ENABLED: "true",
      PONTX_AI_API_KEY: "test",
      PONTX_AI_BASE_URL: "https://api.deepseek.com/anthropic",
      PONTX_AI_MODEL: "deepseek-v4-flash",
      PONTX_AI_INPUT_USD_PER_MTOK: "0.14",
      PONTX_AI_OUTPUT_USD_PER_MTOK: "0.28",
      DATABASE_URL: "postgres://test"
    });
    expect(configuration).toMatchObject({
      status: "ready",
      baseUrl: "https://api.deepseek.com/anthropic",
      model: "deepseek-v4-flash"
    });
    if (configuration.status !== "ready") {
      throw new Error("Expected ready configuration");
    }
    expect(estimateModelCostMicros(1_000, 1_000, configuration)).toBe(420);
  });
});
