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
  const urls = ["", "/apis", "/agent-skill"];
  for (const api of listCatalog()) {
    urls.push(`/apis/${api.slug}`, `/sdks/${api.slug}`);
    for (const operation of api.operations) {
      urls.push(`/apis/${api.slug}/${operation.slug}`);
    }
  }

  const entries = (["zh", "en"] as const).flatMap((locale) =>
    urls.map((path) => `  <url>
    <loc>${escapeXml(siteUrl(`/${locale}${path}`))}</loc>
    <changefreq>weekly</changefreq>
    <priority>${path === "" ? "1.0" : path.includes("/apis/") ? "0.8" : "0.7"}</priority>
  </url>`)
  );

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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

export default function SitemapResourceRoute() {
  return null;
}
