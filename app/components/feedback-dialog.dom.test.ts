// @vitest-environment jsdom

import { createElement, useRef, useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Locale } from "~/lib/catalog/types";
import { FeedbackDialog } from "./feedback-dialog";
import { SiteShell } from "./site-shell";

function DialogHarness({ locale = "zh" }: { locale?: Locale }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return createElement(
    "div",
    null,
    createElement("button", {
      ref: triggerRef,
      type: "button",
      onClick: () => setOpen(true)
    }, "Open feedback"),
    createElement(FeedbackDialog, {
      open,
      locale,
      pathname: locale === "zh" ? "/zh/docs" : "/en/docs",
      returnFocusRef: triggerRef,
      onClose: () => setOpen(false)
    })
  );
}

beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute("open", "");
      }
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute("open");
      }
    }
  });
  window.requestAnimationFrame = (callback) => window.setTimeout(callback, 0);
  window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
});

afterEach(() => {
  cleanup();
  delete (window as Window & { gtag?: unknown }).gtag;
});

describe("feedback dialog interaction", () => {
  it("opens, closes on cancel, and restores focus to its trigger", async () => {
    render(createElement(DialogHarness));
    const trigger = screen.getByRole("button", { name: "Open feedback" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog.hasAttribute("open")).toBe(true);
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText("关闭反馈窗口"));
    });

    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
  });

  it("renders both external targets and emits only the allowlisted event payload", async () => {
    const gtag = vi.fn();
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = gtag;
    render(createElement(DialogHarness, { locale: "en" }));
    fireEvent.click(screen.getByRole("button", { name: "Open feedback" }));

    const issue = await screen.findByRole("link", { name: /Report a website problem/ });
    const discussion = screen.getByRole("link", { name: /Suggest an improvement/ });
    expect(issue.getAttribute("target")).toBe("_blank");
    expect(discussion.getAttribute("target")).toBe("_blank");
    expect(issue.getAttribute("href")).toContain("template=website-bug.yml");
    expect(discussion.getAttribute("href")).toContain("category=ideas");

    fireEvent.click(discussion);
    expect(gtag).toHaveBeenCalledWith("event", "feedback_channel_select", {
      locale: "en",
      surface: "site_header",
      channel: "discussion"
    });
    expect(JSON.stringify(gtag.mock.calls)).not.toMatch(/page_path|token|content/i);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("site shell feedback entry", () => {
  it("closes the mobile menu before opening the shared dialog without GA", async () => {
    const router = createMemoryRouter([{
      path: "*",
      element: createElement(SiteShell, {
        locale: "en",
        children: createElement("main", null, "Content")
      })
    }], { initialEntries: ["/en/docs?token=private#playground"] });
    render(createElement(RouterProvider, { router }));

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const navigation = screen.getByRole("navigation", { name: "Menu navigation" });
    expect(navigation.getAttribute("data-open")).toBe("true");

    const mobileTrigger = document.querySelector<HTMLButtonElement>(
      ".mobile-feedback-trigger"
    );
    expect(mobileTrigger).not.toBeNull();
    fireEvent.click(mobileTrigger!);

    expect(navigation.hasAttribute("data-open")).toBe(false);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).not.toBeNull();
    const issue = screen.getByRole("link", { name: /Report a website problem/ });
    expect(issue.getAttribute("href")).toContain("page_path=%2Fen%2Fdocs");
    expect(issue.getAttribute("href")).not.toMatch(/private|playground/);
  });
});
