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
          ? `${operation.style} 规范可浏览和搜索，但本次尚未提供网络执行器。`
          : `${operation.style} specs are browsable and searchable, but do not have a network executor yet.`
      : locale === "zh"
        ? "此接口仅支持预览，Hub 不会向供应商发送请求。"
        : "This endpoint is preview-only; Hub will not send the request to the provider."
  };
}
