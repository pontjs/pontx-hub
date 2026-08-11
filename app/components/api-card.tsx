import { Link } from "react-router";
import type { CatalogSummary, Locale } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";
import { publicResourceTerminologyCopy } from "~/lib/i18n";

export function ApiCard({
  api,
  locale,
  index
}: {
  api: CatalogSummary;
  locale: Locale;
  index: number;
}) {
  const terminology = publicResourceTerminologyCopy(locale);
  const category = locale === "zh"
    ? ({ Finance: "金融", Productivity: "效率工具" } as Record<string, string>)[api.category] ?? api.category
    : api.category;
  const auth = api.authTypes.length
    ? api.authTypes.join(" / ")
    : locale === "zh" ? "无需鉴权" : "No auth";
  return (
    <article className="api-card-shell">
      <Link
        className="api-card"
        to={`/${locale}/apis/${api.slug}`}
        reloadDocument
        aria-label={`${localize(api.title, locale)} — ${api.operationCount} ${
        locale === "zh" ? "个接口" : "endpoints"
      }`}
      >
        <div className="api-card-main">
        <div className="api-card-topline">
          <span>{terminology.apiProduct}</span>
          <span>{category}</span>
          <span>{String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className="api-card-heading">
          <span className="provider-monogram" aria-hidden="true">{api.provider.slice(0, 2)}</span>
          <div>
            <span className="api-card-provider">{api.provider}</span>
            <h3>{localize(api.title, locale)}</h3>
          </div>
        </div>
        <p className="api-card-summary">{localize(api.summary, locale)}</p>
        <div className="api-card-action">
          <span>{locale === "zh" ? "查看 API 概览" : "Open API overview"}</span>
          <span className="api-card-arrow" aria-hidden="true">↗</span>
        </div>
        </div>
        <dl className="api-card-meta">
        <div>
          <dt>{terminology.endpoints}</dt>
          <dd>{api.operationCount}</dd>
        </div>
        <div>
          <dt>{locale === "zh" ? "鉴权" : "Auth"}</dt>
          <dd>{auth}</dd>
        </div>
        <div>
          <dt>SDK</dt>
          <dd className={`sdk-${api.sdkStatus}`}>
            {api.sdkStatus === "published"
              ? `v${api.sdkVersion}`
              : locale === "zh"
                ? "计划中"
                : "Planned"}
          </dd>
        </div>
        </dl>
      </Link>
    </article>
  );
}
