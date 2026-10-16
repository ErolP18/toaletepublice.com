import { toiletStatuses, toiletTypes, type Toilet, type ToiletStatus } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  supabaseCreate,
  supabaseDelete,
  supabaseGet,
  supabaseListAll,
  supabaseListPublic,
  supabaseUpdate,
  type ToiletWrite,
} from "@/lib/supabase/toilets";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase nu e configurat. Setează URL-ul și cheile în mediu.");
  }
}

async function fromSupabase<T>(work: () => Promise<T>) {
  requireSupabase();
  try {
    return await work();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("schema cache") || message.includes("PGRST205")) {
      throw new Error("Tabela toilets lipsește în Supabase. Rulează supabase/schema.sql.");
    }
    throw error;
  }
}

export async function listPublicToilets() {
  return fromSupabase(supabaseListPublic);
}

export async function listAllToilets() {
  return fromSupabase(supabaseListAll);
}

export async function getToilet(id: string) {
  return fromSupabase(() => supabaseGet(id));
}

export async function createToilet(input: ToiletWrite) {
  return fromSupabase(() => supabaseCreate(input));
}

export async function updateToilet(id: string, patch: Partial<ToiletWrite>) {
  return fromSupabase(() => supabaseUpdate(id, patch));
}

export async function deleteToilet(id: string) {
  return fromSupabase(() => supabaseDelete(id));
}

export function isToiletType(value: unknown): value is Toilet["type"] {
  return typeof value === "string" && (toiletTypes as readonly string[]).includes(value);
}

export function isToiletStatus(value: unknown): value is ToiletStatus {
  return typeof value === "string" && (toiletStatuses as readonly string[]).includes(value);
}
