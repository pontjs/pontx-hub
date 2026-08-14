import type { Locale } from "~/lib/catalog/types";
import { DOC_SLUGS, docHref, getDocPage, type DocSlug } from "~/lib/docs";
import { siteUrl } from "~/lib/http";
import { breadcrumbList, localizedAlternates } from "~/lib/seo";

export function docsMeta(locale: Locale, slug: DocSlug) {
  const page = getDocPage(slug);
  const localizedPath = docHref(locale, slug);
  const alternatePath = localizedPath.replace(/^\/(?:zh|en)/, "");
  const canonical = siteUrl(localizedPath);
  const metaTitle = page.metaTitle[locale];
  const title = `${metaTitle} — Pontx Hub`;
  const description = page.description[locale];
  const language = locale === "zh" ? "zh-CN" : "en";
  const websiteId = siteUrl("/#website");
  const organizationId = siteUrl("/#organization");
  const webPageId = `${canonical}#webpage`;
  const breadcrumbId = `${canonical}#breadcrumb`;
  const articleId = `${canonical}#article`;
  const docsIndexId = `${siteUrl(docHref(locale, "overview"))}#webpage`;
  const breadcrumbs = {
    "@id": breadcrumbId,
    ...breadcrumbList(locale, [
      { name: locale === "zh" ? "API 目录" : "API Catalog", path: "" },
      { name: locale === "zh" ? "文档" : "Docs", path: "/docs" },
      ...(slug === "overview"
        ? []
        : [{ name: page.navTitle[locale], path: `/docs/${slug}` }])
    ])
  };
  const pageSchema = slug === "overview"
    ? {
        "@id": webPageId,
        "@type": "CollectionPage",
        name: metaTitle,
        headline: page.title[locale],
        description,
        url: canonical,
        inLanguage: language,
        isPartOf: { "@id": websiteId },
        publisher: { "@id": organizationId },
        breadcrumb: { "@id": breadcrumbId },
        isAccessibleForFree: true,
        hasPart: DOC_SLUGS.filter((item) => item !== "overview").map((item) => ({
          "@id": `${siteUrl(docHref(locale, item))}#article`,
          "@type": "TechArticle",
          name: getDocPage(item).navTitle[locale],
          url: siteUrl(docHref(locale, item)),
          inLanguage: language
        }))
      }
    : {
        "@id": webPageId,
        "@type": "WebPage",
        name: metaTitle,
        description,
        url: canonical,
        inLanguage: language,
        isPartOf: { "@id": websiteId },
        breadcrumb: { "@id": breadcrumbId },
        isAccessibleForFree: true,
        mainEntity: { "@id": articleId }
      };
  const articleSchema = slug === "overview"
    ? []
    : [{
        "@id": articleId,
        "@type": "TechArticle",
        name: metaTitle,
        headline: page.title[locale],
        description,
        url: canonical,
        inLanguage: language,
        isPartOf: { "@id": docsIndexId },
        mainEntityOfPage: { "@id": webPageId },
        publisher: { "@id": organizationId },
        isAccessibleForFree: true
      }];

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
          {
            "@id": websiteId,
            "@type": "WebSite",
            name: "Pontx Hub",
            alternateName: "Pontx API Hub",
            url: siteUrl("/")
          },
          {
            "@id": organizationId,
            "@type": "Organization",
            name: "Pontx",
            url: siteUrl("/"),
            logo: siteUrl("/pontx-logo.svg"),
            sameAs: ["https://github.com/pontjs"]
          },
          breadcrumbs,
          pageSchema,
          ...articleSchema
        ]
      }
    }
  ];
}
