import { deriveRequestStatus, wasSent, type AdminStats } from "@/lib/desk";
import { listInstitutions } from "@/lib/supabase/desk";
import { overdueInstitutions, listReplies } from "@/lib/supabase/correspondence";
import { supabaseListAll } from "@/lib/supabase/toilets";

async function optional<T>(task: Promise<T>, fallback: T) {
  try {
    return await task;
  } catch {
    return fallback;
  }
}

export async function getAdminStats(): Promise<AdminStats> {
  const [institutions, toilets, replies, overdue] = await Promise.all([
    listInstitutions(),
    supabaseListAll(),
    optional(listReplies(), []),
    optional(overdueInstitutions(), []),
  ]);

  return {
    institutions: institutions.length,
    withEmail: institutions.filter((item) => item.email).length,
    withoutEmail: institutions.filter((item) => !item.email).length,
    sent: institutions.filter((item) => wasSent(deriveRequestStatus(item))).length,
    unsent: institutions.filter((item) => !wasSent(deriveRequestStatus(item))).length,
    waiting: institutions.filter((item) => item.responseStatus === "fara_raspuns").length,
    answered: institutions.filter((item) => item.responseStatus !== "fara_raspuns").length,
    administers: institutions.filter((item) => item.responseStatus === "administreaza").length,
    doesNot: institutions.filter((item) => item.responseStatus === "nu_administreaza").length,
    toiletsConfirmed: toilets.filter((item) => item.status === "confirmat").length,
    toiletsUnconfirmed: toilets.filter((item) => item.status !== "confirmat").length,
    overdue: overdue.length,
    needsClarification: institutions.filter(
      (item) => item.responseStatus === "incomplet" || item.requestStatus === "necesita_revenire",
    ).length,
    sendErrors: institutions.filter((item) => item.requestStatus === "eroare").length,
    unprocessedReplies: replies.filter((item) => item.processing === "neprocesat").length,
  };
}
