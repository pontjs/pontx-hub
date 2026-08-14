import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("Pontx Hub visual system", () => {
  it("loads the visual-system composition layer after route styles", async () => {
    const root = await readFile(new URL("../root.tsx", import.meta.url), "utf8");

    expect(root).toMatch(
      /import "\.\/styles\/app\.css";[\s\S]*import "\.\/styles\/account\.css";[\s\S]*import "\.\/styles\/system\.css";/,
    );
  });

  it("maps Hub surfaces to the shared shadcn token contract", async () => {
    const css = await readFile(new URL("./system.css", import.meta.url), "utf8");

    for (const token of [
      "--background:",
      "--foreground:",
      "--card:",
      "--primary:",
      "--muted:",
      "--border:",
      "--ring:",
      "--radius:",
    ]) {
      expect(css).toContain(token);
    }
    expect(css).toContain("--paper: #f4f7fb;");
    expect(css).toContain("--blue: #2563eb;");
    expect(css).toMatch(/\.api-card\s*{[\s\S]*?--api-accent:\s*var\(--blue\) !important;/);
  });

  it("keeps the GitHub hover border clear of its icon and label", async () => {
    const [appCss, systemCss] = await Promise.all([
      readFile(new URL("./app.css", import.meta.url), "utf8"),
      readFile(new URL("./system.css", import.meta.url), "utf8"),
    ]);

    expect(appCss).toMatch(
      /\.github-link\s*{[\s\S]*?padding-inline:\s*10px;/,
    );
    expect(systemCss).toMatch(
      /\.site-header :where\(\.github-link,[\s\S]*?border:\s*1px solid transparent;/,
    );
    expect(systemCss).toMatch(
      /\.site-header :where\(\.github-link,[\s\S]*?:hover,[\s\S]*?border-color:\s*var\(--line\);/,
    );
  });

  it("keeps the footer brand centered in a compact responsive footer", async () => {
    const [appCss, systemCss] = await Promise.all([
      readFile(new URL("./app.css", import.meta.url), "utf8"),
      readFile(new URL("./system.css", import.meta.url), "utf8"),
    ]);

    expect(appCss).toMatch(
      /\.site-footer > div\s*{\s*display:\s*flex;\s*align-items:\s*center;/,
    );
    expect(systemCss).toMatch(
      /\.site-footer\s*{\s*gap:\s*18px;\s*padding:\s*12px clamp\(20px, 3vw, 52px\);/,
    );
    expect(systemCss).not.toContain("min-height: 80px;");
    expect(systemCss).toMatch(
      /@media \(max-width: 740px\)[\s\S]*?\.site-footer\s*{[\s\S]*?gap:\s*6px;[\s\S]*?padding:\s*10px 16px;/,
    );
    expect(systemCss).toMatch(
      /@media \(max-width: 740px\)[\s\S]*?\.site-footer > span\s*{\s*padding-right:\s*72px;/,
    );
  });

  it("keeps the AI entry in the right-side header actions and floats it on mobile", async () => {
    const css = await readFile(new URL("./system.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.site-header > nav > \.ai-assistant-trigger\s*{[\s\S]*?width:\s*36px;/,
    );
    expect(css).toMatch(
      /@media \(max-width: 740px\)[\s\S]*?body > \.ai-assistant-trigger\s*{[\s\S]*?position:\s*fixed;[\s\S]*?right:\s*16px;[\s\S]*?bottom:\s*calc\(18px \+ env\(safe-area-inset-bottom\)\);/,
    );
  });

  it("uses one responsive geometry system across every public resource layout", async () => {
    const css = await readFile(new URL("./system.css", import.meta.url), "utf8");

    expect(css).toMatch(/\.api-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(3,/);
    expect(css).toMatch(/\.registry-stats\s*{[\s\S]*?grid-template-columns:\s*repeat\(3,/);
    expect(css).toMatch(/\.pontx-workspace-directory,[\s\S]*?\.schema-directory\s*{[\s\S]*?clamp\(264px, 20vw, 304px\)/);
    expect(css).toMatch(/\.detail-hero,[\s\S]*?\.detail-page \.section\s*{[\s\S]*?width:\s*min\(1120px, 100%\)/);
    expect(css).toMatch(/@media \(max-width: 740px\)[\s\S]*?\.api-grid\s*{\s*grid-template-columns:\s*1fr;/);
    expect(css).toMatch(/@media \(max-width: 740px\)[\s\S]*?\.schema-reference-grid\s*{\s*display:\s*block;/);
  });

  it("preserves Playground spacing and quick-call alignment", async () => {
    const appCss = await readFile(new URL("./app.css", import.meta.url), "utf8");
    const systemCss = await readFile(new URL("./system.css", import.meta.url), "utf8");

    expect(appCss).toMatch(/\.pontx-workspace-bar > div:not\(\.api-task-select\)/);
    expect(appCss).toMatch(/\.api-task-select\s*{[\s\S]*?align-self:\s*end;/);
    expect(appCss).toMatch(/\.api-task-select > span\s*{[\s\S]*?white-space:\s*nowrap;/);
    expect(appCss).toMatch(/\.api-full-docs-link\s*{[\s\S]*?align-self:\s*end;/);
    expect(appCss).toMatch(/@media \(max-width: 1000px\)[\s\S]*?\.pontx-workspace-bar\.api-quickstart-bar\s*{[\s\S]*?grid-template-columns:[^;]*auto;/);
    expect(systemCss).toMatch(/\.api-full-docs-link\s*{[\s\S]*?min-height:\s*38px;[\s\S]*?padding:\s*0 12px;/);
    expect(systemCss).not.toMatch(/\.pontx-hydrated-title\s*{/);
  });

  it("uses one underline treatment for the active resource tab", async () => {
    const appCss = await readFile(new URL("./app.css", import.meta.url), "utf8");
    const systemCss = await readFile(new URL("./system.css", import.meta.url), "utf8");

    expect(appCss).toMatch(/\.resource-navigation-tabs a\.is-active::after\s*{[\s\S]*?background:\s*var\(--blue\);/);
    expect(systemCss).toMatch(/\.resource-navigation-tabs\s*{[\s\S]*?height:\s*54px;/);
    expect(systemCss).toMatch(/\.resource-navigation-tabs a\s*{[\s\S]*?padding:\s*0 11px;[\s\S]*?border-radius:\s*0;/);
    expect(systemCss).toMatch(/\.resource-navigation-tabs a\.is-active\s*{[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/);
    expect(systemCss).toMatch(/@media \(max-width: 740px\)[\s\S]*?\.resource-navigation\s*{[\s\S]*?padding:\s*8px 12px 0;[\s\S]*?\.resource-navigation-tabs\s*{[\s\S]*?height:\s*40px;/);
  });

  it("never uses a colored left edge as a selected-state treatment", async () => {
    const styleSources = await Promise.all([
      readFile(new URL("./app.css", import.meta.url), "utf8"),
      readFile(new URL("./system.css", import.meta.url), "utf8"),
      readFile(new URL("./account.css", import.meta.url), "utf8"),
    ]);

    const selectedRule = /([^{}]*(?:is-active|aria-selected|aria-current|data-state)[^{}]*)\{([^{}]*)\}/g;
    for (const css of styleSources) {
      for (const match of css.matchAll(selectedRule)) {
        const [, selector, declarations] = match;
        expect(`${selector} {${declarations}}`).not.toMatch(/border-(?:left|inline-start)\s*:/);
        expect(`${selector} {${declarations}}`).not.toMatch(/box-shadow:\s*inset\s+-?[1-9]/);
      }
    }
  });

  it("keeps endpoint workspace surfaces on one content edge", async () => {
    const css = await readFile(new URL("./system.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.resource-page-workspace \.pontx-workspace-body > \.oauth-toolbar,[\s\S]*?\.resource-page-workspace \.pontx-workspace-body > \.request-example-notice,[\s\S]*?\.resource-page-workspace \.pontx-workspace-body > \.endpoint-playground-history\s*{\s*margin:\s*0;/,
    );
    expect(css).toMatch(
      /\.resource-page-workspace \.pontx-documentation\s*{[\s\S]*?border:\s*0;[\s\S]*?padding:\s*0;[\s\S]*?box-shadow:\s*none;/,
    );
    expect(css).toMatch(
      /\.resource-page-workspace \.pontx-documentation > div:first-child\s*{\s*padding-right:\s*0;/,
    );
  });

  it("lets the workspace toolbar define its grid track height", async () => {
    const [appCss, systemCss] = await Promise.all([
      readFile(new URL("./app.css", import.meta.url), "utf8"),
      readFile(new URL("./system.css", import.meta.url), "utf8"),
    ]);

    expect(appCss).toMatch(
      /\.pontx-workspace-content\s*{[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\);/,
    );
    expect(systemCss).toMatch(
      /\.pontx-workspace-bar\s*{[\s\S]*?min-height:\s*50px;[\s\S]*?padding:\s*8px 16px;/,
    );
  });

  it("keeps the Endpoint favorite inside the existing workspace toolbar", async () => {
    const [route, workspace, accountCss, systemCss] = await Promise.all([
      readFile(new URL("../routes/operation-detail.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/pontx-api-workspace.tsx", import.meta.url), "utf8"),
      readFile(new URL("./account.css", import.meta.url), "utf8"),
      readFile(new URL("./system.css", import.meta.url), "utf8"),
    ]);

    expect(route).not.toContain("loadAccountsViewer");
    expect(route).toContain("return cacheHeaders()");
    expect(workspace).toMatch(
      /className="pontx-workspace-bar-actions"[\s\S]*?<FavoriteEndpointButton[\s\S]*?compact/,
    );
    for (const source of [route, accountCss, systemCss]) {
      expect(source).not.toContain("api-favorite-toolbar");
    }
    expect(accountCss).not.toMatch(
      /\.favorite-api-control:hover,[\s\S]*?\.favorite-api-control:focus-visible\s*{[^}]*outline:\s*none/,
    );
    expect(systemCss).toMatch(
      /:where\(a, button, input, select, textarea, \[tabindex\]\):focus-visible\s*{[\s\S]*?outline:/,
    );
  });

  it("keeps the localized catalog H1 branded as Pontx API Hub", async () => {
    const catalog = await readFile(new URL("../routes/catalog.tsx", import.meta.url), "utf8");
    expect(catalog).toContain('"Pontx API Hub · API 目录"');
    expect(catalog).toContain('"Pontx API Hub · API Catalog"');
  });

  it("keeps current-Endpoint history inline, responsive, and replay-only", async () => {
    const [workspace, history, css] = await Promise.all([
      readFile(new URL("../components/pontx-api-workspace.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/endpoint-playground-history.tsx", import.meta.url), "utf8"),
      readFile(new URL("./system.css", import.meta.url), "utf8"),
    ]);

    expect(workspace).toMatch(
      /<EndpointPlaygroundHistory[\s\S]*?<DocumentationEvidence/,
    );
    expect(history).toContain("Load inputs without sending the request");
    expect(history).toContain("Playground, Unified SDK, and CLI code are in sync");
    expect(css).toMatch(
      /\.endpoint-playground-history li\s*{[\s\S]*?grid-template-columns:/,
    );
    expect(css).toMatch(
      /@media \(max-width: 740px\)[\s\S]*?\.endpoint-playground-history li\s*{[\s\S]*?grid-template-columns:/,
    );
  });

  it("keeps API overview headers compact enough for task content to enter the first viewport", async () => {
    const css = await readFile(new URL("./system.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.api-overview-hero\s*{[\s\S]*?align-items:\s*center;[\s\S]*?padding:\s*28px clamp\(20px, 3vw, 52px\) 30px;/,
    );
    expect(css).toMatch(
      /\.api-overview-intro\s*{[\s\S]*?max-width:\s*920px;[\s\S]*?padding:\s*0;/,
    );
    expect(css).toMatch(
      /\.api-overview-intro h1\s*{[\s\S]*?font-size:\s*clamp\(34px, 3vw, 48px\);/,
    );
    expect(css).toMatch(
      /\.api-overview-facts > div\s*{[\s\S]*?min-height:\s*56px;[\s\S]*?padding:\s*10px 14px;/,
    );
    expect(css).toMatch(/\.api-overview-actions\s*{[\s\S]*?margin-top:\s*14px;/);
  });

  it("uses the shared primary button for the SDK registry action", async () => {
    const [route, appCss] = await Promise.all([
      readFile(new URL("../routes/sdk-detail.tsx", import.meta.url), "utf8"),
      readFile(new URL("./app.css", import.meta.url), "utf8"),
    ]);

    expect(route).toMatch(/className="button button-dark"[\s\S]*?href=\{npmUrl\}/);
    expect(route).not.toContain("npm-registry-link");
    expect(appCss).not.toContain(".npm-registry-link");
  });

  it("keeps the API catalog summary compact enough for search results to enter the first viewport", async () => {
    const css = await readFile(new URL("./system.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.catalog-page\s*{[\s\S]*?padding:\s*28px clamp\(20px, 4vw, 72px\) 56px;/,
    );
    expect(css).toMatch(
      /\.registry-header\s*{[\s\S]*?align-items:\s*center;[\s\S]*?margin:\s*0 auto 24px;[\s\S]*?padding-bottom:\s*20px;/,
    );
    expect(css).toMatch(
      /\.registry-intro h1\s*{[\s\S]*?font-size:\s*clamp\(34px, 3vw, 48px\);/,
    );
    expect(css).toMatch(
      /\.registry-stats > div\s*{[\s\S]*?min-height:\s*64px;[\s\S]*?padding:\s*10px 14px;/,
    );
    expect(css).toMatch(
      /\.registry-taskline\s*{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*baseline;[\s\S]*?margin-bottom:\s*10px;/,
    );
  });

  it("keeps keyboard focus and reduced-motion behavior explicit", async () => {
    const css = await readFile(new URL("./system.css", import.meta.url), "utf8");

    expect(css).toMatch(/:where\(a, button, input, select, textarea, \[tabindex\]\):focus-visible\s*{[\s\S]*?outline:/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration:\s*0\.01ms !important;/);
  });
});
