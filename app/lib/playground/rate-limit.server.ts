type Bucket = { windowStartedAt: number; count: number };

const WINDOW_MS = 60_000;
const LIMIT = 20;
const buckets = new Map<string, Bucket>();

export function executionClientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function consumeExecutionQuota(
  clientId: string,
  now = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  const current = buckets.get(clientId);
  if (!current || now - current.windowStartedAt >= WINDOW_MS) {
    buckets.set(clientId, { windowStartedAt: now, count: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((WINDOW_MS - (now - current.windowStartedAt)) / 1000)
      )
    };
  }
  current.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetExecutionQuotasForTests(): void {
  buckets.clear();
}
