import { DEFAULT_TEMPLATE, EXTRA_TEMPLATES } from "@/lib/mail/template";
import { isEmail } from "@/lib/mail/validate";
import type {
  Institution,
  InstitutionKind,
  InstitutionResponse,
  MailOutboxRow,
  MailTemplate,
  OutboxStatus,
  RequestStatus,
  SendChannel,
} from "@/lib/desk";
import { deriveRequestStatus } from "@/lib/desk";
import { createSupabaseAdminClient } from "./admin";

type InstitutionRow = {
  id: string;
  name: string;
  kind: string;
  county: string | null;
  city: string | null;
  email: string | null;
  website: string | null;
  response_status: string;
  request_status: string | null;
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
  status?: string | null;
  error?: string | null;
  message_id?: string | null;
  channel?: string | null;
  request_id?: string | null;
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
    website: row.website ?? "",
    responseStatus: row.response_status as InstitutionResponse,
    requestStatus: deriveRequestStatus({
      requestStatus: row.request_status,
      lastEmailedAt: row.last_emailed_at,
      responseStatus: row.response_status,
    }),
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
  website?: string | null;
  requestStatus?: RequestStatus;
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
  if ("website" in input) row.website = input.website || null;
  if (input.responseStatus !== undefined) row.response_status = input.responseStatus;
  if (input.requestStatus !== undefined) row.request_status = input.requestStatus;
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

function isMissingColumn(error: { message: string } | null, column: string) {
  const message = error?.message || "";
  return message.includes(column) || message.includes("schema cache");
}

async function writeInstitutionRow(
  action: "insert" | "update",
  row: Record<string, unknown>,
  id?: string,
) {
  const supabase = createSupabaseAdminClient();
  const first =
    action === "insert"
      ? await supabase.from("institutions").insert(row)
      : await supabase.from("institutions").update(row).eq("id", id);
  if (!first.error) return;
  if (isMissingColumn(first.error, "request_status") || isMissingColumn(first.error, "website")) {
    const fallback = { ...row };
    delete fallback.request_status;
    delete fallback.website;
    const retry =
      action === "insert"
        ? await supabase.from("institutions").insert(fallback)
        : await supabase.from("institutions").update(fallback).eq("id", id);
    throwIfError(retry.error, "institutions");
    return;
  }
  throwIfError(first.error, "institutions");
}

export async function createInstitution(input: InstitutionWrite) {
  await writeInstitutionRow("insert", writeInstitution(input));
  return getInstitution(input.id);
}

export async function updateInstitution(id: string, patch: Partial<InstitutionWrite>) {
  await writeInstitutionRow("update", writeInstitution(patch), id);
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

export async function ensureExtraTemplates() {
  const supabase = createSupabaseAdminClient();
  for (const template of EXTRA_TEMPLATES) {
    const { data, error } = await supabase.from("mail_templates").select("id").eq("id", template.id).maybeSingle();
    throwIfError(error, "mail_templates");
    if (data) continue;
    const subject = template.subject || "Solicitare — toaletepublice.com";
    const { error: insertError } = await supabase.from("mail_templates").insert({
      id: template.id,
      name: template.name,
      subject,
      body: template.body,
    });
    throwIfError(insertError, "mail_templates");
  }
}

export async function listTemplates() {
  await ensureDefaultTemplate();
  await ensureExtraTemplates();
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
  status?: OutboxStatus;
  error?: string | null;
  messageId?: string | null;
  channel?: SendChannel;
  requestId?: string | null;
  bodyPreview?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const full = {
    id: input.id,
    institution_id: input.institutionId || null,
    to_email: input.toEmail,
    subject: input.subject,
    template_id: input.templateId || null,
    status: input.status || "accepted",
    error: input.error || null,
    message_id: input.messageId || null,
    channel: input.channel || "smtp",
    request_id: input.requestId || null,
    body_preview: input.bodyPreview?.slice(0, 400) || null,
  };
  const { error } = await supabase.from("mail_outbox").insert(full);
  if (!error) return;
  const fallback = {
    id: full.id,
    institution_id: full.institution_id,
    to_email: full.to_email,
    subject: full.subject,
    template_id: full.template_id,
  };
  const retry = await supabase.from("mail_outbox").insert(fallback);
  throwIfError(retry.error, "mail_outbox");
}

export async function listOutbox(limit = 80) {
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
      status: (row.status as OutboxStatus) || "accepted",
      error: row.error ?? "",
      messageId: row.message_id ?? "",
      channel: (row.channel as SendChannel) || "smtp",
      requestId: row.request_id ?? null,
    }),
  );
}
