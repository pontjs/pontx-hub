import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import {
  createPageViewParameters,
  initializeGoogleAnalytics,
  resolveInternalTraffic
} from "~/lib/analytics/internal-traffic";

type GoogleAnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

export function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  const location = useLocation();
  const initialized = useRef(false);

  useEffect(() => {
    if (!measurementId) {
      return;
    }

    const analyticsWindow = window as GoogleAnalyticsWindow;
    analyticsWindow.dataLayer ??= [];
    analyticsWindow.gtag ??= function gtag() {
      analyticsWindow.dataLayer?.push(arguments);
    };

    const internal = resolveInternalTraffic({
      href: window.location.href,
      getStorage: () => window.localStorage,
      replaceUrl: (url) => window.history.replaceState(window.history.state, "", url)
    });

    if (!initialized.current) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.appendChild(script);

      initializeGoogleAnalytics({
        gtag: analyticsWindow.gtag,
        measurementId,
        internal
      });
      initialized.current = true;
    }

    analyticsWindow.gtag("event", "page_view", createPageViewParameters({
      // Never send query parameters: OAuth callbacks and Playground URLs may
      // contain short-lived or user-provided values.
      origin: window.location.origin,
      pathname: location.pathname,
      pageTitle: document.title,
      internal
    }));
  }, [location.pathname, measurementId]);

  return null;
}
