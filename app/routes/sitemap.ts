import { listCatalog } from "~/lib/catalog/catalog.server";
import { DOC_SLUGS } from "~/lib/docs";
import { siteUrl } from "~/lib/http";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function loader() {
  const urls: Array<{ path: string; lastmod?: string }> = [
    { path: "" },
    ...DOC_SLUGS.map((slug) => ({
      path: slug === "overview" ? "/docs" : `/docs/${slug}`
    })),
    { path: "/skills/pontx-hub" }
  ];
  for (const api of listCatalog()) {
    urls.push({ path: `/apis/${api.slug}`, lastmod: api.contentUpdatedAt });
    if (api.sdkStatus === "published") urls.push({ path: `/sdks/${api.slug}`, lastmod: api.contentUpdatedAt });
    for (const operation of api.operations) {
      urls.push({ path: `/apis/${api.slug}/${operation.slug}`, lastmod: api.contentUpdatedAt });
    }
    for (const schema of api.schemas) {
      urls.push({ path: `/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`, lastmod: api.contentUpdatedAt });
    }
  }

  const entries = (["zh", "en"] as const).flatMap((locale) =>
    urls.map(({ path, lastmod }) => `  <url>
    <loc>${escapeXml(siteUrl(`/${locale}${path}`))}</loc>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${escapeXml(siteUrl(`/zh${path}`))}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(siteUrl(`/en${path}`))}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(siteUrl(`/en${path}`))}" />
${lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>\n` : ""}  </url>`)
  );

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600"
      }
    }
  );
}
