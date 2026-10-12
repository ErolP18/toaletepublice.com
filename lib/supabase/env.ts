export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function supabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
}

export function supabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && (supabasePublishableKey() || supabaseSecretKey()));
}

export function isSupabaseBrowserConfigured() {
  return Boolean(supabaseUrl() && supabasePublishableKey());
}
