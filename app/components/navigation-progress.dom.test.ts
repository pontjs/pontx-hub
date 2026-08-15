// @vitest-environment jsdom

import { createElement, Fragment } from "react";
import { act, render } from "@testing-library/react";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider
} from "react-router";
import { describe, expect, it } from "vitest";
import { NavigationProgress } from "./navigation-progress";

describe("NavigationProgress", () => {
  it("shows immediate visual and accessible feedback while route data loads", async () => {
    let finishLoading!: () => void;
    const pendingLoader = new Promise<void>((resolve) => {
      finishLoading = resolve;
    });
    const router = createMemoryRouter([
      {
        path: "/",
        element: createElement(
          Fragment,
          null,
          createElement(NavigationProgress),
          createElement(Outlet)
        ),
        children: [
          { index: true, element: createElement("p", null, "Catalog") },
          {
            path: "next",
            loader: () => pendingLoader,
            element: createElement("p", null, "Next page")
          }
        ]
      }
    ]);
    const view = render(createElement(RouterProvider, { router }));

    await act(async () => {
      void router.navigate("/next");
      await Promise.resolve();
    });

    expect(
      view.container.querySelector(".navigation-progress")?.hasAttribute("data-pending")
    ).toBe(true);
    expect(view.getByRole("status").textContent).toBe("Loading page…");

    await act(async () => {
      finishLoading();
      await pendingLoader;
    });
    expect(
      view.container.querySelector(".navigation-progress")?.hasAttribute("data-pending")
    ).toBe(false);
  });
});
