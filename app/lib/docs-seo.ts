import type { Locale } from "~/lib/catalog/types";
import { DOC_SLUGS, docHref, getDocPage, type DocSlug } from "~/lib/docs";
import { siteUrl } from "~/lib/http";
import { breadcrumbList, localizedAlternates } from "~/lib/seo";

export function docsMeta(locale: Locale, slug: DocSlug) {
  const page = getDocPage(slug);
  const localizedPath = docHref(locale, slug);
  const alternatePath = localizedPath.replace(/^\/(?:zh|en)/, "");
  const canonical = siteUrl(localizedPath);
  const title = locale === "zh"
    ? `${page.navTitle.zh} — Pontx Hub 文档`
    : `${page.navTitle.en} — Pontx Hub Docs`;
  const description = page.description[locale];
  const breadcrumbs = breadcrumbList(locale, [
    { name: locale === "zh" ? "API 目录" : "API Catalog", path: "" },
    { name: locale === "zh" ? "文档" : "Docs", path: "/docs" },
    ...(slug === "overview" ? [] : [{ name: page.navTitle[locale], path: `/docs/${slug}` }])
  ]);
  const pageSchema = slug === "overview"
    ? {
        "@type": "CollectionPage",
        headline: page.title[locale],
        hasPart: DOC_SLUGS.filter((item) => item !== "overview").map((item) => ({
          "@type": "TechArticle",
          name: getDocPage(item).navTitle[locale],
          url: siteUrl(docHref(locale, item))
        }))
      }
    : {
        "@type": "TechArticle",
        headline: page.title[locale]
      };

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: slug === "overview" ? "website" : "article" },
    { property: "og:url", content: canonical },
    { property: "og:site_name", content: "Pontx Hub" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    ...localizedAlternates(alternatePath),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [
          breadcrumbs,
          {
            ...pageSchema,
            name: page.navTitle[locale],
            description,
            url: canonical,
            inLanguage: locale === "zh" ? "zh-CN" : "en",
            isPartOf: {
              "@type": "WebSite",
              name: "Pontx Hub",
              url: siteUrl(`/${locale}`)
            },
            breadcrumb: breadcrumbs
          }
        ]
      }
    }
  ];
}
