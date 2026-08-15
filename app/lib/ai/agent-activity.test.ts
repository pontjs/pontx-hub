import { describe, expect, it } from "vitest";
import {
  completeAgentActivity,
  describeAgentActivity,
  formatActivityPayload,
  parseToolArguments,
  startAgentActivity,
  updateAgentActivityArguments
} from "./agent-activity";

describe("AG-UI tool activity presentation", () => {
  it("maps a standard file-read event to a collapsed, path-first activity", () => {
    const activity = updateAgentActivityArguments(
      startAgentActivity({
        toolCallId: "call-read",
        toolCallName: "read_file",
        parentMessageId: "message-1"
      }),
      { path: "/workspace/src/config.ts" }
    );

    expect(activity).toMatchObject({
      id: "call-read",
      kind: "read",
      parentMessageId: "message-1",
      target: "/workspace/src/config.ts",
      status: "running"
    });
    expect(describeAgentActivity(activity, "zh")).toMatchObject({
      title: "读取文件",
      status: "执行中"
    });
  });

  it("keeps tool output separate from the chat transcript and formats JSON only when expanded", () => {
    const activity = completeAgentActivity(
      startAgentActivity({ toolCallId: "call-task", toolCallName: "Task" }),
      '{"summary":"sub-agent finished"}'
    );

    expect(activity).toMatchObject({ kind: "delegate", status: "completed" });
    expect(describeAgentActivity(activity, "en").title).toBe("Delegate sub-agent");
    expect(formatActivityPayload(activity.result)).toBe(
      '{\n  "summary": "sub-agent finished"\n}'
    );
  });

  it("accepts streamed AG-UI JSON argument buffers without treating partial input as valid", () => {
    expect(parseToolArguments('{"query":"rates"}')).toEqual({ query: "rates" });
    expect(parseToolArguments('{"query"')).toBeUndefined();
  });
});
