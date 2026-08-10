import type { Locale } from "~/lib/catalog/types";

export function safeAccountReturnTo(value: string | null | undefined, locale: Locale): string {
  const fallback = `/${locale}`;
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const parsed = new URL(value, "https://pontx.local");
    if (parsed.origin !== "https://pontx.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
