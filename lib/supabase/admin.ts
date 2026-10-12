import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseSecretKey, supabaseUrl } from "./env";

export function createSupabaseAdminClient() {
  const key = supabaseSecretKey() || supabasePublishableKey();
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
