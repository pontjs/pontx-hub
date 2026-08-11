import { afterEach, describe, expect, it, vi } from "vitest";
import { createDebouncedTask } from "./debounce";

describe("createDebouncedTask", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs only the latest scheduled search after the debounce window", () => {
    vi.useFakeTimers();
    const submittedQueries: string[] = [];
    const debouncedSearch = createDebouncedTask<string>(300);

    debouncedSearch.schedule("mar", (query) => submittedQueries.push(query));
    vi.advanceTimersByTime(299);
    expect(submittedQueries).toEqual([]);

    debouncedSearch.schedule("market", (query) => submittedQueries.push(query));
    vi.advanceTimersByTime(299);
    expect(submittedQueries).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(submittedQueries).toEqual(["market"]);
  });

  it("cancels a pending task when its owner unmounts", () => {
    vi.useFakeTimers();
    const submittedQueries: string[] = [];
    const debouncedSearch = createDebouncedTask<string>(300);

    debouncedSearch.schedule("market", (query) => submittedQueries.push(query));
    debouncedSearch.cancel();
    vi.runAllTimers();

    expect(submittedQueries).toEqual([]);
  });
});
