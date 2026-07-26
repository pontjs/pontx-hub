import { Link } from "react-router";
import type { CatalogSummary, Locale } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";

export function ApiCard({
  api,
  locale,
  index
}: {
  api: CatalogSummary;
  locale: Locale;
  index: number;
}) {
  return (
    <Link
      className="api-card"
      to={`/${locale}/apis/${api.slug}`}
      style={{ "--api-accent": api.accent } as React.CSSProperties}
      aria-label={`${localize(api.title, locale)} — ${api.operationCount} operations`}
    >
      <div className="api-card-number">{String(index + 1).padStart(2, "0")}</div>
      <div className="api-card-heading">
        <span className="provider-monogram">{api.provider.slice(0, 2)}</span>
        <div>
          <h3>{localize(api.title, locale)}</h3>
          <p>{localize(api.summary, locale)}</p>
        </div>
      </div>
      <span className="api-card-category">{api.category}</span>
      <strong className="api-card-operation-count">{api.operationCount}</strong>
      <span className="api-card-auth">{api.authTypes.join(" / ") || "public"}</span>
      <span className={`api-card-sdk sdk-${api.sdkStatus}`}>
        {api.sdkStatus === "published"
          ? `v${api.sdkVersion}`
          : locale === "zh"
            ? "计划中"
            : "planned"}
      </span>
      <span className="api-card-arrow" aria-hidden="true">→</span>
    </Link>
  );
}
