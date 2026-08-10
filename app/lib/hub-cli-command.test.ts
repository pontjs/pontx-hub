import { describe, expect, it } from "vitest";
import { hubCliCommand, shellArgument } from "./hub-cli-command";

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
});
