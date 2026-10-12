import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import path from "node:path";
import * as schema from "./schema";

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return `file:${path.join(process.cwd(), "data", "toilets.db")}`;
}

const client = createClient({
  url: databaseUrl(),
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export { client as dbClient };
