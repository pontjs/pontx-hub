import { describe, expect, it } from "vitest";
import { readAiConfiguration } from "./config.server";
import { estimateSonnetCostMicros } from "./usage.server";

describe("AI assistant configuration", () => {
  it("is opt-in and requires both model and quota backing services", () => {
    expect(readAiConfiguration({})).toEqual({ status: "disabled" });
    expect(readAiConfiguration({ PONTX_AI_ENABLED: "true" })).toEqual({
      status: "invalid",
      missing: ["ANTHROPIC_API_KEY", "DATABASE_URL"]
    });
  });

  it("defaults to 20 messages and a one-dollar global daily budget", () => {
    expect(readAiConfiguration({
      PONTX_AI_ENABLED: "true",
      ANTHROPIC_API_KEY: "test",
      DATABASE_URL: "postgres://test"
    })).toMatchObject({ status: "ready", userDailyMessages: 20, dailyBudgetUsd: 1 });
  });

  it("estimates Sonnet token costs in millionths of a dollar", () => {
    expect(estimateSonnetCostMicros(1_000, 1_000)).toBe(18_000);
  });
});
