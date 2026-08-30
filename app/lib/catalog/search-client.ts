import type { GlobalSearchResponse, Locale } from "./types";

type SearchEnvelope = {
  data?: GlobalSearchResponse;
  error?: { message?: string };
};

export function catalogSearchApiHref(
  query: string,
  locale: Locale,
  limit = 60,
): string {
  const search = new URLSearchParams({
    q: query.trim(),
    locale,
    limit: String(limit),
  });
  return `/api/v2/search?${search.toString()}`;
}

export async function fetchCatalogSearch(
  query: string,
  locale: Locale,
  signal?: AbortSignal,
): Promise<GlobalSearchResponse> {
  const response = await fetch(catalogSearchApiHref(query, locale), { signal });
  const payload = await response.json() as SearchEnvelope;

  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? `Search failed with ${response.status}`);
  }

  return payload.data;
}
