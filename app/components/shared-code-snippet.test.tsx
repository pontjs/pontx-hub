import { HighlightedShellCode } from "@pontx/shadcn-ui/playground";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("shared Playground code snippets", () => {
  it("ships structured highlighting for Pontx Hub CLI commands", () => {
    const code = "pontx-hub dida365 call project getUserProjects";
    const html = renderToStaticMarkup(
      <HighlightedShellCode
        code={code}
        height={112}
        label="Pontx Hub CLI code"
      />
    );

    expect(html).toContain('data-shell-token="command"');
    expect(html).toContain('data-shell-token="keyword"');
    expect(html).toContain('data-testid="code-snippets-shell"');
    expect(html.replace(/<[^>]+>/g, "")).toContain(code);
  });
});
