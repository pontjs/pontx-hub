import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { GitHubIcon } from "~/components/github-icon";
import { LanguageIcon } from "~/components/language-icon";
import { PONTX_LOGO_DATA_URL } from "~/lib/brand";
import type { Locale } from "~/lib/catalog/types";
import { alternateLocaleHref, alternateLocaleUrl } from "~/lib/i18n";
import { AccountNavigation } from "~/components/account-navigation";

const copy = {
  zh: {
    catalog: "API 目录",
    docs: "文档",
    skill: "Agent Skill",
    github: "GitHub",
    language: "English",
    languageLabel: "切换到英文",
    menu: "菜单",
    tagline: "面向开发者与 Agent 的 API 参考",
    home: "Pontx Hub 首页",
    primaryNavigation: "主导航",
    source: "源码",
    metadata: "元数据",
    contribute: "参与贡献",
    openSource: "开源"
  },
  en: {
    catalog: "API Catalog",
    docs: "Docs",
    skill: "Agent Skill",
    github: "GitHub",
    language: "中文",
    languageLabel: "Switch to Chinese",
    menu: "Menu",
    tagline: "API reference for humans & agents",
    home: "Pontx Hub home",
    primaryNavigation: "Primary navigation",
    source: "Source",
    metadata: "Metadata",
    contribute: "Contribute",
    openSource: "Open source"
  }
} satisfies Record<Locale, Record<string, string>>;

export function SiteShell({
  locale,
  children
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const nextLocale = locale === "zh" ? "en" : "zh";
  const text = copy[locale];
  const location = useLocation();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const languageTarget = alternateLocaleHref(
    location.pathname,
    location.search,
    location.hash,
    nextLocale,
    hydrated
  );
  const handleLanguageChange = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign(alternateLocaleUrl(
      window.location.pathname,
      window.location.search,
      window.location.hash,
      nextLocale
    ));
  };
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="site-frame" data-pontx-ui="hub">
      <header className="site-header">
        <Link to={`/${locale}`} className="brand" aria-label={text.home}>
          <span className="brand-mark" aria-hidden="true">
            <img src={PONTX_LOGO_DATA_URL} alt="" />
          </span>
          <span>
            <strong>Pontx Hub</strong>
            <small>{text.tagline}</small>
          </span>
        </Link>
        <nav aria-label={text.primaryNavigation}>
          <NavLink to={`/${locale}`} end>{text.catalog}</NavLink>
          <NavLink to={`/${locale}/docs`}>{text.docs}</NavLink>
          <NavLink to={`/${locale}/skills/pontx-hub`}>{text.skill}</NavLink>
          <a
            className="github-link"
            href="https://github.com/pontjs/pontx-hub"
            rel="noreferrer"
            target="_blank"
          >
            <GitHubIcon className="github-icon" />
            <span>{text.github}</span>
          </a>
          <a
            href={languageTarget}
            className="language-link"
            hrefLang={nextLocale === "zh" ? "zh-CN" : "en"}
            aria-label={text.languageLabel}
            title={text.languageLabel}
            onClick={handleLanguageChange}
          >
            <LanguageIcon className="language-icon" />
          </a>
          <AccountNavigation locale={locale} />
        </nav>
        <div className="mobile-nav">
          <button
            type="button"
            className="mobile-nav-trigger"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <span>{text.menu}</span>
            <span aria-hidden="true">＋</span>
          </button>
          <nav
            id="mobile-navigation"
            aria-label={`${text.menu} navigation`}
            data-open={mobileNavOpen || undefined}
          >
            <NavLink to={`/${locale}`} end onClick={() => setMobileNavOpen(false)}>
              {text.catalog}
            </NavLink>
            <NavLink to={`/${locale}/docs`} onClick={() => setMobileNavOpen(false)}>
              {text.docs}
            </NavLink>
            <NavLink to={`/${locale}/skills/pontx-hub`} onClick={() => setMobileNavOpen(false)}>
              {text.skill}
            </NavLink>
            <a
              href="https://github.com/pontjs/pontx-hub"
              rel="noreferrer"
              target="_blank"
            >
              {text.github}
            </a>
            <a
              className="mobile-language-link"
              href={languageTarget}
              hrefLang={nextLocale === "zh" ? "zh-CN" : "en"}
              aria-label={text.languageLabel}
              onClick={(event) => {
                setMobileNavOpen(false);
                handleLanguageChange(event);
              }}
            >
              <LanguageIcon className="language-icon" />
              <span>{text.language}</span>
            </a>
            <AccountNavigation locale={locale} onNavigate={() => setMobileNavOpen(false)} />
          </nav>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div>
          <span className="brand-mark brand-mark-small">
            <img src={PONTX_LOGO_DATA_URL} alt="" />
          </span>
          <strong>Pontx Hub</strong>
        </div>
        <p>
          <a href="https://github.com/pontjs/pontx-hub" rel="noreferrer" target="_blank">
            {text.source}
          </a>
          <span aria-hidden="true"> · </span>
          <a href="https://github.com/pontjs/pontx-api-metadata" rel="noreferrer" target="_blank">
            {text.metadata}
          </a>
          <span aria-hidden="true"> · </span>
          <a href="https://github.com/pontjs/pontx-hub/blob/main/CONTRIBUTING.md" rel="noreferrer" target="_blank">
            {text.contribute}
          </a>
        </p>
        <span>{text.openSource} · OpenAPI → SDK → Agent</span>
      </footer>
    </div>
  );
}
