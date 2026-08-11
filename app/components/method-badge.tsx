import type { HttpMethod } from "~/lib/catalog/types";
import { MethodBadge as SharedMethodBadge } from "@pontx/shadcn-ui";

export function MethodBadge({
  method,
  compact = false
}: {
  method: HttpMethod;
  compact?: boolean;
}) {
  return (
    <SharedMethodBadge
      method={method}
      className={`method-badge method-${method.toLowerCase()} ${
        compact ? "method-compact" : ""
      }`}
    />
  );
}
