import { trackAnalyticsEvent } from "./client";
import type { GlobalSearchResult, Locale } from "~/lib/catalog/types";

type CodeCopySurface = "sdk" | "hub_skill" | "product_skill" | "docs";
type CodeCopyKind = "install" | "typescript" | "cli" | "workflow" | "example";

function countBucket(value: number): string {
  if (value <= 0) return "0";
  if (value <= 5) return "1-5";
  if (value <= 20) return "6-20";
  if (value <= 100) return "21-100";
  return "101+";
}

function searchLengthBucket(query: string): string {
  return countBucket(Array.from(query.trim()).length);
}

/**
 * Search text is deliberately reduced to a length bucket. Queries can contain
 * sensitive project names or pasted credentials, and must never reach GA.
 */
export function trackCatalogSearchViewed({
  locale,
  query,
  resultCount
}: {
  locale: Locale;
  query: string;
  resultCount: number;
}) {
  trackAnalyticsEvent("catalog_search_viewed", {
    surface: "catalog",
    locale,
    query_length_bucket: searchLengthBucket(query),
    result_count_bucket: countBucket(resultCount)
  });
}

export function trackSearchResultOpened({
  locale,
  result
}: {
  locale: Locale;
  result: GlobalSearchResult;
}) {
  trackAnalyticsEvent("search_result_opened", {
    locale,
    resource_kind: result.kind,
    api_slug: result.apiSlug,
    ...(result.kind === "endpoint" ? { operation_slug: result.operationSlug } : {}),
    match_mode: result.match.mode
  });
}

export function trackCatalogResourceOpened({
  locale,
  apiSlug,
  target
}: {
  locale: Locale;
  apiSlug: string;
  target: "api" | "sdk";
}) {
  trackAnalyticsEvent("catalog_resource_opened", {
    locale,
    api_slug: apiSlug,
    target
  });
}

export function trackCodeCopied({
  surface,
  kind,
  apiSlug
}: {
  surface: CodeCopySurface;
  kind: CodeCopyKind;
  apiSlug?: string;
}) {
  trackAnalyticsEvent("code_copied", {
    surface,
    code_kind: kind,
    ...(apiSlug ? { api_slug: apiSlug } : {})
  });
}

export function trackSdkNpmOpened({
  locale,
  apiSlug
}: {
  locale: Locale;
  apiSlug: string;
}) {
  trackAnalyticsEvent("sdk_npm_opened", {
    locale,
    api_slug: apiSlug
  });
}

export function trackPlaygroundRequest({
  apiSlug,
  operationSlug,
  mode,
  outcome,
  blocker
}: {
  apiSlug: string;
  operationSlug: string;
  mode: "preview_only" | "execute";
  outcome: "blocked" | "previewed" | "cancelled" | "succeeded" | "failed";
  blocker?: "oauth" | "dynamic_input";
}) {
  trackAnalyticsEvent("playground_request", {
    api_slug: apiSlug,
    operation_slug: operationSlug,
    request_mode: mode,
    outcome,
    ...(blocker ? { blocker } : {})
  });
}
