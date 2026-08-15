export const AGENT_EXECUTION_TIMEOUT_MS = 35_000;

export class AgentExecutionTimeoutError extends Error {
  constructor() {
    super("Agent execution timed out");
    this.name = "AgentExecutionTimeoutError";
  }
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

/**
 * A prepared call remains explicit in the UI. This only bounds waiting for the
 * Hub response; it never retries an API request automatically.
 */
export async function postJsonWithTimeout<T>(
  url: string,
  body: unknown,
  fetcher: FetchLike = fetch,
  timeoutMs = AGENT_EXECUTION_TIMEOUT_MS
): Promise<{ response: Response; body: T }> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    return { response, body: await response.json() as T };
  } catch (error) {
    if (timedOut) throw new AgentExecutionTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
