import { useState } from "react";
import { Link, NavLink } from "react-router";
import { GitHubIcon } from "~/components/github-icon";
import { PONTX_LOGO_DATA_URL } from "~/lib/brand";
import type { Locale } from "~/lib/catalog/types";

const copy = {
  zh: {
    catalog: "API 目录",
    skill: "Agent Skill",
    github: "GitHub",
    language: "EN",
    menu: "菜单",
    tagline: "API Reference for humans & agents"
  },
  en: {
    catalog: "API Catalog",
    skill: "Agent Skill",
    github: "GitHub",
    language: "中文",
    menu: "Menu",
    tagline: "API Reference for humans & agents"
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="site-frame">
      <header className="site-header">
        <Link to={`/${locale}`} className="brand" aria-label="Pontx Hub home">
          <span className="brand-mark" aria-hidden="true">
            <img src={PONTX_LOGO_DATA_URL} alt="" />
          </span>
          <span>
            <strong>Pontx Hub</strong>
            <small>{text.tagline}</small>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          <NavLink to={`/${locale}`} end>{text.catalog}</NavLink>
          <NavLink to={`/${locale}/agent-skill`}>{text.skill}</NavLink>
          <a
            className="github-link"
            href="https://github.com/pontjs/pontx-hub"
            rel="noreferrer"
            target="_blank"
          >
            <GitHubIcon className="github-icon" />
            <span>{text.github}</span>
          </a>
          <Link to={`/${nextLocale}`} className="language-link">
            {text.language}
          </Link>
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
            <NavLink to={`/${locale}/agent-skill`} onClick={() => setMobileNavOpen(false)}>
              {text.skill}
            </NavLink>
            <a
              href="https://github.com/pontjs/pontx-hub"
              rel="noreferrer"
              target="_blank"
            >
              {text.github}
            </a>
            <Link to={`/${nextLocale}`} onClick={() => setMobileNavOpen(false)}>
              {text.language}
            </Link>
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
            Source
          </a>
          <span aria-hidden="true"> · </span>
          <a href="https://github.com/pontjs/pontx-api-metadata" rel="noreferrer" target="_blank">
            Metadata
          </a>
          <span aria-hidden="true"> · </span>
          <a href="https://github.com/pontjs/pontx-hub/blob/main/CONTRIBUTING.md" rel="noreferrer" target="_blank">
            Contribute
          </a>
        </p>
        <span>Open source · OpenAPI → SDK → Agent</span>
      </footer>
    </div>
  );
}
