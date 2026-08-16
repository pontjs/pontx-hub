export type AnalyticsEventParameters = Record<
  string,
  string | number | boolean | undefined
>;

type GoogleAnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

/**
 * Sends only caller-supplied, already-sanitized product analytics metadata.
 *
 * This intentionally does not queue events before GA is initialized. A missing
 * analytics script (for example, when a visitor uses a content blocker) must
 * never affect the product experience.
 */
export function trackAnalyticsEvent(
  eventName: string,
  parameters: AnalyticsEventParameters
) {
  if (typeof window === "undefined") return;
  (window as GoogleAnalyticsWindow).gtag?.("event", eventName, parameters);
}
