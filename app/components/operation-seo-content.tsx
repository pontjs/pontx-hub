import { Link } from "react-router";
import type { CatalogApi, CatalogOperation, Locale } from "~/lib/catalog/types";
import { localize } from "~/lib/catalog/types";

export function DocumentationEvidence({
  locale,
  operation
}: {
  locale: Locale;
  operation: CatalogOperation;
}) {
  const zh = locale === "zh";
  const hasEvidence =
    (operation.proxyEnabled === false && Boolean(operation.proxyDisabledReason)) ||
    Boolean(operation.stabilityNote) ||
    Boolean(operation.verifiedAt) ||
    operation.evidenceUrls.length > 0;

  if (!hasEvidence) return null;

  return (
    <aside className="documentation-evidence">
      {operation.proxyEnabled === false && operation.proxyDisabledReason ? (
        <p>{zh ? "仅预览：" : "Preview only: "}{localize(operation.proxyDisabledReason, locale)}</p>
      ) : null}
      {operation.stabilityNote ? <p>{localize(operation.stabilityNote, locale)}</p> : null}
      {operation.verifiedAt ? (
        <p>
          {zh ? "验证日期" : "Verified"}: <time dateTime={operation.verifiedAt}>{operation.verifiedAt}</time>
        </p>
      ) : null}
      {operation.evidenceUrls.length ? (
        <p>
          {zh ? "证据" : "Evidence"}:{" "}
          {operation.evidenceUrls.map((url, index) => (
            <span key={url}>
              {index ? ", " : ""}
              <a href={url} rel="noreferrer">{new URL(url).hostname}</a>
            </span>
          ))}
        </p>
      ) : null}
    </aside>
  );
}

function typeLabel(item: {
  schemaName?: string;
  schemaType?: string;
  type?: string;
}) {
  return item.schemaName ?? item.schemaType ?? item.type ?? "unknown";
}

function Example({ value }: { value: unknown }) {
  if (value === undefined) return null;
  const serialized = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return <pre className="operation-seo-example">{serialized}</pre>;
}

export function OperationSeoContent({
  locale,
  api,
  operation
}: {
  locale: Locale;
  api: CatalogApi;
  operation: CatalogOperation;
}) {
  const zh = locale === "zh";
  const body = operation.parameters.find((parameter) => parameter.in === "body");
  const parameters = operation.parameters.filter((parameter) => parameter.in !== "body");
  const requestSchemaName = operation.requestBody?.schemaName ?? body?.schemaName;
  const requestProperties = operation.requestBody?.properties ?? [];

  return (
    <article className="pontx-documentation-fallback" aria-labelledby="endpoint-title">
      <header className="operation-seo-header">
        <p className="operation-seo-api">
          <span>{api.provider}</span>
          <strong>{localize(api.title, locale)}</strong>
        </p>
        <p className="operation-seo-method">
          <strong>{operation.method}</strong>
          <code>{operation.path}</code>
        </p>
        <h1 id="endpoint-title">{localize(operation.title, locale)}</h1>
        <p>{localize(operation.description, locale)}</p>
        <p className="operation-seo-summary">{localize(api.summary, locale)}</p>
        <DocumentationEvidence locale={locale} operation={operation} />
      </header>

      <section aria-labelledby="request-heading">
        <h2 id="request-heading">{zh ? "请求" : "Request"}</h2>
        <dl className="operation-seo-facts">
          <div><dt>operationId</dt><dd><code>{operation.operationId}</code></dd></div>
          <div><dt>{zh ? "服务器" : "Server"}</dt><dd><code>{api.servers[0]?.url}</code></dd></div>
          <div><dt>{zh ? "认证" : "Authentication"}</dt><dd>{api.auth.map((auth) => auth.id).join(", ") || (zh ? "无" : "None")}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="parameters-heading">
        <h2 id="parameters-heading">{zh ? "请求参数" : "Request parameters"}</h2>
        {parameters.length ? (
          <div className="operation-seo-list">
            {parameters.map((parameter) => (
              <section key={`${parameter.in}:${parameter.name}`}>
                <h3><code>{parameter.name}</code></h3>
                <p>
                  <span>{parameter.in}</span>
                  <span>{typeLabel(parameter)}</span>
                  {parameter.format ? <span>{parameter.format}</span> : null}
                  {parameter.required ? <strong>{zh ? "必填" : "required"}</strong> : null}
                </p>
                {parameter.description ? <p>{localize(parameter.description, locale)}</p> : null}
                <Example value={parameter.example} />
              </section>
            ))}
          </div>
        ) : <p>{zh ? "无 URL、查询或 Header 参数。" : "No URL, query, or header parameters."}</p>}
      </section>

      {operation.requestBody || body ? (
        <section aria-labelledby="body-heading">
          <h2 id="body-heading">{zh ? "Body 参数" : "Request body"}</h2>
          <p className="operation-seo-schema-line">
            {requestSchemaName ? (
              <Link to={`/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(requestSchemaName)}`} reloadDocument>
                {requestSchemaName}
              </Link>
            ) : <span>{typeLabel(body ?? operation.requestBody!)}</span>}
            {body?.required ? <strong>{zh ? "必填" : "required"}</strong> : null}
          </p>
          {operation.requestBody?.description ? <p>{localize(operation.requestBody.description, locale)}</p> : null}
          {operation.requestBody?.contentTypes?.length ? (
            <p><b>Content-Type:</b> {operation.requestBody.contentTypes.join(", ")}</p>
          ) : null}
          {requestProperties.length ? (
            <p><b>{zh ? "字段" : "Properties"}:</b> {requestProperties.map((property) => <code key={property}>{property}</code>)}</p>
          ) : null}
          <Example value={body?.example} />
        </section>
      ) : null}

      <section aria-labelledby="responses-heading">
        <h2 id="responses-heading">{zh ? "响应" : "Responses"}</h2>
        <div className="operation-seo-list">
          {operation.responses.map((response) => (
            <section key={response.status}>
              <h3><code>{response.status}</code></h3>
              <p>
                {response.schemaName ? (
                  <Link to={`/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(response.schemaName)}`} reloadDocument>
                    {response.schemaName}
                  </Link>
                ) : <span>{typeLabel(response)}</span>}
                {response.contentTypes?.map((contentType) => <span key={contentType}>{contentType}</span>)}
              </p>
              {response.description ? <p>{localize(response.description, locale)}</p> : null}
              {response.properties?.length ? (
                <p><b>{zh ? "字段" : "Properties"}:</b> {response.properties.map((property) => <code key={property}>{property}</code>)}</p>
              ) : null}
            </section>
          ))}
        </div>
        <Example value={operation.responseExample} />
      </section>
    </article>
  );
}
