import { describe, expect, it } from "vitest";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import {
  defaultRequestExample,
  storedConfigForRequestExample,
  unresolvedRequestInputs
} from "./request-examples";

describe("successful request examples", () => {
  it("selects the curated API Quick Start example", () => {
    const api = getCatalogApi("frankfurter");
    const operation = api?.operations.find(
      (candidate) => candidate.slug === api.quickStart?.operationSlug
    );

    expect(defaultRequestExample(api!, operation!)).toMatchObject({
      id: "default",
      completeness: "ready",
      request: { query: { amount: 100, base: "USD" } }
    });
  });

  it("detects missing dynamic query and nested body values", () => {
    const api = getCatalogApi("dida365");
    const checkIns = api?.operations.find(
      (candidate) => candidate.slug === "get-habit-check-ins"
    );
    const task = api?.operations.find(
      (candidate) => candidate.slug === "create-task"
    );

    const emptyCheckIns = {
      method: "GET",
      url: "https://api.dida365.com/open/v1/habit/checkins",
      apiPath: "/open/v1/habit/checkins",
      path: {},
      query: { from: "20260401", to: "20260407" },
      headers: {}
    } as Parameters<typeof unresolvedRequestInputs>[0];
    expect(unresolvedRequestInputs(emptyCheckIns, checkIns?.requestExamples[0]))
      .toMatchObject([{ in: "query", name: "habitIds" }]);
    expect(unresolvedRequestInputs(
      { ...emptyCheckIns, query: { ...emptyCheckIns.query, habitIds: "habit-live" } },
      checkIns?.requestExamples[0]
    )).toEqual([]);

    const partialTask = {
      method: "POST",
      url: "https://api.dida365.com/open/v1/task",
      apiPath: "/open/v1/task",
      path: {},
      query: {},
      headers: {},
      body: { title: "Example" }
    } as Parameters<typeof unresolvedRequestInputs>[0];
    expect(unresolvedRequestInputs(partialTask, task?.requestExamples[0]))
      .toMatchObject([{ in: "body", name: "/projectId" }]);
    expect(unresolvedRequestInputs(
      { ...partialTask, body: { title: "Example", projectId: "project-live" } },
      task?.requestExamples[0]
    )).toEqual([]);
  });

  it("restores the full example while retaining session-only authorization", () => {
    const api = getCatalogApi("dida365");
    const operation = api?.operations.find(
      (candidate) => candidate.slug === "create-task"
    );
    const example = operation?.requestExamples[0];
    expect(example).toBeDefined();

    expect(storedConfigForRequestExample(
      example!,
      { auth: { type: "oauth2", token: "session-token" } },
      "https://api.dida365.com/open/v1"
    )).toMatchObject({
      url: "https://api.dida365.com/open/v1",
      auth: { type: "oauth2", token: "session-token" },
      pathParams: {},
      queryParams: {},
      headerParams: {},
      requestBody: expect.stringContaining('"title": "example"')
    });
  });
});
