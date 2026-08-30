// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCatalogApi, getPontxSpec } from "~/lib/catalog/catalog.server";

vi.mock("~/components/pontx-api-workspace", () => ({
  PontxApiWorkspace: () =>
    createElement("div", { "data-testid": "interactive-endpoint-workspace" })
}));

vi.mock("~/components/deferred-schema-viewer", () => ({
  default: () =>
    createElement("div", { "data-testid": "interactive-schema-viewer" })
}));

import { EndpointReference } from "./endpoint-reference";
import { SchemaReference } from "./schema-reference";

afterEach(cleanup);

describe("automatic API reference loading", () => {
  const api = getCatalogApi("frankfurter")!;
  const spec = getPontxSpec("frankfurter", "en")!;

  it("loads the full Endpoint workspace without asking the user to click", async () => {
    const requestNavigation = vi.fn();
    const operation = api.operations[0];

    render(
      createElement(
        MemoryRouter,
        null,
        createElement(EndpointReference, {
          locale: "en",
          api,
          spec,
          operation,
          onLoadDirectory: requestNavigation
        })
      )
    );

    expect(
      screen.queryByRole("button", {
        name: "Load interactive docs & Playground"
      })
    ).toBeNull();
    expect(await screen.findByTestId("interactive-endpoint-workspace")).toBeTruthy();
    expect(requestNavigation).toHaveBeenCalledTimes(1);
  });

  it("loads the interactive Schema viewer without asking the user to click", async () => {
    const requestNavigation = vi.fn();
    const schema = api.schemas[0];

    render(
      createElement(
        MemoryRouter,
        null,
        createElement(SchemaReference, {
          locale: "en",
          api,
          spec,
          schema,
          onLoadDirectory: requestNavigation
        })
      )
    );

    expect(
      screen.queryByRole("button", { name: "Load interactive Schema Viewer" })
    ).toBeNull();
    await waitFor(() => {
      expect(screen.getByTestId("interactive-schema-viewer")).toBeTruthy();
    });
    expect(requestNavigation).toHaveBeenCalledTimes(1);
  });
});
