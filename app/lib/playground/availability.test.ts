import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getPlaygroundAvailability } from "./availability";

describe("Playground availability", () => {
  it("reports a real protocol-adapter gap without an Endpoint policy", () => {
    const operation = {
      style: "RPC" as const,
      proxyEnabled: false
    };

    expect(
      getPlaygroundAvailability(operation, "zh")
    ).toEqual({
      executionEnabled: false,
      disabledReason: "RPC 规范可浏览和搜索；在线调用需要专用执行适配器，当前尚未提供。"
    });
    expect(
      getPlaygroundAvailability(operation, "en")
    ).toEqual({
      executionEnabled: false,
      disabledReason: "RPC specs are browsable and searchable; online calls need a dedicated execution adapter, which is not available yet."
    });
  });

  it("executes REST endpoints by default", () => {
    expect(
      getPlaygroundAvailability({ proxyEnabled: true }, "en")
    ).toEqual({ executionEnabled: true });
  });

  it("wires an adapter-limited Playground into the reusable contract", async () => {
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
