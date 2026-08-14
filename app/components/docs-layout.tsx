import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { SiteShell } from "~/components/site-shell";
import type { Locale } from "~/lib/catalog/types";
import {
  adjacentDocs,
  DOC_GROUPS,
  DOC_SLUGS,
  docHref,
  getDocPage,
  type DocSlug
} from "~/lib/docs";

function DocsNavigation({
  locale,
  current,
  searchable = false
}: {
  locale: Locale;
  current: DocSlug;
  searchable?: boolean;
}) {
  const zh = locale === "zh";
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();

  useEffect(() => {
    if (!searchable) return;
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target?.matches("input, textarea, select, [contenteditable='true']")
      ) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [searchable]);

  const visibleSlugs = useMemo(() => {
    if (!normalizedQuery) return new Set<DocSlug>(DOC_SLUGS);
    return new Set(DOC_SLUGS.filter((slug) => {
      const page = getDocPage(slug);
      return `${page.navTitle[locale]} ${page.title[locale]} ${page.keywords[locale]}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    }));
  }, [locale, normalizedQuery]);

  return (
    <div className="docs-nav-inner">
      {searchable ? (
        <label className="docs-search">
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={zh ? "查找文档…" : "Find in docs…"}
            aria-label={zh ? "查找文档页面" : "Find a documentation page"}
            aria-keyshortcuts="/"
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
      ) : null}

      <nav aria-label={zh ? "文档导航" : "Documentation navigation"}>
        {DOC_GROUPS.map((group) => {
          const visiblePages = group.slugs.filter((slug) => visibleSlugs.has(slug));
          if (visiblePages.length === 0) return null;
          return (
            <section key={group.label.en} className="docs-nav-group">
              <h2>{group.label[locale]}</h2>
              <ul>
                {visiblePages.map((slug) => {
                  const page = getDocPage(slug);
                  return (
                    <li key={slug}>
                      <NavLink
                        to={docHref(locale, slug)}
                        end={slug === "overview"}
                        aria-current={slug === current ? "page" : undefined}
                      >
                        <span>{page.navTitle[locale]}</span>
                        <i aria-hidden="true">↗</i>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>

      {normalizedQuery && visibleSlugs.size === 0 ? (
        <p className="docs-search-empty">
          {zh ? "没有匹配的文档。" : "No matching documentation."}
        </p>
      ) : null}
    </div>
  );
}

function DocsHero({ locale, slug }: { locale: Locale; slug: DocSlug }) {
  const zh = locale === "zh";
  const page = getDocPage(slug);

  return (
    <header className={`docs-hero${slug === "overview" ? " docs-hero-overview" : ""}`}>
      <div className="docs-hero-copy">
        <p className="eyebrow">{page.eyebrow[locale]}</p>
        <h1>{page.title[locale]}</h1>
        <p className="docs-lede">{page.description[locale]}</p>
        {slug === "overview" ? (
          <div className="docs-hero-actions">
            <Link className="button button-dark" to={docHref(locale, "agent-skill")}>
              {zh ? "了解 Agent Skill" : "Explore the Agent Skill"}
            </Link>
            <Link className="button" to={docHref(locale, "cli")}>
              {zh ? "查看统一 CLI" : "View the universal CLI"}
            </Link>
          </div>
        ) : null}
      </div>
      <div className="docs-hero-route" aria-label={zh ? "Pontx 集成流程" : "Pontx integration flow"}>
        {[
          ["01", zh ? "发现" : "Discover", "search"],
          ["02", zh ? "理解" : "Inspect", "show"],
          ["03", zh ? "验证" : "Preview", "preview"],
          ["04", zh ? "集成" : "Integrate", "sdk"]
        ].map(([number, label, command], index) => (
          <div key={number} className={index === 3 ? "is-current" : undefined}>
            <span>{number}</span>
            <strong>{label}</strong>
            <code>pontx-hub {command}</code>
          </div>
        ))}
      </div>
    </header>
  );
}

export function DocsLayout({
  locale,
  slug,
  children
}: {
  locale: Locale;
  slug: DocSlug;
  children: React.ReactNode;
}) {
  const zh = locale === "zh";
  const page = getDocPage(slug);
  const adjacent = adjacentDocs(slug);

  return (
    <SiteShell locale={locale}>
      <main className="docs-page">
        <div className="docs-product-bar">
          <Link to={docHref(locale, "overview")}>
            <strong>DOCS</strong>
            <span>Pontx Hub</span>
          </Link>
          <div>
            <span className="docs-version-dot" aria-hidden="true" />
            <span>{zh ? "公开文档" : "Public docs"}</span>
            <code>v1</code>
          </div>
        </div>

        <details className="docs-mobile-navigation">
          <summary>
            <span>{zh ? "本页" : "On this page"}</span>
            <strong>{page.navTitle[locale]}</strong>
            <i aria-hidden="true">＋</i>
          </summary>
          <DocsNavigation locale={locale} current={slug} />
        </details>

        <div className="docs-grid">
          <aside className="docs-sidebar">
            <DocsNavigation locale={locale} current={slug} searchable />
          </aside>

          <article className="docs-article">
            <nav className="docs-breadcrumbs" aria-label={zh ? "面包屑" : "Breadcrumbs"}>
              <Link to={`/${locale}`}>{zh ? "API 目录" : "API Catalog"}</Link>
              <span aria-hidden="true">/</span>
              <Link to={docHref(locale, "overview")}>{zh ? "文档" : "Docs"}</Link>
              {slug !== "overview" ? (
                <>
                  <span aria-hidden="true">/</span>
                  <span aria-current="page">{page.navTitle[locale]}</span>
                </>
              ) : null}
            </nav>

            <DocsHero locale={locale} slug={slug} />

            <div className="docs-content">{children}</div>

            <nav className="docs-pager" aria-label={zh ? "相邻文档" : "Adjacent documentation"}>
              {adjacent.previous ? (
                <Link to={docHref(locale, adjacent.previous.slug)} rel="prev">
                  <span>← {zh ? "上一篇" : "Previous"}</span>
                  <strong>{adjacent.previous.navTitle[locale]}</strong>
                </Link>
              ) : <span />}
              {adjacent.next ? (
                <Link to={docHref(locale, adjacent.next.slug)} rel="next">
                  <span>{zh ? "下一篇" : "Next"} →</span>
                  <strong>{adjacent.next.navTitle[locale]}</strong>
                </Link>
              ) : null}
            </nav>
          </article>

          <aside className="docs-toc">
            <nav aria-label={zh ? "本页目录" : "On this page"}>
              <strong>{zh ? "本页目录" : "On this page"}</strong>
              {page.sections.map((section) => (
                <a key={section.id} href={`#${section.id}`}>{section.title[locale]}</a>
              ))}
              <a className="docs-toc-external" href="https://github.com/pontjs/pontx-hub" target="_blank" rel="noreferrer">
                {zh ? "在 GitHub 查看源码" : "View source on GitHub"} ↗
              </a>
            </nav>
          </aside>
        </div>
      </main>
    </SiteShell>
  );
}
