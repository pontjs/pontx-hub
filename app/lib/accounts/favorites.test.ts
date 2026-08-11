import { describe, expect, it } from "vitest";
import {
  endpointFavoriteStorageKey,
  isFavoriteEndpoint,
  parseEndpointFavoriteStorageKey
} from "./favorites";

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

  it("round-trips a versioned Endpoint identity through legacy storage", () => {
    const favorite = { apiSlug: "market:data", operationSlug: "get/trade" };
    const key = endpointFavoriteStorageKey(favorite);

    expect(key).toBe("endpoint:v1:market%3Adata:get%2Ftrade");
    expect(parseEndpointFavoriteStorageKey(key)).toEqual(favorite);
  });

  it("ignores superseded product favorites and malformed Endpoint keys", () => {
    expect(parseEndpointFavoriteStorageKey("massive")).toBeUndefined();
    expect(parseEndpointFavoriteStorageKey("endpoint:v1:massive")).toBeUndefined();
    expect(parseEndpointFavoriteStorageKey("endpoint:v1:%:get-trade")).toBeUndefined();
  });
});
