import { listCatalog } from "~/lib/catalog/catalog.server";
import { DOC_SLUGS } from "~/lib/docs";
import { siteUrl } from "~/lib/http";
import { listSkillSummaries } from "~/lib/product-skills.server";

export const SITEMAP_URLS_PER_FILE = 1_000;

export type SitemapUrl = {
  path: string;
  lastmod?: string;
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function resourceUrls(): SitemapUrl[] {
  const urls: SitemapUrl[] = [
    { path: "" },
    ...DOC_SLUGS.map((slug) => ({
      path: slug === "overview" ? "/docs" : `/docs/${slug}`
    })),
    { path: "/skills" },
    ...listSkillSummaries().map((skill) => ({ path: `/skills/${skill.name}` }))
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
  return urls;
}

export function listSitemapUrls(): SitemapUrl[] {
  return (["zh", "en"] as const).flatMap((locale) =>
    resourceUrls().map(({ path, lastmod }) => ({
      path: `/${locale}${path}`,
      lastmod
    }))
  );
}

export function sitemapPageCount(): number {
  return Math.ceil(listSitemapUrls().length / SITEMAP_URLS_PER_FILE);
}

function sitemapUrlsForPage(page: number): SitemapUrl[] | undefined {
  if (!Number.isInteger(page) || page < 1) return undefined;
  const urls = listSitemapUrls();
  const start = (page - 1) * SITEMAP_URLS_PER_FILE;
  if (start >= urls.length) return undefined;
  return urls.slice(start, start + SITEMAP_URLS_PER_FILE);
}

function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600"
    }
  });
}

function localeIndependentPath(path: string): string {
  return path.replace(/^\/(?:zh|en)/, "");
}

function renderSitemapPage(urls: SitemapUrl[]): string {
  const entries = urls.map(({ path, lastmod }) => {
    const resourcePath = localeIndependentPath(path);
    return `  <url>
    <loc>${escapeXml(siteUrl(path))}</loc>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${escapeXml(siteUrl(`/zh${resourcePath}`))}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(siteUrl(`/en${resourcePath}`))}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(siteUrl(`/en${resourcePath}`))}" />
${lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>\n` : ""}  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>`;
}

export function sitemapPageResponse(page: number): Response {
  const urls = sitemapUrlsForPage(page);
  if (!urls) throw new Response("Sitemap not found", { status: 404 });
  return xmlResponse(renderSitemapPage(urls));
}

export function sitemapIndexResponse(): Response {
  const entries = Array.from({ length: sitemapPageCount() }, (_, index) => `  <sitemap>
    <loc>${escapeXml(siteUrl(`/sitemaps/${index + 1}.xml`))}</loc>
  </sitemap>`);

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</sitemapindex>`);
}
