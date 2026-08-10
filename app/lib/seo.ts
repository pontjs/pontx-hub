import { siteUrl } from "~/lib/http";

export type SeoLocale = "zh" | "en";

export function localizedAlternates(path: string) {
  return [
    { tagName: "link", rel: "alternate", hrefLang: "zh-CN", href: siteUrl(`/zh${path}`) },
    { tagName: "link", rel: "alternate", hrefLang: "en", href: siteUrl(`/en${path}`) },
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: siteUrl(`/en${path}`) }
  ] as const;
}

export function breadcrumbList(
  locale: SeoLocale,
  items: Array<{ name: string; path: string }>
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: siteUrl(`/${locale}${item.path}`)
    }))
  };
}
