import type { Locale } from "~/lib/catalog/types";

export const PROJECT_NAME_MAX_LENGTH = 80;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 280;
export const PROJECT_API_LIMIT = 12;

export function personalWorkspaceName(displayName: string, locale: Locale): string {
  const name = displayName.trim().slice(0, 56);
  if (!name) return locale === "zh" ? "个人项目空间" : "Personal workspace";
  return locale === "zh" ? `${name} 的项目空间` : `${name}'s workspace`;
}

export type ProjectReadOnlyMode = "preview" | "execute_after_preview";

export type ProjectDraft = {
  name: string;
  description: string;
  apiSlugs: string[];
};

export type ProjectAutomationSettings = {
  automationEnabled: boolean;
  readOnlyMode: ProjectReadOnlyMode;
};

export type ProjectValidationResult<T> =
  | { success: true; data: T }
  | { success: false; code: string };

export function validateProjectDraft(
  input: {
    name: unknown;
    description: unknown;
    apiSlugs: unknown[];
  },
  availableApiSlugs: ReadonlySet<string>
): ProjectValidationResult<ProjectDraft> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description = typeof input.description === "string"
    ? input.description.trim()
    : "";
  const apiSlugs = [...new Set(input.apiSlugs.flatMap((value) =>
    typeof value === "string" && value ? [value] : []
  ))];

  if (!name || name.length > PROJECT_NAME_MAX_LENGTH) {
    return { success: false, code: "invalid_project_name" };
  }
  if (description.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
    return { success: false, code: "invalid_project_description" };
  }
  if (!apiSlugs.length || apiSlugs.length > PROJECT_API_LIMIT) {
    return { success: false, code: "invalid_project_apis" };
  }
  if (apiSlugs.some((slug) => !availableApiSlugs.has(slug))) {
    return { success: false, code: "unknown_project_api" };
  }
  return { success: true, data: { name, description, apiSlugs } };
}

export function validateProjectAutomationSettings(input: {
  automationEnabled: unknown;
  readOnlyMode: unknown;
}): ProjectValidationResult<ProjectAutomationSettings> {
  const automationEnabled = input.automationEnabled === true || input.automationEnabled === "on";
  const readOnlyMode = input.readOnlyMode;
  if (readOnlyMode !== "preview" && readOnlyMode !== "execute_after_preview") {
    return { success: false, code: "invalid_automation_settings" };
  }
  return {
    success: true,
    data: { automationEnabled, readOnlyMode }
  };
}

export function projectAgentConfiguration(project: {
  id: string;
  apiSlugs: string[];
  automationEnabled: boolean;
  readOnlyMode: ProjectReadOnlyMode;
}) {
  return {
    schemaVersion: 1,
    projectId: project.id,
    apis: project.apiSlugs,
    automation: {
      enabled: project.automationEnabled,
      readOnly: project.readOnlyMode,
      mutations: "confirm"
    }
  } as const;
}
