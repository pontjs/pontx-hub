import type { CatalogOperation, Locale } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";

type OperationExecutionPolicy = Pick<
  CatalogOperation,
  "proxyEnabled" | "proxyDisabledReason"
> & Partial<Pick<CatalogOperation, "style" | "method" | "path">>;

export type PlaygroundAvailability = {
  executionEnabled: boolean;
  disabledReason?: string;
};

export function getPlaygroundAvailability(
  operation: OperationExecutionPolicy,
  locale: Locale
): PlaygroundAvailability {
  const executionEnabled =
    (operation.style ?? "RESTFul") === "RESTFul" &&
    operation.proxyEnabled !== false;

  if (executionEnabled) return { executionEnabled: true };

  return {
    executionEnabled: false,
    disabledReason: operation.proxyDisabledReason
      ? localize(operation.proxyDisabledReason, locale)
      : operation.style && operation.style !== "RESTFul"
        ? locale === "zh"
          ? `${operation.style} 规范可浏览和搜索；在线调用需要专用执行适配器，当前尚未提供。`
          : `${operation.style} specs are browsable and searchable; online calls need a dedicated execution adapter, which is not available yet.`
      : locale === "zh"
        ? "此接口尚未接入在线调用适配器。"
        : "This endpoint has not been connected to an online-call adapter yet."
  };
}
