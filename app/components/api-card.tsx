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
    <article
      className="api-card"
      style={{ "--api-accent": api.accent } as React.CSSProperties}
    >
      <div className="api-card-number">{String(index + 1).padStart(2, "0")}</div>
      <div className="api-card-heading">
        <span className="provider-monogram">{api.provider.slice(0, 2)}</span>
        <div>
          <p>{api.category}</p>
          <h3>{localize(api.title, locale)}</h3>
        </div>
      </div>
      <p className="api-card-summary">{localize(api.summary, locale)}</p>
      <div className="api-card-meta">
        <span>{api.operationCount} operations</span>
        <span>{api.authTypes.join(" · ") || "public"}</span>
        <span>
          {api.sdkStatus === "published"
            ? `SDK ${api.sdkVersion}`
            : locale === "zh"
              ? "SDK 即将发布"
              : "SDK coming soon"}
        </span>
      </div>
      <Link className="card-link" to={`/${locale}/apis/${api.slug}`}>
        {locale === "zh" ? "打开参考文档" : "Open reference"}
        <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}
