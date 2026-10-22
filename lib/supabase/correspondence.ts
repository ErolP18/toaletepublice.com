import { foiaDueAt } from "@/lib/foia";
import type {
  CorrespondenceEvent,
  CorrespondenceFile,
  CorrespondenceReply,
  CorrespondenceRequest,
  InstitutionResponse,
  OutboxStatus,
  ReplyProcessing,
  RequestStatus,
  SendChannel,
} from "@/lib/desk";
import { deriveRequestStatus } from "@/lib/desk";
import { createSupabaseAdminClient } from "./admin";
import { getInstitution, listInstitutions, updateInstitution } from "./desk";

function throwIfError(error: { message: string; code?: string } | null, table: string) {
  if (!error) return;
  const message = error.message || "";
  if (message.includes("schema cache") || message.includes("PGRST205") || error.code === "PGRST205") {
    throw new Error(`Tabela ${table} lipsește în Supabase. Rulează supabase/schema.sql.`);
  }
  throw new Error(message);
}

type RequestRow = {
  id: string;
  institution_id: string;
  channel: string;
  template_id: string | null;
  subject: string | null;
  body: string | null;
  to_email: string | null;
  status: string;
  sent_at: string | null;
  due_at: string | null;
  extended_until: string | null;
  registration_number: string | null;
  notes: string | null;
  outbox_id: string | null;
  created_at: string;
  updated_at: string;
};

function rowToRequest(row: RequestRow): CorrespondenceRequest {
  return {
    id: row.id,
    institutionId: row.institution_id,
    channel: row.channel as SendChannel,
    templateId: row.template_id ?? "",
    subject: row.subject ?? "",
    body: row.body ?? "",
    toEmail: row.to_email ?? "",
    status: row.status as RequestStatus,
    sentAt: row.sent_at,
    dueAt: row.due_at,
    extendedUntil: row.extended_until,
    registrationNumber: row.registration_number ?? "",
    notes: row.notes ?? "",
    outboxId: row.outbox_id ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRequests(institutionId?: string) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("correspondence_requests").select("*").order("created_at", { ascending: false });
  if (institutionId) query = query.eq("institution_id", institutionId);
  const { data, error } = await query;
  throwIfError(error, "correspondence_requests");
  return ((data ?? []) as RequestRow[]).map(rowToRequest);
}

export async function getRequest(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("correspondence_requests").select("*").eq("id", id).maybeSingle();
  throwIfError(error, "correspondence_requests");
  return data ? rowToRequest(data as RequestRow) : null;
}

export async function createRequest(input: {
  id?: string;
  institutionId: string;
  channel: SendChannel;
  templateId?: string;
  subject?: string;
  body?: string;
  toEmail?: string;
  status: RequestStatus;
  sentAt?: string | null;
  dueAt?: string | null;
  extendedUntil?: string | null;
  registrationNumber?: string;
  notes?: string;
  outboxId?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const id = input.id || crypto.randomUUID();
  const { error } = await supabase.from("correspondence_requests").insert({
    id,
    institution_id: input.institutionId,
    channel: input.channel,
    template_id: input.templateId || null,
    subject: input.subject || null,
    body: input.body || null,
    to_email: input.toEmail || null,
    status: input.status,
    sent_at: input.sentAt || null,
    due_at: input.dueAt || null,
    extended_until: input.extendedUntil || null,
    registration_number: input.registrationNumber || null,
    notes: input.notes || null,
    outbox_id: input.outboxId || null,
  });
  throwIfError(error, "correspondence_requests");
  return getRequest(id);
}

export async function updateRequest(id: string, patch: Partial<CorrespondenceRequest>) {
  const supabase = createSupabaseAdminClient();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) row.status = patch.status;
  if ("subject" in patch) row.subject = patch.subject || null;
  if ("body" in patch) row.body = patch.body || null;
  if ("toEmail" in patch) row.to_email = patch.toEmail || null;
  if ("sentAt" in patch) row.sent_at = patch.sentAt || null;
  if ("dueAt" in patch) row.due_at = patch.dueAt || null;
  if ("extendedUntil" in patch) row.extended_until = patch.extendedUntil || null;
  if ("registrationNumber" in patch) row.registration_number = patch.registrationNumber || null;
  if ("notes" in patch) row.notes = patch.notes || null;
  if ("outboxId" in patch) row.outbox_id = patch.outboxId || null;
  if ("channel" in patch) row.channel = patch.channel;
  const { error } = await supabase.from("correspondence_requests").update(row).eq("id", id);
  throwIfError(error, "correspondence_requests");
  return getRequest(id);
}

export async function logEvent(input: {
  institutionId: string;
  requestId?: string | null;
  kind: string;
  detail: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("correspondence_events").insert({
    id: crypto.randomUUID(),
    institution_id: input.institutionId,
    request_id: input.requestId || null,
    kind: input.kind,
    detail: input.detail.slice(0, 2000),
  });
  throwIfError(error, "correspondence_events");
}

export async function listEvents(institutionId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("correspondence_events")
    .select("*")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false })
    .limit(80);
  throwIfError(error, "correspondence_events");
  return ((data ?? []) as Array<{
    id: string;
    institution_id: string;
    request_id: string | null;
    kind: string;
    detail: string | null;
    created_at: string;
  }>).map(
    (row): CorrespondenceEvent => ({
      id: row.id,
      institutionId: row.institution_id,
      requestId: row.request_id,
      kind: row.kind,
      detail: row.detail ?? "",
      createdAt: row.created_at,
    }),
  );
}

type ReplyRow = {
  id: string;
  institution_id: string;
  request_id: string | null;
  received_at: string | null;
  registration_number: string | null;
  response_type: string;
  summary: string | null;
  notes: string | null;
  processing: string;
  created_at: string;
  updated_at: string;
};

function rowToReply(row: ReplyRow, files: CorrespondenceFile[] = []): CorrespondenceReply {
  return {
    id: row.id,
    institutionId: row.institution_id,
    requestId: row.request_id,
    receivedAt: row.received_at,
    registrationNumber: row.registration_number ?? "",
    responseType: row.response_type as InstitutionResponse,
    summary: row.summary ?? "",
    notes: row.notes ?? "",
    processing: row.processing as ReplyProcessing,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    files,
  };
}

export async function listFiles(replyIds: string[]) {
  if (!replyIds.length) return [] as Array<CorrespondenceFile & { storageKey: string }>;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("correspondence_files").select("*").in("reply_id", replyIds);
  throwIfError(error, "correspondence_files");
  return ((data ?? []) as Array<{
    id: string;
    reply_id: string;
    filename: string;
    mime: string;
    byte_size: number;
    storage_key: string;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    replyId: row.reply_id,
    filename: row.filename,
    mime: row.mime,
    byteSize: row.byte_size,
    storageKey: row.storage_key,
    createdAt: row.created_at,
  }));
}

export async function listReplies(institutionId?: string) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("correspondence_replies").select("*").order("created_at", { ascending: false });
  if (institutionId) query = query.eq("institution_id", institutionId);
  const { data, error } = await query;
  throwIfError(error, "correspondence_replies");
  const rows = (data ?? []) as ReplyRow[];
  const files = await listFiles(rows.map((row) => row.id));
  const byReply = new Map<string, CorrespondenceFile[]>();
  for (const file of files) {
    const list = byReply.get(file.replyId) ?? [];
    list.push(file);
    byReply.set(file.replyId, list);
  }
  return rows.map((row) => rowToReply(row, byReply.get(row.id) ?? []));
}

export async function getReply(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("correspondence_replies").select("*").eq("id", id).maybeSingle();
  throwIfError(error, "correspondence_replies");
  if (!data) return null;
  const files = await listFiles([id]);
  return rowToReply(data as ReplyRow, files);
}

export async function createReply(input: {
  institutionId: string;
  requestId?: string | null;
  receivedAt?: string | null;
  registrationNumber?: string;
  responseType: InstitutionResponse;
  summary?: string;
  notes?: string;
  processing?: ReplyProcessing;
}) {
  const supabase = createSupabaseAdminClient();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { error } = await supabase.from("correspondence_replies").insert({
    id,
    institution_id: input.institutionId,
    request_id: input.requestId || null,
    received_at: input.receivedAt || now,
    registration_number: input.registrationNumber || null,
    response_type: input.responseType,
    summary: input.summary || null,
    notes: input.notes || null,
    processing: input.processing || "neprocesat",
  });
  throwIfError(error, "correspondence_replies");
  return getReply(id);
}

export async function updateReply(id: string, patch: Partial<CorrespondenceReply>) {
  const supabase = createSupabaseAdminClient();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("receivedAt" in patch) row.received_at = patch.receivedAt || null;
  if ("registrationNumber" in patch) row.registration_number = patch.registrationNumber || null;
  if (patch.responseType !== undefined) row.response_type = patch.responseType;
  if ("summary" in patch) row.summary = patch.summary || null;
  if ("notes" in patch) row.notes = patch.notes || null;
  if (patch.processing !== undefined) row.processing = patch.processing;
  if ("requestId" in patch) row.request_id = patch.requestId || null;
  const { error } = await supabase.from("correspondence_replies").update(row).eq("id", id);
  throwIfError(error, "correspondence_replies");
  return getReply(id);
}

export async function addReplyFile(replyId: string, file: {
  id: string;
  filename: string;
  mime: string;
  byteSize: number;
  storageKey: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("correspondence_files").insert({
    id: file.id,
    reply_id: replyId,
    filename: file.filename,
    mime: file.mime,
    byte_size: file.byteSize,
    storage_key: file.storageKey,
  });
  throwIfError(error, "correspondence_files");
}

export async function getStoredFile(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("correspondence_files").select("*").eq("id", id).maybeSingle();
  throwIfError(error, "correspondence_files");
  if (!data) return null;
  const row = data as {
    id: string;
    reply_id: string;
    filename: string;
    mime: string;
    byte_size: number;
    storage_key: string;
  };
  return {
    id: row.id,
    replyId: row.reply_id,
    filename: row.filename,
    mime: row.mime,
    byteSize: row.byte_size,
    storageKey: row.storage_key,
  };
}

export async function recordDispatch(input: {
  institutionId: string;
  channel: SendChannel;
  templateId?: string;
  subject: string;
  body: string;
  toEmail: string;
  status: RequestStatus;
  sentAt: string;
  outboxId?: string;
  notes?: string;
}) {
  const dueAt = foiaDueAt(input.sentAt).toISOString();
  const request = await createRequest({
    institutionId: input.institutionId,
    channel: input.channel,
    templateId: input.templateId,
    subject: input.subject,
    body: input.body,
    toEmail: input.toEmail,
    status: input.status,
    sentAt: input.sentAt,
    dueAt,
    outboxId: input.outboxId,
    notes: input.notes,
  });
  const institution = await getInstitution(input.institutionId);
  await updateInstitution(input.institutionId, {
    lastEmailedAt: input.sentAt,
    requestedAt: institution?.requestedAt || input.sentAt,
    requestStatus: input.status,
    email: institution?.email || input.toEmail,
  });
  await logEvent({
    institutionId: input.institutionId,
    requestId: request?.id,
    kind: "trimis",
    detail: `${input.channel}: ${input.subject}`,
  });
  return request;
}

export async function overdueInstitutions() {
  const [institutions, requests] = await Promise.all([listInstitutions(), listRequests()]);
  const latest = new Map<string, CorrespondenceRequest>();
  for (const request of requests) {
    if (!latest.has(request.institutionId)) latest.set(request.institutionId, request);
  }
  const now = Date.now();
  return institutions.filter((item) => {
    const status = deriveRequestStatus(item);
    if (status !== "in_asteptare" && status !== "trimisa") return false;
    const request = latest.get(item.id);
    const due = request?.dueAt
      ? new Date(request.dueAt).getTime()
      : item.lastEmailedAt
        ? foiaDueAt(item.lastEmailedAt).getTime()
        : 0;
    return due > 0 && due < now;
  });
}
