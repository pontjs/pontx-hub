import { listCatalog } from "~/lib/catalog/catalog.server";
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
  const urls = ["", "/agent-skill"];
  for (const api of listCatalog()) {
    urls.push(`/apis/${api.slug}`);
    if (api.sdkStatus === "published") urls.push(`/sdks/${api.slug}`);
    for (const operation of api.operations) {
      urls.push(`/apis/${api.slug}/${operation.slug}`);
    }
    for (const schema of api.schemas) {
      urls.push(`/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`);
    }
  }

  const entries = (["zh", "en"] as const).flatMap((locale) =>
    urls.map((path) => `  <url>
    <loc>${escapeXml(siteUrl(`/${locale}${path}`))}</loc>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${escapeXml(siteUrl(`/zh${path}`))}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(siteUrl(`/en${path}`))}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(siteUrl(`/en${path}`))}" />
    <changefreq>weekly</changefreq>
    <priority>${path === "" ? "1.0" : path.includes("/apis/") ? "0.8" : "0.7"}</priority>
  </url>`)
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
