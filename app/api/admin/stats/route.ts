import { NextResponse } from "next/server";
import { getAdminStats } from "@/lib/admin-stats";
import { overdueInstitutions, listReplies } from "@/lib/supabase/correspondence";
import { listInstitutions } from "@/lib/supabase/desk";

export async function GET() {
  try {
    const [stats, overdue, institutions, replies] = await Promise.all([
      getAdminStats(),
      overdueInstitutions().catch(() => []),
      listInstitutions(),
      listReplies().catch(() => []),
    ]);
    return NextResponse.json({
      stats,
      attention: {
        overdue: overdue.map((item) => ({ id: item.id, name: item.name, county: item.county })),
        clarification: institutions
          .filter((item) => item.responseStatus === "incomplet" || item.requestStatus === "necesita_revenire")
          .map((item) => ({ id: item.id, name: item.name, county: item.county })),
        errors: institutions
          .filter((item) => item.requestStatus === "eroare")
          .map((item) => ({ id: item.id, name: item.name, county: item.county })),
        noContact: institutions
          .filter((item) => !item.email)
          .slice(0, 40)
          .map((item) => ({ id: item.id, name: item.name, county: item.county })),
        unprocessed: replies
          .filter((item) => item.processing === "neprocesat")
          .map((item) => ({
            id: item.institutionId,
            name: institutions.find((row) => row.id === item.institutionId)?.name || item.institutionId,
            replyId: item.id,
          })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut citi statisticile.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
