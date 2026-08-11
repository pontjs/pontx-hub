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

  it("keeps keyboard focus and reduced-motion behavior explicit", async () => {
    const css = await readFile(new URL("./system.css", import.meta.url), "utf8");

    expect(css).toMatch(/:where\(a, button, input, select, textarea, \[tabindex\]\):focus-visible\s*{[\s\S]*?outline:/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration:\s*0\.01ms !important;/);
  });
});
