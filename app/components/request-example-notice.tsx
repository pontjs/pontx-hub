import { Link } from "react-router";
import type {
  CatalogApi,
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

export function RequestExampleNotice({
  locale,
  api,
  operation,
  example,
  selectedId,
  previewOnly = false,
  onSelect,
  onReset
}: {
  locale: Locale;
  api: CatalogApi;
  operation: CatalogOperation;
  example: CatalogRequestExample;
  selectedId?: string;
  previewOnly?: boolean;
  onSelect?: (id: string) => void;
  onReset?: () => void;
}) {
  const zh = locale === "zh";
  const requiresInput = example.completeness === "requires-input";
  const description = requiresInput
    ? zh
      ? `已填入稳定值；发送前还需补充 ${example.unresolved.length} 个动态输入。`
      : `Stable values are prefilled; complete ${example.unresolved.length} dynamic input(s) before sending.`
    : previewOnly
      ? zh
        ? "请求已按成功示例预填；Hub 仅生成预览，不会向供应商发送。"
        : "The successful request example is prefilled; Hub will preview it without contacting the provider."
      : zh
        ? "请求已按成功示例预填，可以检查后直接发送。"
        : "The successful request example is prefilled and ready to review and send.";

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
            : previewOnly
              ? zh ? "仅预览" : "Preview only"
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
      {onSelect || onReset ? (
        <div className="request-example-actions">
          {onSelect && operation.requestExamples.length > 1 ? (
            <label>
              <span>{zh ? "示例" : "Example"}</span>
              <select value={selectedId ?? example.id} onChange={(event) => onSelect(event.target.value)}>
                {operation.requestExamples.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {localize(candidate.title, locale)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {onReset ? (
            <button type="button" onClick={onReset}>
              {zh ? "恢复此示例" : "Restore example"}
            </button>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
