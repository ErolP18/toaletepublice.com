import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseSecretKey, supabaseUrl } from "./env";

export function createSupabaseAdminClient() {
  const url = supabaseUrl();
  const key = supabaseSecretKey() || supabasePublishableKey();
  if (!url || !key) {
    throw new Error("Supabase nu e configurat. Setează URL-ul și cheile în mediu.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
