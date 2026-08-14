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

  it("renders Endpoint and Schema as vertical first-level directory groups", () => {
    const contextNavigation = render(createElement(ResourceNavigation, {
      locale: "zh",
      api,
      active: "docs"
    }));
    const directoryNavigation = render(createElement(ResourceDirectoryNavigation, {
      locale: "zh",
      api,
      activeOperation: api.operations[0]
    }));

    expect(contextNavigation).toContain("resource-navigation-mobile-link is-active");
    expect(contextNavigation).toContain(`href="/zh/sdks/${api.slug}"`);
    expect(directoryNavigation).toContain('role="group" aria-label="API 参考目录"');
    expect(directoryNavigation).toContain('<details class="resource-directory-group" open=""><summary aria-current="page"><span>接口</span>');
    expect(directoryNavigation).toContain('<details class="resource-directory-group"><summary><span>数据结构</span>');
    expect(directoryNavigation).toContain('placeholder="搜索接口…"');
    expect(directoryNavigation).toContain(`href="/zh/apis/${api.slug}/schemas/`);
    expect(directoryNavigation).toContain(`aria-label="${api.schemas.length} 个数据结构">${api.schemas.length}</strong>`);
  });

  it("opens the English Schema group and marks the current Schema link", () => {
    const schema = api.schemas[0];
    const html = render(createElement(ResourceDirectoryNavigation, {
      locale: "en",
      api,
      activeSchemaName: schema.name
    }));

    expect(html).toContain('aria-label="API reference directory"');
    expect(html).toContain('<details class="resource-directory-group"><summary><span>Endpoints</span>');
    expect(html).toContain('<details class="resource-directory-group" open=""><summary aria-current="page"><span>Schemas</span>');
    expect(html).toContain(`aria-current="page" href="/en/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}"`);
    expect(html).toContain(`aria-label="${api.operations.length} endpoints">${api.operations.length}</strong>`);
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
