import { describe, expect, it, vi } from "vitest";
import {
  AgentExecutionTimeoutError,
  postJsonWithTimeout
} from "./agent-execution";

describe("Pontx Agent prepared-call execution", () => {
  it("uses the Hub's same-origin JSON endpoint with a bounded wait", async () => {
    const fetcher = vi.fn(async () => Response.json({ data: { status: 200 } }));

    const result = await postJsonWithTimeout<{ data: { status: number } }>(
      "/api/v1/playground/execute",
      { apiSlug: "frankfurter-v2" },
      fetcher,
      1_000
    );

    expect(result.body.data.status).toBe(200);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/playground/execute",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: expect.any(AbortSignal)
      })
    );
  });

  it("ends a stalled wait without issuing a second request", async () => {
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })
    ));

    await expect(postJsonWithTimeout("/api/v1/playground/execute", {}, fetcher, 5))
      .rejects.toBeInstanceOf(AgentExecutionTimeoutError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
