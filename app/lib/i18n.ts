import type { Locale } from "./catalog/types";

const PUBLIC_RESOURCE_TERMINOLOGY_COPY = {
  zh: {
    apiBadge: "API 产品",
    apiProduct: "API 产品",
    apiProducts: "API 产品",
    endpoint: "接口",
    endpoints: "接口",
    schema: "数据结构",
    schemas: "数据结构"
  },
  en: {
    apiBadge: "API",
    apiProduct: "API product",
    apiProducts: "API products",
    endpoint: "Endpoint",
    endpoints: "Endpoints",
    schema: "Schema",
    schemas: "Schemas"
  }
} as const satisfies Record<Locale, Record<string, string>>;

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

const AGENT_SKILL_HERO_COPY = {
  zh: {
    heading: "让 Agent 搜索、集成并调用 Pontx Hub 中的任意 API。"
  },
  en: {
    heading: "Let agents search, integrate, and call any API in Pontx Hub."
  }
} as const satisfies Record<Locale, Record<string, string>>;

export function publicResourceTerminologyCopy(locale: Locale) {
  return PUBLIC_RESOURCE_TERMINOLOGY_COPY[locale];
}

export function apiWorkspaceNavigationCopy(locale: Locale) {
  return API_WORKSPACE_NAVIGATION_COPY[locale];
}

export function agentSkillHeroCopy(locale: Locale) {
  return AGENT_SKILL_HERO_COPY[locale];
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
