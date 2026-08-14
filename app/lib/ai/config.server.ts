export type AiConfiguration =
  | { status: "disabled" }
  | { status: "invalid"; missing: string[] }
  | {
      status: "ready";
      apiKey: string;
      model: string;
      userDailyMessages: number;
      dailyBudgetUsd: number;
      turnTimeoutMs: number;
    };

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readAiConfiguration(
  env: NodeJS.ProcessEnv = process.env
): AiConfiguration {
  if (env.PONTX_AI_ENABLED?.trim() !== "true") return { status: "disabled" };
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  const databaseUrl = env.DATABASE_URL?.trim();
  const missing = [
    ...(!apiKey ? ["ANTHROPIC_API_KEY"] : []),
    ...(!databaseUrl ? ["DATABASE_URL"] : [])
  ];
  if (missing.length || !apiKey) return { status: "invalid", missing };
  return {
    status: "ready",
    apiKey,
    model: env.PONTX_AI_MODEL?.trim() || "claude-sonnet-5",
    userDailyMessages: Math.floor(
      positiveNumber(env.PONTX_AI_USER_DAILY_MESSAGES, 20)
    ),
    dailyBudgetUsd: positiveNumber(env.PONTX_AI_DAILY_BUDGET_USD, 1),
    turnTimeoutMs: Math.min(
      positiveNumber(env.PONTX_AI_TURN_TIMEOUT_MS, 60_000),
      120_000
    )
  };
}
