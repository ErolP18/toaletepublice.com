import { mkdir } from "node:fs/promises";
import path from "node:path";
import seedToilets from "@/data/toilets.json";
import type { Toilet } from "@/lib/types";
import { db, dbClient } from "./index";
import { toilets } from "./schema";

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS toilets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  city TEXT NOT NULL,
  county TEXT NOT NULL,
  address TEXT,
  hours TEXT,
  photo TEXT,
  price TEXT,
  accessible INTEGER NOT NULL DEFAULT 0,
  free INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'propunere',
  notes TEXT,
  source TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS toilets_city_idx ON toilets (city);
CREATE INDEX IF NOT EXISTS toilets_status_idx ON toilets (status);
`;

let ready: Promise<void> | null = null;

async function init() {
  if (!process.env.DATABASE_URL?.startsWith("libsql://")) {
    await mkdir(path.join(process.cwd(), "data"), { recursive: true });
  }

  for (const statement of CREATE_SQL.split(";").map((part) => part.trim()).filter(Boolean)) {
    await dbClient.execute(statement);
  }

  const columns = await dbClient.execute("PRAGMA table_info(toilets)");
  const names = new Set(columns.rows.map((row) => String(row.name)));
  if (!names.has("photo")) {
    await dbClient.execute("ALTER TABLE toilets ADD COLUMN photo TEXT");
  }
  if (!names.has("price")) {
    await dbClient.execute("ALTER TABLE toilets ADD COLUMN price TEXT");
  }

  const existing = await db.select({ id: toilets.id }).from(toilets).limit(1);
  if (existing.length > 0) return;

  const now = new Date();
  const rows = (seedToilets as Toilet[]).map((toilet) => ({
    id: toilet.id,
    name: toilet.name,
    lat: toilet.lat,
    lng: toilet.lng,
    city: toilet.city,
    county: toilet.county,
    address: toilet.address ?? null,
    hours: toilet.hours ?? null,
    price: toilet.price ?? null,
    accessible: toilet.accessible,
    free: toilet.free,
    type: toilet.type,
    status: toilet.status,
    notes: toilet.notes ?? null,
    source: toilet.source ?? "schelet",
    createdAt: now,
    updatedAt: now,
  }));

  if (rows.length) await db.insert(toilets).values(rows);
}

export function ensureDb() {
  if (!ready) ready = init();
  return ready;
}
