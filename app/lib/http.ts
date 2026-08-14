import type { Locale } from "./catalog/types";
import { isLocale } from "./catalog/types";

const DEFAULT_PUBLIC_SITE_ORIGIN = "https://pontx.dev";

function publicSiteOrigin(): string {
  const configured = typeof process === "undefined"
    ? undefined
    : process.env.PONTX_PUBLIC_SITE_ORIGIN?.trim();
  if (!configured) return DEFAULT_PUBLIC_SITE_ORIGIN;
  try {
    const origin = new URL(configured).origin;
    return origin.startsWith("https://") ? origin : DEFAULT_PUBLIC_SITE_ORIGIN;
  } catch {
    return DEFAULT_PUBLIC_SITE_ORIGIN;
  }
}

export const CANONICAL_SITE_ORIGIN = publicSiteOrigin();

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
