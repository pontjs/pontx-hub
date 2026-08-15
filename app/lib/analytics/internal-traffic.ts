export const INTERNAL_TRAFFIC_QUERY_PARAMETER = "pontx_internal";
export const INTERNAL_TRAFFIC_STORAGE_KEY = "pontx.analytics.traffic_type";
export const INTERNAL_TRAFFIC_TYPE = "internal";

type AnalyticsStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type InternalTrafficContext = {
  href: string;
  getStorage: () => AnalyticsStorage;
  replaceUrl: (url: string) => void;
};

export type GoogleTag = (...args: unknown[]) => void;

export function resolveInternalTraffic({
  href,
  getStorage,
  replaceUrl
}: InternalTrafficContext): boolean {
  const url = new URL(href);
  const command = url.searchParams.get(INTERNAL_TRAFFIC_QUERY_PARAMETER);
  let internal: boolean | undefined;

  try {
    const storage = getStorage();

    if (command === "1") {
      storage.setItem(INTERNAL_TRAFFIC_STORAGE_KEY, INTERNAL_TRAFFIC_TYPE);
      internal = true;
    } else if (command === "0") {
      storage.removeItem(INTERNAL_TRAFFIC_STORAGE_KEY);
      internal = false;
    } else {
      internal = storage.getItem(INTERNAL_TRAFFIC_STORAGE_KEY) === INTERNAL_TRAFFIC_TYPE;
    }
  } catch {
    // Storage may be unavailable in hardened or ephemeral browser contexts.
    // The bootstrap command must still mark the current page without breaking it.
    if (command === "1") internal = true;
    if (command === "0") internal = false;
  }

  if (url.searchParams.has(INTERNAL_TRAFFIC_QUERY_PARAMETER)) {
    url.searchParams.delete(INTERNAL_TRAFFIC_QUERY_PARAMETER);
    try {
      replaceUrl(`${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Page-view analytics already excludes every query parameter, so failure
      // to clean the address bar must not break rendering or leak the command.
    }
  }

  return internal ?? false;
}

export function initializeGoogleAnalytics({
  gtag,
  measurementId,
  internal,
  now = new Date()
}: {
  gtag: GoogleTag;
  measurementId: string;
  internal: boolean;
  now?: Date;
}) {
  gtag("js", now);
  if (internal) {
    gtag("set", { traffic_type: INTERNAL_TRAFFIC_TYPE });
  }
  gtag("config", measurementId, { send_page_view: false });
}

export function createPageViewParameters({
  origin,
  pathname,
  pageTitle,
  internal
}: {
  origin: string;
  pathname: string;
  pageTitle: string;
  internal: boolean;
}) {
  return {
    page_location: `${origin}${pathname}`,
    page_path: pathname,
    page_title: pageTitle,
    ...(internal ? { traffic_type: INTERNAL_TRAFFIC_TYPE } : {})
  };
}
