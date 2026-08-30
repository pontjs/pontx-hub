import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("API directory integration styles", () => {
  it("protects menu spacing from third-party button resets", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toContain('@import "@pontx/shadcn-ui/styles";');
    expect(css).toMatch(
      /\.pontx-directory button\[aria-expanded\],[\s\S]*?\.pontx-directory \[role="menuitem"\]\s*{\s*padding:\s*8px 12px;/,
    );
    expect(css).toMatch(
      /\.pontx-directory \[role="menuitem"\] > p\s*{\s*margin-top:\s*2px;/,
    );
    expect(css).toMatch(
      /\.pontx-directory input\[type="search"\]\s*{\s*padding-inline:\s*36px;/,
    );
    expect(css).toMatch(
      /\.pontx-directory input\[type="search"\] \+ button\s*{\s*padding:\s*4px;/,
    );
  });

  it("keeps the bilingual typography system consistent across Hub and shared UI", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toContain('--sans: "IBM Plex Sans", "Noto Sans SC"');
    expect(css).toContain('--serif: "Newsreader", "Noto Serif SC"');
    expect(css).toContain("--font-sans: var(--sans);");
    expect(css).toContain('html[lang="zh-CN"] h1');
    expect(css).toContain("font-synthesis: none;");
    expect(css).toMatch(
      /code,\s*pre,\s*kbd,\s*samp,\s*\.font-mono\s*{\s*font-family:\s*var\(--mono\);/,
    );
    expect(css).toContain('font-feature-settings: "liga" 0, "calt" 0;');
    expect(css).toContain("font-variant-numeric: tabular-nums;");
    expect(css).toMatch(
      /html:root\s*{\s*--font-mono:\s*var\(--mono\);\s*--default-mono-font-family:\s*var\(--mono\);/,
    );
  });

  it("switches the crowded header to the mobile menu at tablet widths", async () => {
    const [css, systemCss] = await Promise.all([
      readFile(new URL("./app.css", import.meta.url), "utf8"),
      readFile(new URL("./system.css", import.meta.url), "utf8"),
    ]);

    expect(css).toMatch(
      /@media \(max-width: 900px\)[\s\S]*?\.brand small,[\s\S]*?\.site-header > nav\s*{\s*display:\s*none;[\s\S]*?\.mobile-nav\s*{[\s\S]*?display:\s*block;/,
    );
    expect(css).toMatch(
      /@media \(max-width: 900px\)[\s\S]*?\.mobile-nav nav\s*{[\s\S]*?width:\s*min\(240px, calc\(100vw - 32px\)\);/,
    );
    expect(systemCss).toMatch(
      /@media \(max-width: 900px\)[\s\S]*?\.mobile-nav nav \.mobile-feedback-trigger\s*{[\s\S]*?width:\s*100%;/,
    );
  });

  it("keeps long endpoint paths inside desktop search result columns", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.search-result-context\s*{\s*display:\s*grid;\s*min-width:\s*0;/,
    );
    expect(css).toMatch(
      /\.search-result-context code\s*{[\s\S]*?max-width:\s*100%;[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?white-space:\s*normal;/,
    );
  });

  it("lets long search result titles shrink inside narrow result rows", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.search-result-main strong\s*{[\s\S]*?display:\s*block;[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;/,
    );
  });

  it("gives resource type tags explicit padding and enough grid space", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.search-kind\s*{\s*padding:\s*2px 8px;\s*white-space:\s*nowrap;/,
    );
    expect(css).toMatch(
      /\.search-result-row\s*{[\s\S]*?grid-template-columns:\s*66px minmax\(0, 1fr\) minmax\(180px, 260px\) 20px;/,
    );
    expect(css).toMatch(
      /@media \(max-width: 740px\)[\s\S]*?\.search-result-row\s*{[\s\S]*?grid-template-columns:\s*66px minmax\(0, 1fr\) 18px;/,
    );
  });

  it("keeps search result geometry stable on hover and keyboard focus", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");
    const rowRule = css.match(/\.search-result-row\s*{([^}]*)}/)?.[1];
    const interactiveRule = css.match(
      /\.search-result-row:hover,\s*\.search-result-row:focus-visible\s*{([^}]*)}/,
    )?.[1];

    expect(rowRule).toContain("transition: background 140ms ease;");
    expect(rowRule).not.toContain("transform");
    expect(interactiveRule).not.toContain("transform");
    expect(interactiveRule).not.toContain("outline: none");
  });

  it("centers catalog card arrows inside their fixed-size control", async () => {
    const css = await readFile(new URL("./system.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.api-card-arrow\s*{[\s\S]*?display:\s*grid;[\s\S]*?width:\s*34px;[\s\S]*?height:\s*34px;[\s\S]*?place-items:\s*center;[\s\S]*?line-height:\s*1;/,
    );
  });

  it("shows search progress without motion-only feedback", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.catalog-search-state\.is-loading\s*{[\s\S]*?color:\s*var\(--blue\);/,
    );
    expect(css).toMatch(
      /\.catalog-results-frame\[aria-busy="true"\]\s*{[\s\S]*?opacity:/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.catalog-search-spinner\s*{\s*animation:\s*none;/,
    );
  });

  it("keeps the homepage SDK and CLI summary inside the existing catalog hierarchy", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.registry-description\s*{[\s\S]*?max-width:\s*820px;[\s\S]*?color:\s*var\(--ink-soft\);/,
    );
    expect(css).toMatch(
      /\.registry-description strong\s*{[\s\S]*?color:\s*var\(--ink\);[\s\S]*?font-weight:\s*600;/,
    );
    expect(css).toMatch(
      /\.registry-description-link\s*{[\s\S]*?color:\s*var\(--blue\);[\s\S]*?white-space:\s*nowrap;/,
    );
    expect(css).not.toContain(".catalog-access-card");
    expect(css).not.toContain(".registry-description-link span");
  });

  it("uses the shared cool-neutral palette for non-semantic surfaces", async () => {
    const [css, accountCss, root] = await Promise.all([
      readFile(new URL("./app.css", import.meta.url), "utf8"),
      readFile(new URL("./account.css", import.meta.url), "utf8"),
      readFile(new URL("../root.tsx", import.meta.url), "utf8"),
    ]);

    expect(css).toMatch(
      /\.search-result-group > header\s*{[\s\S]*?background:\s*var\(--paper-deep\);/,
    );
    expect(css).toMatch(
      /\.search-result-row:hover,[\s\S]*?background:\s*var\(--paper\);/,
    );
    expect(css).toMatch(
      /\.search-kind-schema\s*{[\s\S]*?background:\s*var\(--paper-deep\);[\s\S]*?color:\s*#42556a;/,
    );
    expect(css).toMatch(
      /\.schema-reference-header\s*{[\s\S]*?background:\s*var\(--paper-deep\);/,
    );
    expect(accountCss).toMatch(
      /\.favorite-api-control\s*{[\s\S]*?background:\s*#fff;/,
    );
    expect(accountCss).toMatch(
      /\.favorite-api-control\[aria-pressed="true"\]\s*{[\s\S]*?border-color:\s*var\(--blue\);[\s\S]*?background:\s*#edf1ff;/,
    );
    for (const page of ["saved-apis-page", "playground-history-page", "account-page"]) {
      expect(accountCss).toMatch(
        new RegExp(`\\.${page}\\s*{[\\s\\S]*?var\\(--paper\\);`),
      );
    }
    expect(root).toContain('<meta name="theme-color" content="#f4f7fb" />');

    for (const warmNeutral of ["#f0ece3", "#f8f6f0", "#f7efe3", "#f5f0e6"]) {
      expect(css).not.toContain(warmNeutral);
    }
    for (const warmNeutral of ["#fffdf7", "#fff8df", "#fff2ba", "#f7f4ed"]) {
      expect(accountCss).not.toContain(warmNeutral);
    }
  });

  it("renders highlighted terminal surfaces with visible keyboard focus", async () => {
    const [css, lightThemeCss, component] = await Promise.all([
      readFile(new URL("./app.css", import.meta.url), "utf8"),
      readFile(new URL("../components/code-block-theme.css", import.meta.url), "utf8"),
      readFile(new URL("../components/code-block.tsx", import.meta.url), "utf8"),
    ]);

    expect(css).toMatch(/\.code-frame-content:focus-visible\s*{[\s\S]*?outline:/);
    expect(css).toMatch(/\.code-frame-content\s*{[\s\S]*?padding:\s*20px clamp\(18px, 2vw, 24px\) 22px;/);
    expect(css).toMatch(/\.code-frame-content > code\s*{[\s\S]*?display:\s*block;/);
    expect(css).toMatch(/\.code-token-command\s*{[\s\S]*?color:\s*var\(--acid\);/);
    expect(css).toMatch(/\.code-token-option\s*{[\s\S]*?color:/);
    expect(css).toMatch(/\.code-token-comment\s*{[\s\S]*?color:/);
    expect(component).toContain('"code-frame-light"');
    expect(lightThemeCss).toMatch(
      /\.code-frame\.code-frame-light\s*{[\s\S]*?border-color:\s*var\(--line\);[\s\S]*?background:\s*#f7f9fb;/,
    );
    expect(lightThemeCss).toMatch(
      /\.code-frame-light \.code-frame-content\s*{[\s\S]*?color:\s*#253042;/,
    );
    expect(lightThemeCss).toMatch(
      /\.code-frame-light \.code-token-command\s*{[\s\S]*?color:\s*#2949b8;/,
    );
    expect(lightThemeCss).toMatch(/outline-color:\s*var\(--blue\);/);
  });

  it("lets nested reference panes hand boundary scrolling back to the page", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.pontx-workspace-body\s*{[\s\S]*?overflow:\s*hidden auto;[\s\S]*?overscroll-behavior-y:\s*auto;/,
    );
    expect(css).toMatch(
      /\.schema-directory-list\s*{[\s\S]*?overflow:\s*hidden auto;[\s\S]*?overscroll-behavior-y:\s*auto;/,
    );
    expect(css).toMatch(
      /\.schema-reference-content\s*{[\s\S]*?overflow:\s*hidden auto;[\s\S]*?overscroll-behavior-y:\s*auto;/,
    );
  });

  it("gives the headerless Schema Viewer balanced content padding", async () => {
    const [css, component] = await Promise.all([
      readFile(new URL("./app.css", import.meta.url), "utf8"),
      readFile(
        new URL("../components/deferred-schema-viewer.tsx", import.meta.url),
        "utf8",
      ),
    ]);

    expect(component).toContain('contentClassName="hub-schema-viewer-content"');
    expect(css).toMatch(
      /\.hub-schema-viewer-content\s*{\s*padding:\s*20px 32px;/,
    );
  });

  it("scrolls the whole endpoint workspace and keeps the request example compact", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.pontx-workspace-body > \.pontx-documentation\s*{[\s\S]*?flex:\s*0 0 auto;[\s\S]*?height:\s*auto;[\s\S]*?overflow:\s*visible;/,
    );
    expect(css).toMatch(
      /\.request-example-notice\s*{[\s\S]*?"description actions"[\s\S]*?"meta actions"[\s\S]*?padding:\s*9px 11px;/,
    );
  });

  it("makes successful OAuth state prominent inside the authorization card", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.oauth-toolbar-authorized\s*{[\s\S]*?border-color:\s*#86c8ae;[\s\S]*?background:\s*linear-gradient/,
    );
    expect(css).toMatch(
      /\.oauth-toolbar-heading-status-success\s*{[\s\S]*?background:\s*#dcfce7;[\s\S]*?color:\s*#166534;/,
    );
    expect(css).not.toContain(".oauth-result-success");
    expect(css).toMatch(
      /\.oauth-execution-prerequisite\s*{[\s\S]*?border-left:\s*4px solid #d97706;[\s\S]*?background:\s*#fffbeb;/,
    );
    expect(css).toContain(
      '.pontx-workspace-body[data-oauth-execution-blocked="true"]',
    );
  });

  it("keeps Endpoint and Schema in one scrollable desktop directory with a mobile fallback", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.resource-directory-navigation\s*{[\s\S]*?display:\s*block;[\s\S]*?overflow:\s*hidden auto;[\s\S]*?overscroll-behavior-y:\s*auto;/,
    );
    expect(css).toMatch(
      /\.resource-directory-group\[open\]\s*{\s*display:\s*block;/,
    );
    expect(css).toMatch(
      /\.resource-directory-group-content\s*{\s*display:\s*block;\s*overflow:\s*visible;/,
    );
    expect(css).toMatch(
      /\.resource-directory-group > summary\s*{[\s\S]*?grid-template-columns:\s*14px minmax\(0, 1fr\) auto;[\s\S]*?list-style:\s*none;/,
    );
    expect(css).not.toMatch(/\.resource-directory-group[^{}]*::after/);
    expect(css).toMatch(
      /\.resource-navigation-tabs a\.resource-navigation-mobile-link\s*{\s*display:\s*none;/,
    );
    expect(css).toMatch(
      /@media \(max-width: 740px\)[\s\S]*?\.resource-navigation-tabs a\.resource-navigation-mobile-link\s*{\s*display:\s*inline-flex;/,
    );
    expect(css).toMatch(
      /\.schema-reference-grid\s*{[\s\S]*?grid-template-columns:\s*clamp\(260px, 22vw, 304px\) minmax\(0, 1fr\);/,
    );
  });

  it("styles ungrouped Endpoints as part of the shared directory flow", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.resource-directory-group-content > \.pontx-directory,[\s\S]*?\.resource-directory-group-content > \.pontx-directory-flat,[\s\S]*?\.resource-directory-group-content > \.schema-directory-list/,
    );
    expect(css).toMatch(
      /\.pontx-directory-flat\s*{[\s\S]*?display:\s*grid;[\s\S]*?overflow:\s*visible;/,
    );
    expect(css).toMatch(
      /\.pontx-directory-flat a\s*{[\s\S]*?grid-template-columns:\s*48px minmax\(0, 1fr\);[\s\S]*?border-radius:\s*var\(--radius-md\);/,
    );
    expect(css).toMatch(
      /\.pontx-directory-flat a\[aria-current="page"\]\s*{[\s\S]*?background:\s*var\(--blue-soft\);/,
    );
    expect(css).toMatch(
      /\.pontx-directory-flat small\s*{[\s\S]*?border-radius:\s*var\(--radius-full\);[\s\S]*?font-family:\s*var\(--mono\);/,
    );
  });

  it("keeps methodless Endpoint titles in a full-width wrapping row", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.pontx-directory-flat a\.pontx-directory-flat-title-only\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\);/,
    );
    expect(css).toMatch(
      /\.pontx-directory-flat a\.pontx-directory-flat-title-only \.pontx-directory-flat-name\s*\{[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?white-space:\s*normal;/,
    );
  });

  it("makes the complete SDK metadata cell a stable keyboard-accessible link", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.api-card-sdk-link\s*{[\s\S]*?width:\s*fit-content;[\s\S]*?justify-content:\s*flex-start;[\s\S]*?gap:\s*3px;/,
    );
    expect(css).toMatch(
      /\.api-card-sdk-link > span\s*{\s*padding:\s*2px 4px;/,
    );
    expect(css).toMatch(
      /\.api-card-sdk-link::after\s*{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;/,
    );
    expect(css).toMatch(
      /\.api-card-sdk-link:focus-visible::after\s*{[\s\S]*?outline:\s*2px solid var\(--blue\);/,
    );
    expect(css).toMatch(
      /\.api-card-sdk-link:hover \.api-card-sdk-arrow,[\s\S]*?transform:\s*translate\(2px, -2px\);/,
    );
    expect(css).toMatch(
      /\.api-card-sdk-cell\s*{[\s\S]*?position:\s*relative;/,
    );
    expect(css).not.toMatch(
      /\.api-card-sdk-cell,[\s\S]{0,160}?display:\s*none;/,
    );

    const systemCss = await readFile(new URL("./system.css", import.meta.url), "utf8");
    expect(systemCss).toMatch(
      /@media \(max-width: 420px\)[\s\S]*?\.api-card-meta\s*{\s*display:\s*grid;\s*width:\s*100%;/,
    );
  });

  it("makes every actionable API overview fact a keyboard-accessible full-cell link", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.api-overview-link-fact\s*{[\s\S]*?position:\s*relative;/,
    );
    expect(css).toMatch(
      /\.api-overview-fact-link::after\s*{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;/,
    );
    expect(css).toMatch(
      /\.api-overview-fact-link:focus-visible::after\s*{[\s\S]*?outline:\s*2px solid var\(--blue\);/,
    );
    expect(css).toMatch(
      /\.api-overview-fact-link:hover \.api-overview-fact-arrow,[\s\S]*?color:\s*var\(--blue\);/,
    );
    expect(css).not.toMatch(
      /\.api-overview-fact-link:hover \.api-overview-fact-arrow,[\s\S]{0,180}?transform:/,
    );
  });
});
