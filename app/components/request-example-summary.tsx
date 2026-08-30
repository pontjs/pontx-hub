import type { ReactNode } from "react";
import { Link } from "react-router";
import type {
  CatalogApiContext,
  CatalogOperation,
  CatalogRequestExample,
  Locale
} from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { requestExampleInputLabel } from "~/lib/playground/request-examples";

function runtimeSource(reason: string, locale: Locale): string {
  const messages: Record<string, { zh: string; en: string }> = {
    "current-resource": {
      zh: "来自当前账号或环境中的现有资源",
      en: "Use an existing resource from the current account or environment"
    },
    "current-time": {
      zh: "按调用时的当前时间填写",
      en: "Supply a value based on the current time"
    },
    "provider-state": {
      zh: "由供应商当前状态决定",
      en: "Supply a value from the provider's current state"
    },
    "user-context": {
      zh: "按本次调用上下文填写",
      en: "Supply a value for the current request context"
    }
  };
  return messages[reason]?.[locale] ??
    (locale === "zh" ? `运行时提供：${reason}` : `Runtime input: ${reason}`);
}

export function RequestExampleSummary({
  locale,
  api,
  operation,
  example,
  executionUnavailable = false,
  children
}: {
  locale: Locale;
  api: CatalogApiContext;
  operation: CatalogOperation;
  example: CatalogRequestExample;
  executionUnavailable?: boolean;
  children?: ReactNode;
}) {
  const zh = locale === "zh";
  const requiresInput = example.completeness === "requires-input";
  const description = requiresInput
    ? zh
      ? `已填入稳定值；发送前还需补充 ${example.unresolved.length} 个动态输入。`
      : `Stable values are prefilled; complete ${example.unresolved.length} dynamic input(s) before sending.`
    : executionUnavailable
      ? zh
        ? "请求已按成功示例预填；在线调用需要专用执行适配器，当前尚未提供。"
        : "The successful request example is prefilled; online calls need a dedicated execution adapter, which is not available yet."
      : zh
        ? "已填入一组可成功调用的示例值；检查并确认后即可发送。"
        : "A successful request example is prefilled and ready to review before sending.";

  return (
    <aside
      className={`request-example-notice ${requiresInput ? "requires-input" : "ready"}`}
      aria-labelledby={`request-example-${operation.slug}`}
    >
      <div className="request-example-heading">
        <div>
          <span className="request-example-kicker">
            {zh ? "成功请求示例" : "Successful request example"}
          </span>
          <strong id={`request-example-${operation.slug}`}>
            {localize(example.title, locale)}
          </strong>
        </div>
        <span className="request-example-state">
          {requiresInput
            ? zh ? "需补充输入" : "Input required"
            : executionUnavailable
              ? zh ? "暂不可调用" : "Unavailable"
              : zh ? "可发送" : "Ready"}
        </span>
      </div>
      <p>{description}</p>
      <div className="request-example-meta">
        <span>HTTP {example.expectedStatus}</span>
        {example.verifiedAt ? (
          <span>
            {zh ? "验证" : "Verified"} <time dateTime={example.verifiedAt}>{example.verifiedAt}</time>
          </span>
        ) : null}
      </div>
      {example.unresolved.length ? (
        <ul className="request-example-inputs">
          {example.unresolved.map((input) => {
            const sourceOperationId = input.source.kind === "operation"
              ? input.source.operationId
              : undefined;
            const sourceOperation = sourceOperationId
              ? api.operations.find((candidate) => candidate.operationId === sourceOperationId)
              : undefined;
            return (
              <li key={`${input.in}:${input.name}`}>
                <code>{requestExampleInputLabel(input)}</code>
                <span>
                  {sourceOperation ? (
                    <>
                      {zh ? "来源：" : "Source: "}
                      <Link to={`/${locale}/apis/${api.slug}/${sourceOperation.slug}`}>
                        {localize(sourceOperation.title, locale)}
                      </Link>
                    </>
                  ) : input.source.kind === "runtime" ? (
                    runtimeSource(input.source.reason, locale)
                  ) : (
                    zh ? "需要前置接口返回值" : "Requires output from a prerequisite endpoint"
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {children}
    </aside>
  );
}
