import type { Locale } from "./catalog/types";

const API_WORKSPACE_NAVIGATION_COPY = {
  zh: {
    endpointTab: "接口",
    browseAllEndpoints: "浏览全部接口",
    openSelectedEndpoint: "打开所选接口",
    openRelatedEndpoint: "查看相关接口"
  },
  en: {
    endpointTab: "Endpoints",
    browseAllEndpoints: "Browse all endpoints",
    openSelectedEndpoint: "Open selected endpoint",
    openRelatedEndpoint: "Open related endpoint"
  }
} as const satisfies Record<Locale, Record<string, string>>;

export function apiWorkspaceNavigationCopy(locale: Locale) {
  return API_WORKSPACE_NAVIGATION_COPY[locale];
}

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

export function alternateLocaleHref(
  pathname: string,
  search: string,
  hash: string,
  nextLocale: Locale,
  hydrated: boolean
): string {
  return alternateLocaleUrl(
    pathname,
    search,
    hydrated ? hash : "",
    nextLocale
  );
}
