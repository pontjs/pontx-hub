// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  credentialGuidePreferenceKey
} from "~/lib/playground/credential-guide-preference";
import { CredentialSetupGuide } from "./pontx-api-workspace";

const scheme = {
  id: "apiKey",
  type: "apiKey" as const,
  name: "apikey",
  in: "query" as const,
  envVar: "PONTX_TWELVE_DATA_API_KEY",
  description: {
    zh: "Twelve Data API Key。",
    en: "Twelve Data API key."
  },
  credentialGuide: {
    url: "https://twelvedata.com/account/api-keys",
    title: {
      zh: "获取 Twelve Data API Key",
      en: "Get a Twelve Data API key"
    },
    steps: [
      { zh: "注册或登录账户。", en: "Create an account or sign in." },
      { zh: "打开 API Keys 页面。", en: "Open the API Keys page." },
      { zh: "复制并粘贴 Key。", en: "Copy and paste the key." }
    ]
  }
};

function renderGuide(apiSlug = "twelve-data-forex", locale: "zh" | "en" = "en") {
  return render(createElement(CredentialSetupGuide, {
    apiSlug,
    scheme,
    locale
  }));
}

function details(container: HTMLElement): HTMLDetailsElement {
  const element = container.querySelector("details");
  if (!(element instanceof HTMLDetailsElement)) {
    throw new Error("Expected a credential guide disclosure");
  }
  return element;
}

function toggle(element: HTMLDetailsElement): void {
  const summary = element.querySelector("summary");
  if (!(summary instanceof HTMLElement)) {
    throw new Error("Expected a credential guide summary");
  }
  fireEvent.click(summary);
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("credential setup guide preference", () => {
  it("remembers a collapsed guide across endpoints, locale changes, and remounts", async () => {
    const storageKey = credentialGuidePreferenceKey("twelve-data-forex", "apiKey");
    const first = renderGuide();
    const firstDetails = details(first.container);
    expect(firstDetails.open).toBe(true);

    toggle(firstDetails);
    await waitFor(() => expect(firstDetails.open).toBe(false));
    expect(window.localStorage.getItem(storageKey)).toBe("1");
    expect(window.sessionStorage.length).toBe(0);
    first.unmount();

    const second = renderGuide("twelve-data-forex", "zh");
    await waitFor(() => expect(details(second.container).open).toBe(false));
  });

  it("keeps another product expanded and removes the preference when reopened", async () => {
    const storageKey = credentialGuidePreferenceKey("twelve-data-forex", "apiKey");
    window.localStorage.setItem(storageKey, "1");

    const otherProduct = renderGuide("currencybeacon-rest");
    await waitFor(() => expect(details(otherProduct.container).open).toBe(true));
    otherProduct.unmount();

    const sameProduct = renderGuide();
    const sameProductDetails = details(sameProduct.container);
    await waitFor(() => expect(sameProductDetails.open).toBe(false));
    toggle(sameProductDetails);
    await waitFor(() => expect(sameProductDetails.open).toBe(true));
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });
});
