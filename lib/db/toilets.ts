import { desc, eq, ne } from "drizzle-orm";
import { toiletStatuses, toiletTypes, type Toilet, type ToiletStatus } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  supabaseCount,
  supabaseCreate,
  supabaseDelete,
  supabaseGet,
  supabaseListAll,
  supabaseListPublic,
  supabaseUpdate,
  type ToiletWrite,
} from "@/lib/supabase/toilets";
import { db } from "./index";
import { toilets, type ToiletInsert, type ToiletRow } from "./schema";

export function rowToToilet(row: ToiletRow): Toilet {
  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    city: row.city,
    county: row.county,
    address: row.address ?? undefined,
    hours: row.hours ?? undefined,
    photo: row.photo ?? undefined,
    price: row.price ?? undefined,
    accessible: row.accessible,
    free: row.free,
    type: row.type as Toilet["type"],
    status: row.status as Toilet["status"],
    notes: row.notes ?? undefined,
    source: row.source ?? undefined,
  };
}

function isMissingTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("schema cache") || message.includes("PGRST205");
}

async function supabaseOrLocal<T>(remote: () => Promise<T>, local: () => Promise<T>) {
  if (!isSupabaseConfigured()) return local();
  try {
    return await remote();
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    return local();
  }
}

export async function listPublicToilets() {
  return supabaseOrLocal(supabaseListPublic, async () => {
    const rows = await db
      .select()
      .from(toilets)
      .where(ne(toilets.status, "propunere"))
      .orderBy(toilets.city, toilets.name);
    return rows.map(rowToToilet);
  });
}

export async function listAllToilets() {
  return supabaseOrLocal(supabaseListAll, async () => {
    const rows = await db
      .select()
      .from(toilets)
      .orderBy(desc(toilets.updatedAt), toilets.city, toilets.name);
    return rows.map(rowToToilet);
  });
}

export async function getToilet(id: string) {
  return supabaseOrLocal(
    () => supabaseGet(id),
    async () => {
      const rows = await db.select().from(toilets).where(eq(toilets.id, id)).limit(1);
      return rows[0] ? rowToToilet(rows[0]) : null;
    },
  );
}

export async function createToilet(input: ToiletInsert | ToiletWrite) {
  return supabaseOrLocal(
    () => supabaseCreate(input as ToiletWrite),
    async () => {
      await db.insert(toilets).values(input as ToiletInsert);
      return getToilet(input.id);
    },
  );
}

export async function updateToilet(id: string, patch: Partial<ToiletInsert> | Partial<ToiletWrite>) {
  return supabaseOrLocal(
    () => supabaseUpdate(id, patch),
    async () => {
      await db
        .update(toilets)
        .set({ ...patch, updatedAt: new Date() } as Partial<ToiletInsert>)
        .where(eq(toilets.id, id));
      return getToilet(id);
    },
  );
}

export async function deleteToilet(id: string) {
  return supabaseOrLocal(
    () => supabaseDelete(id),
    async () => {
      const existing = await getToilet(id);
      if (!existing) return null;
      await db.delete(toilets).where(eq(toilets.id, id));
      return existing;
    },
  );
}

export async function countToilets() {
  return supabaseOrLocal(supabaseCount, async () => {
    const rows = await db.select({ id: toilets.id }).from(toilets);
    return rows.length;
  });
}

export function isToiletType(value: unknown): value is Toilet["type"] {
  return typeof value === "string" && (toiletTypes as readonly string[]).includes(value);
}

export function isToiletStatus(value: unknown): value is ToiletStatus {
  return typeof value === "string" && (toiletStatuses as readonly string[]).includes(value);
}
