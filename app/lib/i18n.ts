import type { Locale } from "./catalog/types";

export function preferredLocale(acceptLanguage: string | null): Locale {
  const candidates = (acceptLanguage ?? "")
    .split(",")
    .map((entry) => {
      const [tag, ...parameters] = entry.trim().toLowerCase().split(";");
      const quality = parameters
        .map((value) => value.trim().match(/^q=(0(?:\.\d+)?|1(?:\.0+)?)$/)?.[1])
        .find(Boolean);
      return { tag, quality: quality === undefined ? 1 : Number(quality) };
    })
    .filter(({ quality }) => quality > 0)
    .sort((left, right) => right.quality - left.quality);

  for (const { tag } of candidates) {
    if (tag === "zh" || tag.startsWith("zh-")) return "zh";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return "en";
}

export function alternateLocaleUrl(
  pathname: string,
  search: string,
  hash: string,
  nextLocale: Locale
): string {
  const localizedPath = pathname.replace(/^\/(?:zh|en)(?=\/|$)/, `/${nextLocale}`);
  return `${localizedPath}${search}${hash}`;
}
