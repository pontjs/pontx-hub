import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeExecutionQuota,
  executionClientId,
  resetExecutionQuotasForTests
} from "./rate-limit.server";

beforeEach(resetExecutionQuotasForTests);

describe("execution rate limit", () => {
  it("limits the 21st execution in one minute", () => {
    for (let index = 0; index < 20; index++) {
      expect(consumeExecutionQuota("203.0.113.5", 1_000).allowed).toBe(true);
    }
    expect(consumeExecutionQuota("203.0.113.5", 1_000)).toEqual({
      allowed: false,
      retryAfterSeconds: 60
    });
    expect(consumeExecutionQuota("203.0.113.5", 61_000).allowed).toBe(true);
  });

  it("uses the first trusted proxy address as the bucket id", () => {
    const request = new Request("https://hub.example/api", {
      headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.1" }
    });
    expect(executionClientId(request)).toBe("198.51.100.7");
  });
});
