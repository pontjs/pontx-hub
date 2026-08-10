import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

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

    if (!initialized.current) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.appendChild(script);

      analyticsWindow.gtag("js", new Date());
      analyticsWindow.gtag("config", measurementId, { send_page_view: false });
      initialized.current = true;
    }

    analyticsWindow.gtag("event", "page_view", {
      // Never send query parameters: OAuth callbacks and Playground URLs may
      // contain short-lived or user-provided values.
      page_location: `${window.location.origin}${location.pathname}`,
      page_path: location.pathname,
      page_title: document.title
    });
  }, [location.pathname, measurementId]);

  return null;
}
