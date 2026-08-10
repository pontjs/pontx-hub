import type { CatalogApi, CatalogOperation, Locale } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";

type ApiExecutionPolicy = Pick<CatalogApi, "proxyEnabled">;
type OperationExecutionPolicy = Pick<
  CatalogOperation,
  "proxyEnabled" | "proxyDisabledReason"
>;

export type PlaygroundAvailability = {
  executionEnabled: boolean;
  disabledReason?: string;
};

export function getPlaygroundAvailability(
  api: ApiExecutionPolicy,
  operation: OperationExecutionPolicy,
  locale: Locale
): PlaygroundAvailability {
  const executionEnabled =
    api.proxyEnabled && operation.proxyEnabled !== false;

  if (executionEnabled) return { executionEnabled: true };

  return {
    executionEnabled: false,
    disabledReason: operation.proxyDisabledReason
      ? localize(operation.proxyDisabledReason, locale)
      : locale === "zh"
        ? "此接口仅支持预览，Hub 不会向供应商发送请求。"
        : "This endpoint is preview-only; Hub will not send the request to the provider."
  };
}
