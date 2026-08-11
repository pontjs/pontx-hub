import { describe, expect, it } from "vitest";
import { isFavoriteEndpoint } from "./favorites";

describe("Endpoint favorite identities", () => {
  it("matches the parent API and operation slug together", () => {
    const favorites = [
      { apiSlug: "dida365", operationSlug: "get-user-projects" }
    ];

    expect(isFavoriteEndpoint(
      favorites,
      "dida365",
      "get-user-projects"
    )).toBe(true);
    expect(isFavoriteEndpoint(
      favorites,
      "dida365",
      "create-project"
    )).toBe(false);
    expect(isFavoriteEndpoint(
      favorites,
      "another-api",
      "get-user-projects"
    )).toBe(false);
  });
});
