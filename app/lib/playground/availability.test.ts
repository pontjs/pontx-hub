import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getPlaygroundAvailability } from "./availability";

describe("Playground availability", () => {
  it("disables execution and localizes the curated endpoint reason", () => {
    const operation = {
      proxyEnabled: false,
      proxyDisabledReason: {
        zh: "供应商要求浏览器验证，Hub 不绕过该验证。",
        en: "The provider requires browser verification, which Hub does not bypass."
      }
    };

    expect(
      getPlaygroundAvailability({ proxyEnabled: true }, operation, "zh")
    ).toEqual({
      executionEnabled: false,
      disabledReason: "供应商要求浏览器验证，Hub 不绕过该验证。"
    });
    expect(
      getPlaygroundAvailability({ proxyEnabled: true }, operation, "en")
    ).toEqual({
      executionEnabled: false,
      disabledReason:
        "The provider requires browser verification, which Hub does not bypass."
    });
  });

  it("requires both API and endpoint proxy policies to allow execution", () => {
    expect(
      getPlaygroundAvailability(
        { proxyEnabled: false },
        { proxyEnabled: true },
        "en"
      )
    ).toEqual({
      executionEnabled: false,
      disabledReason:
        "This endpoint is preview-only; Hub will not send the request to the provider."
    });

    expect(
      getPlaygroundAvailability(
        { proxyEnabled: true },
        { proxyEnabled: true },
        "en"
      )
    ).toEqual({ executionEnabled: true });
  });

  it("wires preview-only policy into the reusable Playground contract", async () => {
    const workspace = await readFile(
      new URL("../../components/pontx-api-workspace.tsx", import.meta.url),
      "utf8"
    );

    expect(workspace).toContain(
      "enablePlayground={playgroundAvailability.executionEnabled}"
    );
    expect(workspace).toContain(
      "onExecute={playgroundAvailability.executionEnabled ? execute : undefined}"
    );
  });
});
