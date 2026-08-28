import { describe, expect, it } from "vitest";
import {
  personalWorkspaceName,
  projectAgentConfiguration,
  validateProjectAutomationSettings,
  validateProjectDraft
} from "./projects";

const catalog = new Set(["frankfurter", "dida365"]);

describe("account projects", () => {
  it("creates a localized personal workspace name for a first-time account", () => {
    expect(personalWorkspaceName(" Jason ", "en")).toBe("Jason's workspace");
    expect(personalWorkspaceName("小明", "zh")).toBe("小明 的项目空间");
    expect(personalWorkspaceName("", "zh")).toBe("个人项目空间");
  });

  it("normalizes a project and keeps API order without duplicates", () => {
    expect(validateProjectDraft({
      name: "  FX monitor  ",
      description: "  Rates used by settlement. ",
      apiSlugs: ["frankfurter", "dida365", "frankfurter"]
    }, catalog)).toEqual({
      success: true,
      data: {
        name: "FX monitor",
        description: "Rates used by settlement.",
        apiSlugs: ["frankfurter", "dida365"]
      }
    });
  });

  it("rejects empty projects and unknown APIs", () => {
    expect(validateProjectDraft({
      name: "Project",
      description: "",
      apiSlugs: []
    }, catalog)).toEqual({ success: false, code: "invalid_project_apis" });
    expect(validateProjectDraft({
      name: "Project",
      description: "",
      apiSlugs: ["untrusted-api"]
    }, catalog)).toEqual({ success: false, code: "unknown_project_api" });
  });

  it("keeps mutation confirmation fixed in generated Agent configuration", () => {
    expect(validateProjectAutomationSettings({
      automationEnabled: "on",
      readOnlyMode: "execute_after_preview"
    })).toEqual({
      success: true,
      data: { automationEnabled: true, readOnlyMode: "execute_after_preview" }
    });
    expect(projectAgentConfiguration({
      id: "11111111-1111-4111-8111-111111111111",
      apiSlugs: ["frankfurter"],
      automationEnabled: true,
      readOnlyMode: "execute_after_preview"
    }).automation).toEqual({
      enabled: true,
      readOnly: "execute_after_preview",
      mutations: "confirm"
    });
  });
});
