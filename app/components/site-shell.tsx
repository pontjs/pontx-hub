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
    tagline: "API Reference for humans & agents"
  },
  en: {
    catalog: "API Catalog",
    skill: "Agent Skill",
    github: "GitHub",
    language: "中文",
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
