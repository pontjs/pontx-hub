import { describe, expect, it, vi } from "vitest";
import {
  createPageViewParameters,
  initializeGoogleAnalytics,
  INTERNAL_TRAFFIC_STORAGE_KEY,
  INTERNAL_TRAFFIC_TYPE,
  resolveInternalTraffic
} from "./internal-traffic";

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    value: (key: string) => values.get(key)
  };
}

describe("resolveInternalTraffic", () => {
  it("stores the bootstrap marker and removes only its query parameter", () => {
    const localStorage = storage();
    const replaceUrl = vi.fn();

    expect(resolveInternalTraffic({
      href: "https://pontx.dev/zh?query=rates&pontx_internal=1#results",
      getStorage: () => localStorage,
      replaceUrl
    })).toBe(true);
    expect(localStorage.value(INTERNAL_TRAFFIC_STORAGE_KEY)).toBe(INTERNAL_TRAFFIC_TYPE);
    expect(replaceUrl).toHaveBeenCalledWith("/zh?query=rates#results");
  });

  it("uses a persisted marker without rewriting the URL", () => {
    const localStorage = storage({
      [INTERNAL_TRAFFIC_STORAGE_KEY]: INTERNAL_TRAFFIC_TYPE
    });
    const replaceUrl = vi.fn();

    expect(resolveInternalTraffic({
      href: "https://pontx.dev/en/docs",
      getStorage: () => localStorage,
      replaceUrl
    })).toBe(true);
    expect(replaceUrl).not.toHaveBeenCalled();
  });

  it("removes a persisted marker when the disable command is present", () => {
    const localStorage = storage({
      [INTERNAL_TRAFFIC_STORAGE_KEY]: INTERNAL_TRAFFIC_TYPE
    });
    const replaceUrl = vi.fn();

    expect(resolveInternalTraffic({
      href: "https://pontx.dev/zh?pontx_internal=0&query=sdk#cli",
      getStorage: () => localStorage,
      replaceUrl
    })).toBe(false);
    expect(localStorage.value(INTERNAL_TRAFFIC_STORAGE_KEY)).toBeUndefined();
    expect(replaceUrl).toHaveBeenCalledWith("/zh?query=sdk#cli");
  });

  it("ignores unknown commands while cleaning them from the address bar", () => {
    const localStorage = storage();
    const replaceUrl = vi.fn();

    expect(resolveInternalTraffic({
      href: "https://pontx.dev/zh?pontx_internal=maybe",
      getStorage: () => localStorage,
      replaceUrl
    })).toBe(false);
    expect(replaceUrl).toHaveBeenCalledWith("/zh");
  });

  it("marks the current load when Local Storage is unavailable", () => {
    const replaceUrl = vi.fn();

    expect(resolveInternalTraffic({
      href: "https://pontx.dev/zh?pontx_internal=1",
      getStorage: () => { throw new Error("blocked"); },
      replaceUrl
    })).toBe(true);
    expect(replaceUrl).toHaveBeenCalledWith("/zh");
  });
});

describe("Google Analytics commands", () => {
  it("sets internal traffic after js and before config", () => {
    const calls: unknown[][] = [];
    const now = new Date("2026-08-15T00:00:00.000Z");

    initializeGoogleAnalytics({
      gtag: (...args) => calls.push(args),
      measurementId: "G-TEST",
      internal: true,
      now
    });

    expect(calls).toEqual([
      ["js", now],
      ["set", { traffic_type: INTERNAL_TRAFFIC_TYPE }],
      ["config", "G-TEST", { send_page_view: false }]
    ]);
  });

  it("does not set a traffic type for external traffic", () => {
    const calls: unknown[][] = [];

    initializeGoogleAnalytics({
      gtag: (...args) => calls.push(args),
      measurementId: "G-TEST",
      internal: false,
      now: new Date(0)
    });

    expect(calls.map(([command]) => command)).toEqual(["js", "config"]);
  });

  it("builds query-free page views and marks only internal traffic", () => {
    expect(createPageViewParameters({
      origin: "https://pontx.dev",
      pathname: "/zh/search",
      pageTitle: "Search",
      internal: true
    })).toEqual({
      page_location: "https://pontx.dev/zh/search",
      page_path: "/zh/search",
      page_title: "Search",
      traffic_type: INTERNAL_TRAFFIC_TYPE
    });

    expect(createPageViewParameters({
      origin: "https://pontx.dev",
      pathname: "/en/docs",
      pageTitle: "Docs",
      internal: false
    })).toEqual({
      page_location: "https://pontx.dev/en/docs",
      page_path: "/en/docs",
      page_title: "Docs"
    });
  });
});
