import { RunAgentInputSchema, EventType } from "@ag-ui/core";
import type { Route } from "./+types/ai-api";
import { requireAccountUserId } from "~/lib/accounts/session.server";
import { readAiConfiguration } from "~/lib/ai/config.server";
import { AgentRunError, runPontxAgent } from "~/lib/ai/agent.server";
import {
  aiUsageSnapshot,
  releaseAiTurnReservation,
  reserveAiTurn,
  settleAiTurn
} from "~/lib/ai/usage.server";

function jsonError(code: string, status: number, message?: string) {
  return Response.json(
    { error: { code, ...(message ? { message } : {}) } },
    { status, headers: { "Cache-Control": "private, no-store" } }
  );
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

async function userId(request: Request): Promise<string | Response> {
  try {
    return await requireAccountUserId(request);
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      return jsonError("unauthorized", 401);
    }
    return jsonError("accounts_unavailable", 503);
  }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  if (params["*"] !== "usage") return jsonError("not_found", 404);
  const configuration = readAiConfiguration();
  if (configuration.status === "disabled") return jsonError("not_found", 404);
  if (configuration.status === "invalid") return jsonError("ai_unavailable", 503);
  const account = await userId(request);
  if (account instanceof Response) return account;
  try {
    return Response.json(
      { data: await aiUsageSnapshot(account, configuration) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return jsonError("ai_usage_unavailable", 503);
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  if (params["*"] !== "agent") return jsonError("not_found", 404);
  if (request.method !== "POST") return jsonError("method_not_allowed", 405);
  if (!sameOrigin(request)) return jsonError("invalid_origin", 403);
  const configuration = readAiConfiguration();
  if (configuration.status === "disabled") return jsonError("not_found", 404);
  if (configuration.status === "invalid") return jsonError("ai_unavailable", 503);
  const account = await userId(request);
  if (account instanceof Response) return account;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_request", 422, "Request body must be JSON");
  }
  const parsed = RunAgentInputSchema.safeParse(body);
  if (!parsed.success) return jsonError("invalid_request", 422, parsed.error.message);

  let reservation: Awaited<ReturnType<typeof reserveAiTurn>>;
  try {
    reservation = await reserveAiTurn(account, configuration);
  } catch {
    return jsonError("ai_usage_unavailable", 503);
  }
  if (reservation === "user_limit") return jsonError("user_daily_limit", 429);
  if (reservation === "global_budget") return jsonError("global_daily_budget", 429);

  const encoder = new TextEncoder();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("Agent turn timed out")),
    configuration.turnTimeoutMs
  );
  request.signal.addEventListener("abort", () => controller.abort(), { once: true });

  const stream = new ReadableStream<Uint8Array>({
    start(streamController) {
      const emit = (event: Record<string, unknown>) => {
        streamController.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };
      void runPontxAgent(parsed.data, configuration, emit, controller.signal)
        .then(async (usage) => {
          await settleAiTurn(usage);
        })
        .catch(async (error) => {
          emit({
            type: EventType.RUN_ERROR,
            message: error instanceof Error ? error.message : "Agent turn failed",
            code: controller.signal.aborted ? "cancelled" : "agent_failed"
          });
          try {
            if (error instanceof AgentRunError && error.usage.costMicros > 0) {
              await settleAiTurn(error.usage);
            } else {
              await releaseAiTurnReservation();
            }
          } catch {
            // The reservation expires with the UTC usage bucket.
          }
        })
        .finally(() => {
          clearTimeout(timeout);
          streamController.close();
        });
    },
    cancel() {
      controller.abort();
      clearTimeout(timeout);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "private, no-store, no-transform",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
