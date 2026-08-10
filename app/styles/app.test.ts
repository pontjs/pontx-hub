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

  it("keeps long endpoint paths inside desktop search result columns", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.search-result-context\s*{\s*display:\s*grid;\s*min-width:\s*0;/,
    );
    expect(css).toMatch(
      /\.search-result-context code\s*{[\s\S]*?max-width:\s*100%;[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?white-space:\s*normal;/,
    );
  });

  it("renders highlighted terminal surfaces with visible keyboard focus", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(/\.code-frame\s*{[\s\S]*?background:\s*#101720;/);
    expect(css).toMatch(/\.code-frame-content:focus-visible\s*{[\s\S]*?outline:/);
    expect(css).toMatch(/\.code-token-command\s*{[\s\S]*?color:\s*var\(--acid\);/);
    expect(css).toMatch(/\.code-token-option\s*{[\s\S]*?color:/);
    expect(css).toMatch(/\.code-token-comment\s*{[\s\S]*?color:/);
  });
});
