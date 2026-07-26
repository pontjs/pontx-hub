import type { Locale } from "./catalog/types";
import { isLocale } from "./catalog/types";

export function requireLocale(value: string | undefined): Locale {
  if (!isLocale(value)) {
    throw new Response("Locale not found", { status: 404 });
  }
  return value;
}

export function siteUrl(path = ""): string {
  const base =
    typeof window === "undefined"
      ? process.env.PUBLIC_SITE_URL ?? "http://localhost:5173"
      : window.location.origin;
  return new URL(path, base).toString();
}

export function cacheHeaders(seconds = 300): HeadersInit {
  return {
    "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 5}`
  };
}
