import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { getCatalogApi, getPontxSpec } from "~/lib/catalog/catalog.server";
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
  const zhSpec = getPontxSpec("dida365", "zh")!;
  const enSpec = getPontxSpec("dida365", "en")!;

  it("renders Endpoint and Schema as vertical first-level directory groups", () => {
    const contextNavigation = render(createElement(ResourceNavigation, {
      locale: "zh",
      api,
      active: "docs"
    }));
    const directoryNavigation = render(createElement(ResourceDirectoryNavigation, {
      locale: "zh",
      api,
      spec: zhSpec,
      activeOperation: api.operations[0]
    }));

    expect(contextNavigation).toContain("resource-navigation-mobile-link is-active");
    expect(contextNavigation).toContain(`href="/zh/sdks/${api.slug}"`);
    expect(contextNavigation).not.toContain(`/zh/skills/pontx-${api.slug}`);
    expect(directoryNavigation).toContain('role="group" aria-label="API 参考目录"');
    expect(directoryNavigation).toContain('<details class="resource-directory-group" open=""><summary aria-current="page"><span>接口</span>');
    expect(directoryNavigation).toContain('<details class="resource-directory-group"><summary><span>数据结构</span>');
    expect(directoryNavigation).toContain('placeholder="搜索接口…"');
    expect(directoryNavigation).toContain(`href="/zh/apis/${api.slug}/schemas/`);
    expect(directoryNavigation).toContain(`aria-label="${api.schemas.length} 个数据结构">${api.schemas.length}</strong>`);
  });

  it("shows a product Skill tab only when the loader resolves one", () => {
    const skillName = `pontx-${api.slug}`;
    const withSkill = render(createElement(ResourceNavigation, {
      locale: "en",
      api,
      active: "skill",
      skillName
    }));
    const withoutSkill = render(createElement(ResourceNavigation, {
      locale: "en",
      api,
      active: "overview"
    }));

    expect(withSkill).toContain(`aria-current="page" href="/en/skills/${skillName}"`);
    expect(withSkill).toContain(">Skill</a>");
    expect(withSkill).toContain(">Endpoints</a>");
    expect(withSkill).toContain(">Schemas<span>");
    expect(withSkill).not.toMatch(/resource-navigation-mobile-link[^>]+>Endpoints/);
    expect(withoutSkill).not.toContain(`/en/skills/${skillName}`);
  });

  it("opens the English Schema group and marks the current Schema link", () => {
    const schema = api.schemas[0];
    const html = render(createElement(ResourceDirectoryNavigation, {
      locale: "en",
      api,
      spec: enSpec,
      activeSchemaName: schema.name
    }));

    expect(html).toContain('aria-label="API reference directory"');
    expect(html).toContain('<details class="resource-directory-group"><summary><span>Endpoints</span>');
    expect(html).toContain('<details class="resource-directory-group" open=""><summary aria-current="page"><span>Schemas</span>');
    expect(html).toContain(`aria-current="page" href="/en/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}"`);
    expect(html).toContain(`aria-label="${api.operations.length} endpoints">${api.operations.length}</strong>`);
  });

  it("renders ungrouped Endpoints as individual directory entries", () => {
    const ungroupedApi = getCatalogApi("frankfurter-v2")!;
    const spec = getPontxSpec("frankfurter-v2", "en")!;
    const operation = ungroupedApi.operations[0];
    const html = render(createElement(ResourceDirectoryNavigation, {
      locale: "en",
      api: ungroupedApi,
      spec,
      activeOperation: operation
    }));

    expect(html).toContain('class="pontx-directory-flat" aria-label="Ungrouped endpoints"');
    expect(html).toContain(`<small>${operation.method}</small><span>${operation.title.en}</span>`);
    expect(html).toContain(`aria-current="page" href="/en/apis/${ungroupedApi.slug}/${operation.slug}"`);
    expect(html).not.toContain('placeholder="Search endpoints…"');
  });

  it("renders RPC Endpoint titles without reserving an empty method column", () => {
    const rpcApi = getCatalogApi("amazon-sqs")!;
    const spec = getPontxSpec("amazon-sqs", "en")!;
    const operation = rpcApi.operations.find(
      (candidate) => candidate.operationId === "ListQueues",
    )!;
    const html = render(createElement(ResourceDirectoryNavigation, {
      locale: "en",
      api: rpcApi,
      spec,
      activeOperation: operation,
    }));

    expect(html).toContain(
      `aria-current="page" class="pontx-directory-flat-title-only" href="/en/apis/amazon-sqs/list-queues" data-discover="true"><span>ListQueues</span>`,
    );
    expect(html).not.toContain(
      `href="/en/apis/amazon-sqs/list-queues"><small>`,
    );
  });

  it("renders a Schema as one documentation surface without Playground facts", () => {
    const schema = api.schemas[0];
    const html = render(createElement(SchemaReference, {
      locale: "zh",
      api,
      spec: zhSpec,
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
