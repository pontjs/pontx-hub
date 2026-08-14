import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "~/db/client.server";
import { aiDailyUsage } from "~/db/schema";
import type { AiConfiguration } from "./config.server";

const GLOBAL_SCOPE = "global";
// Reserve the maximum technical spend allowed for one turn. This makes the
// global daily budget safe even when several requests start concurrently.
const TURN_RESERVATION_MICROS = 250_000;

function usageDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function userScope(userId: string): string {
  return `user:${userId}`;
}

type ReadyConfiguration = Extract<AiConfiguration, { status: "ready" }>;

export type AiUsageSnapshot = {
  usedMessages: number;
  messageLimit: number;
  globalAvailable: boolean;
  resetsAt: string;
};

async function incrementWithLimit(
  scopeKey: string,
  date: string,
  field: "message" | "reservation",
  limit: number
): Promise<boolean> {
  const database = getDatabase(process.env.DATABASE_URL!);
  const increment = field === "message" ? 1 : TURN_RESERVATION_MICROS;
  const rows = await database.execute(sql`
    INSERT INTO ai_daily_usage (
      scope_key, usage_date, message_count, reserved_cost_micros,
      actual_cost_micros, input_tokens, output_tokens, updated_at
    ) VALUES (
      ${scopeKey}, ${date},
      ${field === "message" ? increment : 0},
      ${field === "reservation" ? increment : 0}, 0, 0, 0, NOW()
    )
    ON CONFLICT (scope_key, usage_date) DO UPDATE SET
      message_count = ai_daily_usage.message_count + ${field === "message" ? increment : 0},
      reserved_cost_micros = ai_daily_usage.reserved_cost_micros + ${field === "reservation" ? increment : 0},
      updated_at = NOW()
    WHERE ${field === "message"
      ? sql`ai_daily_usage.message_count + ${increment} <= ${limit}`
      : sql`ai_daily_usage.actual_cost_micros + ai_daily_usage.reserved_cost_micros + ${increment} <= ${limit}`}
    RETURNING scope_key
  `);
  return rows.rows.length === 1;
}

async function release(scopeKey: string, date: string, field: "message" | "reservation") {
  const database = getDatabase(process.env.DATABASE_URL!);
  await database
    .update(aiDailyUsage)
    .set(field === "message"
      ? { messageCount: sql`GREATEST(${aiDailyUsage.messageCount} - 1, 0)`, updatedAt: new Date() }
      : { reservedCostMicros: sql`GREATEST(${aiDailyUsage.reservedCostMicros} - ${TURN_RESERVATION_MICROS}, 0)`, updatedAt: new Date() })
    .where(and(eq(aiDailyUsage.scopeKey, scopeKey), eq(aiDailyUsage.usageDate, date)));
}

export async function reserveAiTurn(
  userId: string,
  configuration: ReadyConfiguration
): Promise<"ok" | "user_limit" | "global_budget"> {
  const date = usageDate();
  const globalLimit = Math.round(configuration.dailyBudgetUsd * 1_000_000);
  if (!await incrementWithLimit(GLOBAL_SCOPE, date, "reservation", globalLimit)) {
    return "global_budget";
  }
  if (!await incrementWithLimit(
    userScope(userId), date, "message", configuration.userDailyMessages
  )) {
    await release(GLOBAL_SCOPE, date, "reservation");
    return "user_limit";
  }
  return "ok";
}

export async function settleAiTurn(input: {
  inputTokens: number;
  outputTokens: number;
  costMicros: number;
}) {
  const date = usageDate();
  const database = getDatabase(process.env.DATABASE_URL!);
  await database
    .update(aiDailyUsage)
    .set({
      reservedCostMicros: sql`GREATEST(${aiDailyUsage.reservedCostMicros} - ${TURN_RESERVATION_MICROS}, 0)`,
      actualCostMicros: sql`${aiDailyUsage.actualCostMicros} + ${input.costMicros}`,
      inputTokens: sql`${aiDailyUsage.inputTokens} + ${input.inputTokens}`,
      outputTokens: sql`${aiDailyUsage.outputTokens} + ${input.outputTokens}`,
      updatedAt: new Date()
    })
    .where(and(eq(aiDailyUsage.scopeKey, GLOBAL_SCOPE), eq(aiDailyUsage.usageDate, date)));
}

export async function releaseAiTurnReservation() {
  await release(GLOBAL_SCOPE, usageDate(), "reservation");
}

export async function aiUsageSnapshot(
  userId: string,
  configuration: ReadyConfiguration
): Promise<AiUsageSnapshot> {
  const date = usageDate();
  const database = getDatabase(process.env.DATABASE_URL!);
  const rows = await database
    .select()
    .from(aiDailyUsage)
    .where(sql`${aiDailyUsage.usageDate} = ${date} AND ${aiDailyUsage.scopeKey} IN (${userScope(userId)}, ${GLOBAL_SCOPE})`);
  const user = rows.find((row) => row.scopeKey === userScope(userId));
  const global = rows.find((row) => row.scopeKey === GLOBAL_SCOPE);
  const resetsAt = new Date(`${date}T00:00:00.000Z`);
  resetsAt.setUTCDate(resetsAt.getUTCDate() + 1);
  return {
    usedMessages: user?.messageCount ?? 0,
    messageLimit: configuration.userDailyMessages,
    globalAvailable:
      (global?.actualCostMicros ?? 0) + (global?.reservedCostMicros ?? 0) <
      configuration.dailyBudgetUsd * 1_000_000,
    resetsAt: resetsAt.toISOString()
  };
}

export function estimateSonnetCostMicros(inputTokens: number, outputTokens: number) {
  return Math.ceil(inputTokens * 3 + outputTokens * 15);
}
