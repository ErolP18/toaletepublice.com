import { createClient } from "@supabase/supabase-js";
import seedToilets from "../data/toilets.json";
import type { Toilet } from "../lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!url || !key) {
  console.error("Lipsește NEXT_PUBLIC_SUPABASE_URL sau cheia.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const now = new Date().toISOString();
const rows = (seedToilets as Toilet[]).map((toilet) => ({
  id: toilet.id,
  name: toilet.name,
  lat: toilet.lat,
  lng: toilet.lng,
  city: toilet.city,
  county: toilet.county,
  address: toilet.address ?? null,
  hours: toilet.hours ?? null,
  photo: toilet.photo ?? null,
  price: toilet.price ?? null,
  accessible: toilet.accessible,
  free: toilet.free,
  type: toilet.type,
  status: toilet.status,
  notes: toilet.notes ?? null,
  source: toilet.source ?? "schelet",
  created_at: now,
  updated_at: now,
}));

async function main() {
  const { error } = await supabase.from("toilets").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`Salvate ${rows.length} toalete în Supabase.`);
}

main();
