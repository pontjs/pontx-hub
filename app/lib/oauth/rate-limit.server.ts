type Bucket = { startedAt: number; count: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const LIMIT = 10;

export function consumeOAuthQuota(clientId: string, now = Date.now()) {
  const bucket = buckets.get(clientId);
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    buckets.set(clientId, { startedAt: now, count: 1 });
    return true;
  }
  if (bucket.count >= LIMIT) return false;
  bucket.count += 1;
  return true;
}

export function resetOAuthQuotasForTests() { buckets.clear(); }
