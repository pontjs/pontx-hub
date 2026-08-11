import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { ResourceDirectoryNavigation } from "./resource-directory-navigation";
import { ResourceNavigation } from "./resource-navigation";
import { SchemaReference } from "./schema-reference";

function render(component: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, component)
  );
}

describe("API resource navigation", () => {
  const api = getCatalogApi("dida365")!;

  it("moves desktop Endpoint and Schema navigation into the directory groups", () => {
    const contextNavigation = render(createElement(ResourceNavigation, {
      locale: "zh",
      api,
      active: "docs"
    }));
    const directoryNavigation = render(createElement(ResourceDirectoryNavigation, {
      locale: "zh",
      api,
      active: "endpoints"
    }));

    expect(contextNavigation).toContain("resource-navigation-mobile-link is-active");
    expect(contextNavigation).toContain(`href="/zh/sdks/${api.slug}"`);
    expect(directoryNavigation).toContain('aria-label="API 参考分组"');
    expect(directoryNavigation).toContain('<span class="is-active" aria-current="page"><span>接口</span>');
    expect(directoryNavigation).toContain(`href="/zh/apis/${api.slug}/schemas/`);
    expect(directoryNavigation).toContain(`<strong>${api.schemas.length}</strong>`);
  });

  it("keeps an English Endpoint return path when Schemas are active", () => {
    const html = render(createElement(ResourceDirectoryNavigation, {
      locale: "en",
      api,
      active: "schemas"
    }));

    expect(html).toContain('aria-label="API reference sections"');
    expect(html).toContain(`<span class="is-active" aria-current="page"><span>Schemas</span>`);
    expect(html).toContain(`href="/en/apis/${api.slug}/${api.operations[0].slug}"`);
    expect(html).toContain(`<strong>${api.operations.length}</strong>`);
  });

  it("renders a Schema as one documentation surface without Playground facts", () => {
    const schema = api.schemas[0];
    const html = render(createElement(SchemaReference, {
      locale: "zh",
      api,
      schema
    }));

    expect(html).toContain('class="schema-reference-content"');
    expect(html).toContain('class="schema-directory-list"');
    expect(html).toContain(`<h1>${schema.title.zh}</h1>`);
    expect(html).not.toContain("schema-facts");
    expect(html).not.toContain("SCHEMA INDEX");
    expect(html).not.toContain("playground-panel");
  });
});
