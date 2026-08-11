export function isCatalogSearchPending(
  draftQuery: string,
  committedQuery: string,
): boolean {
  return draftQuery.trim() !== committedQuery;
}

export function CatalogSearchStatus({
  locale,
  pending,
  summary,
}: {
  locale: "zh" | "en";
  pending: boolean;
  summary: string;
}) {
  return (
    <span
      id="catalog-search-status"
      className={`catalog-search-state${pending ? " is-loading" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {pending ? (
        <>
          <span className="catalog-search-spinner" aria-hidden="true" />
          <span>{locale === "zh" ? "正在搜索…" : "Searching…"}</span>
        </>
      ) : (
        summary
      )}
    </span>
  );
}
