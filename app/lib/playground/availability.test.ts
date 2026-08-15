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
      getPlaygroundAvailability(operation, "zh")
    ).toEqual({
      executionEnabled: false,
      disabledReason: "供应商要求浏览器验证，Hub 不绕过该验证。"
    });
    expect(
      getPlaygroundAvailability(operation, "en")
    ).toEqual({
      executionEnabled: false,
      disabledReason:
        "The provider requires browser verification, which Hub does not bypass."
    });
  });

  it("executes REST endpoints by default", () => {
    expect(
      getPlaygroundAvailability({ proxyEnabled: true }, "en")
    ).toEqual({ executionEnabled: true });
  });

  it("wires preview-only policy into the reusable Playground contract", async () => {
    const workspace = await readFile(
      new URL("../../components/pontx-api-workspace.tsx", import.meta.url),
      "utf8"
    );

    expect(workspace).toContain(
      "enablePlayground={playgroundAvailable}"
    );
    expect(workspace).toContain(
      "onExecute={playgroundAvailability.executionEnabled ? execute : undefined}"
    );
    expect(workspace).toContain(
      "const playgroundAvailable = playgroundAvailability.executionEnabled;"
    );
    expect(workspace).toContain("if (!playgroundAvailability.executionEnabled)");
    expect(workspace).toContain(
      "onPlaygroundStateChange={(state) => setIsPlaygroundOpen(state.isOpen)}"
    );
    expect(workspace).toContain("if (oauthExecutionBlocked)");
    expect(workspace).toContain("executeDisabled={oauthExecutionBlocked}");
    expect(workspace).toContain(
      "data-oauth-execution-blocked={oauthExecutionBlocked || undefined}"
    );
    expect(workspace).toContain(
      '.getElementById("oauth-execution-prerequisite")'
    );
  });
});
