import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cachedDatabase: ReturnType<typeof createDatabase> | undefined;
let cachedUrl: string | undefined;

function createDatabase(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}

export function getDatabase(databaseUrl: string) {
  if (!cachedDatabase || cachedUrl !== databaseUrl) {
    cachedDatabase = createDatabase(databaseUrl);
    cachedUrl = databaseUrl;
  }
  return cachedDatabase;
}
