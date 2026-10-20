import { createSupabaseAdminClient } from "./admin";

function throwIfError(error: { message: string; code?: string } | null) {
  if (!error) return;
  const message = error.message || "";
  if (message.includes("schema cache") || message.includes("PGRST205") || error.code === "PGRST205") {
    throw new Error("Tabela admin_magic_links lipsește în Supabase. Rulează supabase/schema.sql.");
  }
  throw new Error(message);
}

export async function storeMagicNonce(nonce: string, exp: number) {
  const supabase = createSupabaseAdminClient();
  const { error: clearError } = await supabase
    .from("admin_magic_links")
    .delete()
    .is("used_at", null);
  throwIfError(clearError);
  const { error } = await supabase.from("admin_magic_links").insert({
    nonce,
    expires_at: new Date(exp * 1000).toISOString(),
  });
  throwIfError(error);
}

export async function consumeMagicNonce(nonce: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_magic_links")
    .update({ used_at: new Date().toISOString() })
    .eq("nonce", nonce)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("nonce")
    .maybeSingle();
  throwIfError(error);
  return Boolean(data);
}
