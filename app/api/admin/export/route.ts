import { csvResponse, toCsv } from "@/lib/export-csv";
import { foiaTracking } from "@/lib/foia";
import {
  institutionResponseLabels,
  requestStatusLabels,
} from "@/lib/desk";
import { overdueInstitutions, listReplies, listRequests } from "@/lib/supabase/correspondence";
import { listInstitutions } from "@/lib/supabase/desk";

function param(url: URL, name: string) {
  return url.searchParams.get(name)?.trim() ?? "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = param(url, "type") || "institutions";
  const county = param(url, "county");

  const [institutions, requests, replies, overdue] = await Promise.all([
    listInstitutions(),
    listRequests().catch(() => []),
    listReplies().catch(() => []),
    overdueInstitutions().catch(() => []),
  ]);

  const filtered = institutions.filter((item) => {
    if (county && item.county !== county) return false;
    if (param(url, "email") === "none" && item.email) return false;
    if (param(url, "email") === "yes" && !item.email) return false;
    if (param(url, "request") && item.requestStatus !== param(url, "request")) return false;
    if (param(url, "response") && item.responseStatus !== param(url, "response")) return false;
    return true;
  });

  if (kind === "institutions" || kind === "no-email") {
    const rows = (kind === "no-email" ? filtered.filter((item) => !item.email) : filtered).map((item) => [
      item.name,
      item.county,
      item.city,
      item.email,
      item.website,
      requestStatusLabels[item.requestStatus],
      institutionResponseLabels[item.responseStatus],
      item.lastEmailedAt ?? "",
      item.respondedAt ?? "",
      item.notes,
    ]);
    return csvResponse(
      kind === "no-email" ? "institutii-fara-email.csv" : "institutii.csv",
      toCsv(
        ["Instituție", "Județ", "Localitate", "E-mail", "Website", "Solicitare", "Răspuns", "Trimis", "Răspuns la", "Note"],
        rows,
      ),
    );
  }

  if (kind === "requests") {
    return csvResponse(
      "solicitari.csv",
      toCsv(
        ["Instituție", "Canal", "Subiect", "Status", "Trimis", "Termen", "Nr."],
        requests.map((item) => {
          const inst = institutions.find((row) => row.id === item.institutionId);
          return [
            inst?.name ?? item.institutionId,
            item.channel,
            item.subject,
            requestStatusLabels[item.status],
            item.sentAt ?? "",
            item.dueAt ?? "",
            item.registrationNumber,
          ];
        }),
      ),
    );
  }

  if (kind === "replies") {
    return csvResponse(
      "raspunsuri.csv",
      toCsv(
        ["Instituție", "Tip", "Procesare", "Data", "Nr.", "Rezumat"],
        replies.map((item) => {
          const inst = institutions.find((row) => row.id === item.institutionId);
          return [
            inst?.name ?? item.institutionId,
            institutionResponseLabels[item.responseType],
            item.processing,
            item.receivedAt ?? "",
            item.registrationNumber,
            item.summary,
          ];
        }),
      ),
    );
  }

  if (kind === "counties") {
    const map = new Map<string, { total: number; sent: number; answered: number }>();
    for (const item of filtered) {
      const key = item.county || "—";
      const row = map.get(key) ?? { total: 0, sent: 0, answered: 0 };
      row.total += 1;
      if (item.lastEmailedAt) row.sent += 1;
      if (item.responseStatus !== "fara_raspuns") row.answered += 1;
      map.set(key, row);
    }
    return csvResponse(
      "judete.csv",
      toCsv(
        ["Județ", "Instituții", "Trimise", "Cu răspuns"],
        [...map.entries()].map(([name, row]) => [
          name,
          String(row.total),
          String(row.sent),
          String(row.answered),
        ]),
      ),
    );
  }

  if (kind === "overdue") {
    return csvResponse(
      "termene-depasite.csv",
      toCsv(
        ["Instituție", "Județ", "Trimis", "Termen", "Zile"],
        overdue.map((item) => {
          const track = foiaTracking(item.lastEmailedAt);
          return [
            item.name,
            item.county,
            item.lastEmailedAt ?? "",
            track.dueAt ?? "",
            String(track.overdueDays ?? ""),
          ];
        }),
      ),
    );
  }

  return new Response("Tip necunoscut.", { status: 400 });
}
