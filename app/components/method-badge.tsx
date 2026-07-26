import type { HttpMethod } from "~/lib/catalog/types";

export function MethodBadge({
  method,
  compact = false
}: {
  method: HttpMethod;
  compact?: boolean;
}) {
  return (
    <span
      className={`method-badge method-${method.toLowerCase()} ${
        compact ? "method-compact" : ""
      }`}
    >
      {method}
    </span>
  );
}
