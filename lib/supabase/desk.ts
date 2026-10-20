import { DEFAULT_TEMPLATE } from "@/lib/mail/template";
import { isEmail } from "@/lib/mail/validate";
import type {
  Institution,
  InstitutionKind,
  InstitutionResponse,
  MailOutboxRow,
  MailTemplate,
} from "@/lib/desk";
import { createSupabaseAdminClient } from "./admin";

type InstitutionRow = {
  id: string;
  name: string;
  kind: string;
  county: string | null;
  city: string | null;
  email: string | null;
  response_status: string;
  toilets_summary: string | null;
  notes: string | null;
  requested_at: string | null;
  responded_at: string | null;
  last_emailed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TemplateRow = {
  id: string;
  name: string;
  subject: string;
  body: string;
  updated_at: string;
};

type OutboxRow = {
  id: string;
  institution_id: string | null;
  to_email: string;
  subject: string;
  template_id: string | null;
  created_at: string;
};

function throwIfError(error: { message: string; code?: string } | null, table: string) {
  if (!error) return;
  const message = error.message || "";
  if (message.includes("schema cache") || message.includes("PGRST205") || error.code === "PGRST205") {
    throw new Error(`Tabela ${table} lipsește în Supabase. Rulează supabase/schema.sql.`);
  }
  throw new Error(message);
}

function rowToInstitution(row: InstitutionRow): Institution {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as InstitutionKind,
    county: row.county ?? "",
    city: row.city ?? "",
    email: row.email ?? "",
    responseStatus: row.response_status as InstitutionResponse,
    toiletsSummary: row.toilets_summary ?? "",
    notes: row.notes ?? "",
    requestedAt: row.requested_at,
    respondedAt: row.responded_at,
    lastEmailedAt: row.last_emailed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type InstitutionWrite = {
  id: string;
  name: string;
  kind: InstitutionKind;
  county?: string | null;
  city?: string | null;
  email?: string | null;
  responseStatus: InstitutionResponse;
  toiletsSummary?: string | null;
  notes?: string | null;
  requestedAt?: string | null;
  respondedAt?: string | null;
  lastEmailedAt?: string | null;
};

function writeInstitution(input: Partial<InstitutionWrite>) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.id !== undefined) row.id = input.id;
  if (input.name !== undefined) row.name = input.name;
  if (input.kind !== undefined) row.kind = input.kind;
  if ("county" in input) row.county = input.county || null;
  if ("city" in input) row.city = input.city || null;
  if ("email" in input) row.email = input.email || null;
  if (input.responseStatus !== undefined) row.response_status = input.responseStatus;
  if ("toiletsSummary" in input) row.toilets_summary = input.toiletsSummary || null;
  if ("notes" in input) row.notes = input.notes || null;
  if ("requestedAt" in input) row.requested_at = input.requestedAt || null;
  if ("respondedAt" in input) row.responded_at = input.respondedAt || null;
  if ("lastEmailedAt" in input) row.last_emailed_at = input.lastEmailedAt || null;
  return row;
}

export async function listInstitutions() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("institutions")
    .select("*")
    .order("updated_at", { ascending: false });
  throwIfError(error, "institutions");
  return ((data ?? []) as InstitutionRow[]).map(rowToInstitution);
}

export async function getInstitution(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("institutions").select("*").eq("id", id).maybeSingle();
  throwIfError(error, "institutions");
  return data ? rowToInstitution(data as InstitutionRow) : null;
}

export async function createInstitution(input: InstitutionWrite) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("institutions").insert(writeInstitution(input));
  throwIfError(error, "institutions");
  return getInstitution(input.id);
}

export async function updateInstitution(id: string, patch: Partial<InstitutionWrite>) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("institutions").update(writeInstitution(patch)).eq("id", id);
  throwIfError(error, "institutions");
  return getInstitution(id);
}

export async function deleteInstitution(id: string) {
  const existing = await getInstitution(id);
  if (!existing) return null;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("institutions").delete().eq("id", id);
  throwIfError(error, "institutions");
  return existing;
}

export type InstitutionSeed = {
  id: string;
  name: string;
  kind: InstitutionKind;
  county?: string;
  city?: string;
  email?: string;
  notes?: string;
};

export async function importInstitutions(seed: InstitutionSeed[]) {
  const existing = await listInstitutions();
  const byId = new Map(existing.map((item) => [item.id, item]));
  const emails = new Set(
    existing.map((item) => item.email.trim().toLowerCase()).filter(Boolean),
  );

  const supabase = createSupabaseAdminClient();
  const toInsert: Record<string, unknown>[] = [];
  let updated = 0;
  let skipped = 0;

  for (const item of seed) {
    const emailRaw = item.email?.trim().toLowerCase() || "";
    const email = emailRaw && isEmail(emailRaw) ? emailRaw : "";
    const have = byId.get(item.id);
    if (have) {
      const patch: Partial<InstitutionWrite> = {};
      if (!have.email && email) patch.email = email;
      if (!have.city && item.city) patch.city = item.city;
      if (!have.county && item.county) patch.county = item.county;
      if (!have.notes && item.notes) patch.notes = item.notes;
      if (Object.keys(patch).length) {
        await updateInstitution(item.id, patch);
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }
    if (email && emails.has(email)) {
      skipped += 1;
      continue;
    }
    toInsert.push({
      id: item.id,
      name: item.name,
      kind: item.kind,
      county: item.county || null,
      city: item.city || null,
      email: email || null,
      response_status: "fara_raspuns",
      notes: item.notes || null,
    });
    if (email) emails.add(email);
  }

  if (toInsert.length) {
    const { error } = await supabase.from("institutions").insert(toInsert);
    throwIfError(error, "institutions");
  }

  return { added: toInsert.length, updated, skipped, total: seed.length };
}

function rowToTemplate(row: TemplateRow): MailTemplate {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    body: row.body,
    updatedAt: row.updated_at,
  };
}

const LEGACY_TEMPLATE_SUBJECTS = new Set([
  "Cerere de informații de interes public — toalete publice (Legea 544/2001)",
]);

export async function ensureDefaultTemplate() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mail_templates")
    .select("*")
    .eq("id", DEFAULT_TEMPLATE.id)
    .maybeSingle();
  throwIfError(error, "mail_templates");

  const existing = data ? rowToTemplate(data as TemplateRow) : null;
  const shouldReplace =
    !existing ||
    LEGACY_TEMPLATE_SUBJECTS.has(existing.subject) ||
    existing.body.includes("{{solicitant_nume}}");

  if (existing && !shouldReplace) return existing;

  const { error: upsertError } = await supabase.from("mail_templates").upsert({
    id: DEFAULT_TEMPLATE.id,
    name: DEFAULT_TEMPLATE.name,
    subject: DEFAULT_TEMPLATE.subject,
    body: DEFAULT_TEMPLATE.body,
    updated_at: new Date().toISOString(),
  });
  throwIfError(upsertError, "mail_templates");
  const { data: saved, error: readError } = await supabase
    .from("mail_templates")
    .select("*")
    .eq("id", DEFAULT_TEMPLATE.id)
    .maybeSingle();
  throwIfError(readError, "mail_templates");
  return saved ? rowToTemplate(saved as TemplateRow) : null;
}

export async function listTemplates() {
  await ensureDefaultTemplate();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("mail_templates").select("*").order("name");
  throwIfError(error, "mail_templates");
  return ((data ?? []) as TemplateRow[]).map(rowToTemplate);
}

export async function getTemplate(id: string) {
  if (id === DEFAULT_TEMPLATE.id) return ensureDefaultTemplate();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("mail_templates").select("*").eq("id", id).maybeSingle();
  throwIfError(error, "mail_templates");
  return data ? rowToTemplate(data as TemplateRow) : null;
}

export async function updateTemplate(id: string, patch: { name?: string; subject?: string; body?: string }) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("mail_templates")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  throwIfError(error, "mail_templates");
  return getTemplate(id);
}

export async function logMail(input: {
  id: string;
  institutionId?: string | null;
  toEmail: string;
  subject: string;
  templateId?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("mail_outbox").insert({
    id: input.id,
    institution_id: input.institutionId || null,
    to_email: input.toEmail,
    subject: input.subject,
    template_id: input.templateId || null,
  });
  throwIfError(error, "mail_outbox");
}

export async function listOutbox(limit = 30) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mail_outbox")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  throwIfError(error, "mail_outbox");
  return ((data ?? []) as OutboxRow[]).map(
    (row): MailOutboxRow => ({
      id: row.id,
      institutionId: row.institution_id,
      toEmail: row.to_email,
      subject: row.subject,
      templateId: row.template_id,
      createdAt: row.created_at,
    }),
  );
}
