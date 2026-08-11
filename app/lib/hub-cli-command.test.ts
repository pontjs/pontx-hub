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

  it("uses -p only when an API parameter collides with CLI syntax", () => {
    expect(hubCliParameterArguments("body", "summary")).toEqual([
      "-p",
      "body=summary"
    ]);
    expect(hubCliParameterArguments("filter[status]", "open")).toEqual([
      "-p",
      `'filter[status]=open'`
    ]);
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
