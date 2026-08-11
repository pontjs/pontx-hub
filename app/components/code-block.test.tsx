import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CodeBlock } from "./code-block";

describe("CodeBlock", () => {
  it("keeps shell commands in server HTML and marks syntax tokens", () => {
    const html = renderToStaticMarkup(
      <CodeBlock
        code={"pontx-hub frankfurter call 'Exchange Rates' getLatestRates --base USD\n# Preview first"}
        language="shell"
        label="Pontx Hub CLI"
        copyLabel="Copy"
        copiedLabel="Copied"
        copyFailedLabel="Copy failed"
      />
    );

    expect(html).toContain("pontx-hub");
    expect(html).toContain("Exchange Rates");
    expect(html).toContain("code-token-command");
    expect(html).toContain("code-token-keyword");
    expect(html).toContain("code-token-option");
    expect(html).toContain("code-token-comment");
    expect(html).toContain('tabindex="0"');
  });
});
