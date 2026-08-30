import { describe, expect, it } from "vitest";
import {
  apiDescriptionParagraphs,
  apiDescriptionPlainText
} from "./plain-text";

describe("API description plain text", () => {
  it("keeps rich API prose readable without exposing or executing markup", () => {
    const source = [
      "<p>Returns <code>QueueNamePrefix</code> &amp; more.</p>",
      '<note><p>See <a href="https://example.com">the guide</a>.</p></note>',
      "<script>alert('no')</script>"
    ].join("\n");

    expect(apiDescriptionPlainText(source)).toBe(
      "Returns QueueNamePrefix & more.\n\nSee the guide."
    );
    expect(apiDescriptionParagraphs(source)).toEqual([
      "Returns QueueNamePrefix & more.",
      "See the guide."
    ]);
  });

  it("normalizes Markdown links and emphasis without deleting literal wildcards", () => {
    expect(
      apiDescriptionPlainText("Use [`queue*`](https://example.com) with **care**.")
    ).toBe("Use queue* with care.");
  });
});
