import type { Toilet, ToiletStatus } from "@/lib/types";
import { createSupabaseAdminClient } from "./admin";

type ToiletRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  county: string;
  address: string | null;
  hours: string | null;
  photo: string | null;
  price: string | null;
  accessible: boolean;
  free: boolean;
  type: string;
  status: string;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export type ToiletWrite = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  county: string;
  address?: string | null;
  hours?: string | null;
  photo?: string | null;
  price?: string | null;
  accessible: boolean;
  free: boolean;
  type: string;
  status: string;
  notes?: string | null;
  source?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function rowToToilet(row: ToiletRow): Toilet {
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

function writeToRow(input: Partial<ToiletWrite>) {
  const row: Record<string, unknown> = {};
  if (input.id !== undefined) row.id = input.id;
  if (input.name !== undefined) row.name = input.name;
  if (input.lat !== undefined) row.lat = input.lat;
  if (input.lng !== undefined) row.lng = input.lng;
  if (input.city !== undefined) row.city = input.city;
  if (input.county !== undefined) row.county = input.county;
  if (input.address !== undefined) row.address = input.address || null;
  if (input.hours !== undefined) row.hours = input.hours || null;
  if ("photo" in input) row.photo = input.photo || null;
  if ("price" in input) row.price = input.price || null;
  if (input.accessible !== undefined) row.accessible = input.accessible;
  if (input.free !== undefined) row.free = input.free;
  if (input.type !== undefined) row.type = input.type;
  if (input.status !== undefined) row.status = input.status;
  if (input.notes !== undefined) row.notes = input.notes || null;
  if (input.source !== undefined) row.source = input.source || null;
  row.updated_at = (input.updatedAt ?? new Date()).toISOString();
  if (input.createdAt) row.created_at = input.createdAt.toISOString();
  return row;
}

function throwIfError(error: { message: string } | null) {
  if (!error) return;
  throw new Error(error.message);
}

export async function supabaseListPublic() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("toilets")
    .select("*")
    .neq("status", "propunere")
    .order("city")
    .order("name");
  throwIfError(error);
  return ((data ?? []) as ToiletRow[]).map(rowToToilet);
}

export async function supabaseListAll() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("toilets")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("city")
    .order("name");
  throwIfError(error);
  return ((data ?? []) as ToiletRow[]).map(rowToToilet);
}

export async function supabaseGet(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("toilets").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return data ? rowToToilet(data as ToiletRow) : null;
}

export async function supabaseCreate(input: ToiletWrite) {
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const { error } = await supabase.from("toilets").insert(
    writeToRow({
      ...input,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    }),
  );
  throwIfError(error);
  return supabaseGet(input.id);
}

export async function supabaseUpdate(id: string, patch: Partial<ToiletWrite>) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("toilets").update(writeToRow(patch)).eq("id", id);
  throwIfError(error);
  return supabaseGet(id);
}

export async function supabaseDelete(id: string) {
  const existing = await supabaseGet(id);
  if (!existing) return null;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("toilets").delete().eq("id", id);
  throwIfError(error);
  return existing;
}

export async function supabaseCount() {
  const supabase = createSupabaseAdminClient();
  const { count, error, status } = await supabase
    .from("toilets")
    .select("id", { count: "exact", head: true });
  throwIfError(error);
  if (status === 404) throw new Error("Could not find the table 'public.toilets' in the schema cache");
  return count ?? 0;
}

export type { ToiletStatus };
