import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("API directory integration styles", () => {
  it("protects menu spacing from third-party button resets", async () => {
    const css = await readFile(new URL("./app.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.pontx-directory button\[aria-expanded\],[\s\S]*?\.pontx-directory \[role="menuitem"\]\s*{\s*padding:\s*8px 12px;/,
    );
    expect(css).toMatch(
      /\.pontx-directory \[role="menuitem"\] > p\s*{\s*margin-top:\s*2px;/,
    );
  });
});
