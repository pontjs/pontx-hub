import type { Locale } from "./catalog/types";
import { isLocale } from "./catalog/types";

export const CANONICAL_SITE_ORIGIN = "https://pontx-hub.vercel.app";

export function requireLocale(value: string | undefined): Locale {
  if (!isLocale(value)) {
    throw new Response("Locale not found", { status: 404 });
  }
  return value;
}

export function siteUrl(path = ""): string {
  return new URL(path, CANONICAL_SITE_ORIGIN).toString();
}

export function cacheHeaders(seconds = 300): HeadersInit {
  return {
    "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 5}`
  };
}
