import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "~/db/client.server";
import { userProjectApis, userProjects } from "~/db/schema";
import { readAccountsConfiguration } from "./config.server";
import type {
  ProjectAutomationSettings,
  ProjectDraft
} from "./projects";

function database() {
  const configuration = readAccountsConfiguration();
  if (configuration.status !== "ready") throw new Response("Not found", { status: 404 });
  return getDatabase(configuration.databaseUrl);
}

export type UserProject = {
  id: string;
  name: string;
  description: string;
  apiSlugs: string[];
  automationEnabled: boolean;
  readOnlyMode: "preview" | "execute_after_preview";
  createdAt: Date;
  updatedAt: Date;
};

export async function listProjectsForUser(userId: string): Promise<UserProject[]> {
  const db = database();
  const projects = await db
    .select()
    .from(userProjects)
    .where(eq(userProjects.userId, userId))
    .orderBy(desc(userProjects.updatedAt), asc(userProjects.name));
  if (!projects.length) return [];

  const projectApis = await db
    .select()
    .from(userProjectApis)
    .where(inArray(userProjectApis.projectId, projects.map(({ id }) => id)))
    .orderBy(asc(userProjectApis.position), asc(userProjectApis.createdAt));
  const apisByProject = new Map<string, string[]>();
  for (const item of projectApis) {
    const current = apisByProject.get(item.projectId) ?? [];
    current.push(item.apiSlug);
    apisByProject.set(item.projectId, current);
  }
  return projects.map((project) => ({
    ...project,
    apiSlugs: apisByProject.get(project.id) ?? []
  }));
}

export async function getProjectForUser(
  userId: string,
  projectId: string
): Promise<UserProject | undefined> {
  const db = database();
  const [project] = await db
    .select()
    .from(userProjects)
    .where(and(eq(userProjects.userId, userId), eq(userProjects.id, projectId)))
    .limit(1);
  if (!project) return undefined;
  const apis = await db
    .select({ apiSlug: userProjectApis.apiSlug })
    .from(userProjectApis)
    .where(eq(userProjectApis.projectId, projectId))
    .orderBy(asc(userProjectApis.position), asc(userProjectApis.createdAt));
  return { ...project, apiSlugs: apis.map(({ apiSlug }) => apiSlug) };
}

export async function createProjectForUser(
  userId: string,
  draft: ProjectDraft
): Promise<string> {
  const projectId = crypto.randomUUID();
  const db = database();
  await db.batch([
    db.insert(userProjects).values({
      id: projectId,
      userId,
      name: draft.name,
      description: draft.description
    }),
    db.insert(userProjectApis).values(draft.apiSlugs.map((apiSlug, position) => ({
      projectId,
      apiSlug,
      position
    })))
  ]);
  return projectId;
}

export async function updateProjectAutomationForUser(
  userId: string,
  projectId: string,
  settings: ProjectAutomationSettings
): Promise<boolean> {
  const updated = await database()
    .update(userProjects)
    .set({
      automationEnabled: settings.automationEnabled,
      readOnlyMode: settings.readOnlyMode,
      updatedAt: new Date()
    })
    .where(and(eq(userProjects.userId, userId), eq(userProjects.id, projectId)))
    .returning({ id: userProjects.id });
  return updated.length > 0;
}
