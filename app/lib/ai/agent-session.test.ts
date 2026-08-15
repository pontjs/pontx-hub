import { describe, expect, it } from "vitest";
import {
  createAgentSession,
  readAgentSession,
  type PreparedAgentCall
} from "./agent-session";

const prepared: PreparedAgentCall = {
  request: {
    apiSlug: "frankfurter-v2",
    operationSlug: "get-rates",
    serverId: "default",
    query: { base: "USD", symbols: "CNY" },
    headers: { authorization: "not-for-storage", accept: "application/json" }
  },
  preview: {
    method: "GET",
    url: "https://api.frankfurter.dev/v2/rates?base=USD&symbols=CNY",
    curl: "curl https://api.frankfurter.dev/v2/rates?base=USD&symbols=CNY",
    requiresConfirmation: false,
    proxyEnabled: true,
    warnings: []
  },
  auth: [],
  operation: {
    method: "GET",
    path: "/rates",
    href: "/en/apis/frankfurter-v2/get-rates",
    credentialStorageKey: "playground:GET:/rates:params"
  },
  cli: "pontx-hub frankfurter-v2 call getRates --base USD --symbols CNY"
};

describe("Pontx Agent session snapshots", () => {
  it("restores prepared calls and a completed read after a page refresh", () => {
    const stored = createAgentSession({
      threadId: "thread-1",
      messages: [
        { id: "user-1", role: "user", content: "Find exchange rates" },
        { id: "tool-1", role: "tool", content: [{ type: "tool_result", toolCallId: "call-1", content: "hidden" }] } as any,
        { id: "agent-1", role: "assistant", content: "I prepared a request." }
      ],
      prepared: [prepared],
      executions: {
        0: {
          status: "done",
          result: { status: 200, body: { rates: { CNY: 7.1 } } }
        }
      }
    });

    const restored = readAgentSession(JSON.stringify(stored), "fallback");

    expect(restored.threadId).toBe("thread-1");
    expect(restored.messages.map((message) => message.id)).toEqual(["user-1", "agent-1"]);
    expect(restored.prepared).toEqual([
      expect.objectContaining({ operation: expect.objectContaining({ href: "/en/apis/frankfurter-v2/get-rates" }) })
    ]);
    expect(restored.executions[0]).toEqual({
      status: "done",
      result: { status: 200, body: { rates: { CNY: 7.1 } } }
    });
  });

  it("does not save credentials, a pending state, or a mutation confirmation capability", () => {
    const stored = createAgentSession({
      threadId: "thread-2",
      messages: [],
      prepared: [prepared],
      executions: {
        0: {
          status: "confirm",
          confirmationToken: "single-use-token",
          preview: { confirmationToken: "single-use-token" }
        },
        1: { status: "working" }
      }
    });
    const serialized = JSON.stringify(stored);

    expect(serialized).not.toContain("not-for-storage");
    expect(serialized).not.toContain("single-use-token");
    expect(stored.prepared[0]?.request).toEqual(expect.objectContaining({
      headers: { accept: "application/json" }
    }));
    expect(stored.executions).toEqual({
      0: { status: "idle" },
      1: { status: "idle" }
    });
  });

  it("continues to restore the existing v1 message-only browser session", () => {
    const restored = readAgentSession(JSON.stringify({
      threadId: "thread-3",
      messages: [{ id: "agent-2", role: "assistant", content: "Existing task" }]
    }), "fallback");

    expect(restored).toMatchObject({
      version: 2,
      threadId: "thread-3",
      messages: [{ id: "agent-2" }],
      prepared: [],
      executions: {}
    });
  });
});
