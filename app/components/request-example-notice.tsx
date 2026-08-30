import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@pontx/shadcn-ui";
import type {
  CatalogApiContext,
  CatalogOperation,
  CatalogRequestExample,
  Locale
} from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { RequestExampleSummary } from "~/components/request-example-summary";

export function RequestExampleNotice({
  locale,
  api,
  operation,
  example,
  selectedId,
  executionUnavailable = false,
  onSelect,
  onPreview
}: {
  locale: Locale;
  api: CatalogApiContext;
  operation: CatalogOperation;
  example: CatalogRequestExample;
  selectedId?: string;
  executionUnavailable?: boolean;
  onSelect?: (id: string) => void;
  onPreview?: () => void;
}) {
  const zh = locale === "zh";
  return (
    <RequestExampleSummary
      locale={locale}
      api={api}
      operation={operation}
      example={example}
      executionUnavailable={executionUnavailable}
    >
      {onSelect || onPreview ? (
        <div className="request-example-actions">
          {onSelect && operation.requestExamples.length > 1 ? (
            <div className="request-example-selector">
              <span id={`request-example-selector-${operation.slug}`}>{zh ? "示例" : "Example"}</span>
              <Select value={selectedId ?? example.id} onValueChange={onSelect}>
                <SelectTrigger
                  className="request-example-select-trigger"
                  aria-labelledby={`request-example-selector-${operation.slug}`}
                >
                  <SelectValue>{localize(example.title, locale)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="request-example-select-content">
                  {operation.requestExamples.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {localize(candidate.title, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {onPreview ? (
            <button type="button" onClick={onPreview}>
              {zh ? "在 Playground 中预览" : "Preview successful example"}
            </button>
          ) : null}
        </div>
      ) : null}
    </RequestExampleSummary>
  );
}
