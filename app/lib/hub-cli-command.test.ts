import { describe, expect, it } from "vitest";
import {
  hubCliCommand,
  hubCliParameterArguments,
  hubCliSnippet,
  shellArgument
} from "./hub-cli-command";

describe("hubCliCommand", () => {
  it("uses collection, call, controller, and API name hierarchy", () => {
    expect(hubCliCommand("frankfurter", {
      tag: "Exchange Rates",
      operationId: "getLatestRates"
    })).toBe("pontx-hub frankfurter call 'Exchange Rates' getLatestRates");
  });

  it("omits the synthetic default controller", () => {
    expect(hubCliCommand("frankfurter-v2", {
      tag: "default",
      operationId: "getRates"
    }, "preview")).toBe("pontx-hub frankfurter-v2 preview getRates");
  });

  it("quotes unsafe shell arguments", () => {
    expect(shellArgument("owner's tasks")).toBe("'owner'\"'\"'s tasks'");
  });

  it("renders OpenAPI parameters as named CLI options", () => {
    expect(hubCliParameterArguments("base", "USD")).toEqual(["--base", "USD"]);
    expect(hubCliParameterArguments("include", false)).toEqual(["--include", "false"]);
    expect(hubCliParameterArguments("symbols", ["GBP", "JPY"])).toEqual([
      "--symbols",
      `'["GBP","JPY"]'`
    ]);
  });

  it("uses named options for every non-reserved API parameter", () => {
    expect(hubCliParameterArguments("param", "summary")).toEqual([
      "--param",
      "summary"
    ]);
    expect(hubCliParameterArguments("filter[status]", "open")).toEqual([
      "'--filter[status]'",
      "open"
    ]);
  });

  it("rejects parameters that collide with Hub CLI options", () => {
    expect(() => hubCliParameterArguments("url", "https://example.com"))
      .toThrow("API parameter --url conflicts with a Pontx Hub CLI option");
  });

  it("generates named options without dropping false or zero values", () => {
    expect(hubCliSnippet("rates", {
      tag: "default",
      operationId: "getRates",
      parameters: [
        { name: "base", in: "query" },
        { name: "offset", in: "query" },
        { name: "include", in: "query" },
        { name: "X-Region", in: "header" }
      ]
    }, {
      path: {},
      query: { base: "USD", offset: 0, include: false },
      headers: { "X-Region": "eu", "X-Trace": "trace-1" },
      body: { compact: true }
    })).toBe(
      "pontx-hub rates call getRates --base USD --offset 0 --include false " +
      "--X-Region eu -H 'X-Trace: trace-1' --body '{\"compact\":true}'"
    );
  });
});
