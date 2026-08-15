import { describe, expect, it } from "vitest";
import { loader } from "./endpoint-legacy-redirect";

describe("legacy Endpoint links", () => {
  it("permanently redirects the Agent's former endpoint path to the canonical route", () => {
    const response = loader({
      params: {
        locale: "en",
        apiSlug: "frankfurter-v2",
        operationSlug: "get-rates"
      },
      request: new Request(
        "https://pontx.dev/en/apis/frankfurter-v2/endpoints/get-rates?base=EUR"
      )
    } as never);

    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe(
      "/en/apis/frankfurter-v2/get-rates?base=EUR"
    );
  });

  it("does not redirect a non-existent Endpoint", () => {
    try {
      loader({
        params: { locale: "en", apiSlug: "frankfurter-v2", operationSlug: "missing" },
        request: new Request("https://pontx.dev/en/apis/frankfurter-v2/endpoints/missing")
      } as never);
      throw new Error("Expected the legacy route to reject a missing Endpoint");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });
});
