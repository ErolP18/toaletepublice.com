export const institutionKinds = [
  "primarie",
  "consiliu_judetean",
  "sector",
  "minister",
  "alta",
] as const;

export type InstitutionKind = (typeof institutionKinds)[number];

export const institutionResponses = [
  "fara_raspuns",
  "administreaza",
  "nu_administreaza",
  "redirectionare",
  "incomplet",
  "altul",
] as const;

export type InstitutionResponse = (typeof institutionResponses)[number];

export const requestStatuses = [
  "netrimisa",
  "pregatita",
  "trimisa",
  "eroare",
  "in_asteptare",
  "raspuns_primit",
  "necesita_revenire",
  "inchisa",
] as const;

export type RequestStatus = (typeof requestStatuses)[number];

export const sendChannels = ["smtp", "proton_manual", "mailto"] as const;

export type SendChannel = (typeof sendChannels)[number];

export const replyProcessings = ["neprocesat", "procesat", "necesita_clarificari"] as const;

export type ReplyProcessing = (typeof replyProcessings)[number];

export const outboxStatuses = ["prepared", "accepted", "error", "manual"] as const;

export type OutboxStatus = (typeof outboxStatuses)[number];

export const institutionKindLabels: Record<InstitutionKind, string> = {
  primarie: "Primărie",
  consiliu_judetean: "Consiliu județean",
  sector: "Primărie de sector",
  minister: "Minister / agenție",
  alta: "Altă instituție",
};

export const institutionResponseLabels: Record<InstitutionResponse, string> = {
  fara_raspuns: "Fără răspuns",
  administreaza: "Administrează toalete",
  nu_administreaza: "Nu administrează",
  redirectionare: "Redirecționare",
  incomplet: "Răspuns incomplet",
  altul: "Alt tip de răspuns",
};

export const requestStatusLabels: Record<RequestStatus, string> = {
  netrimisa: "Netrimisă",
  pregatita: "Pregătită",
  trimisa: "Trimisă",
  eroare: "Eroare la trimitere",
  in_asteptare: "În așteptarea răspunsului",
  raspuns_primit: "Răspuns primit",
  necesita_revenire: "Necesită revenire",
  inchisa: "Închisă",
};

export const sendChannelLabels: Record<SendChannel, string> = {
  smtp: "SMTP Proton",
  proton_manual: "Proton, manual",
  mailto: "mailto",
};

export const replyProcessingLabels: Record<ReplyProcessing, string> = {
  neprocesat: "Neprocesat",
  procesat: "Procesat",
  necesita_clarificari: "Necesită clarificări",
};

export const outboxStatusLabels: Record<OutboxStatus, string> = {
  prepared: "Pregătit",
  accepted: "Acceptat de SMTP",
  error: "Eroare de expediere",
  manual: "Confirmat manual",
};

export type Institution = {
  id: string;
  name: string;
  kind: InstitutionKind;
  county: string;
  city: string;
  email: string;
  website: string;
  responseStatus: InstitutionResponse;
  requestStatus: RequestStatus;
  toiletsSummary: string;
  notes: string;
  requestedAt: string | null;
  respondedAt: string | null;
  lastEmailedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  updatedAt: string;
};

export type MailOutboxRow = {
  id: string;
  institutionId: string | null;
  toEmail: string;
  subject: string;
  templateId: string | null;
  createdAt: string;
  status: OutboxStatus;
  error: string;
  messageId: string;
  channel: SendChannel;
  requestId: string | null;
};

export type CorrespondenceRequest = {
  id: string;
  institutionId: string;
  channel: SendChannel;
  templateId: string;
  subject: string;
  body: string;
  toEmail: string;
  status: RequestStatus;
  sentAt: string | null;
  dueAt: string | null;
  extendedUntil: string | null;
  registrationNumber: string;
  notes: string;
  outboxId: string;
  createdAt: string;
  updatedAt: string;
};

export type CorrespondenceEvent = {
  id: string;
  institutionId: string;
  requestId: string | null;
  kind: string;
  detail: string;
  createdAt: string;
};

export type CorrespondenceReply = {
  id: string;
  institutionId: string;
  requestId: string | null;
  receivedAt: string | null;
  registrationNumber: string;
  responseType: InstitutionResponse;
  summary: string;
  notes: string;
  processing: ReplyProcessing;
  createdAt: string;
  updatedAt: string;
  files: CorrespondenceFile[];
};

export type CorrespondenceFile = {
  id: string;
  replyId: string;
  filename: string;
  mime: string;
  byteSize: number;
  createdAt: string;
};

export type AdminStats = {
  institutions: number;
  withEmail: number;
  withoutEmail: number;
  sent: number;
  unsent: number;
  waiting: number;
  answered: number;
  administers: number;
  doesNot: number;
  toiletsConfirmed: number;
  toiletsUnconfirmed: number;
  overdue: number;
  needsClarification: number;
  sendErrors: number;
  unprocessedReplies: number;
};

export function isInstitutionKind(value: unknown): value is InstitutionKind {
  return typeof value === "string" && (institutionKinds as readonly string[]).includes(value);
}

export function isInstitutionResponse(value: unknown): value is InstitutionResponse {
  return typeof value === "string" && (institutionResponses as readonly string[]).includes(value);
}

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && (requestStatuses as readonly string[]).includes(value);
}

export function isSendChannel(value: unknown): value is SendChannel {
  return typeof value === "string" && (sendChannels as readonly string[]).includes(value);
}

export function isReplyProcessing(value: unknown): value is ReplyProcessing {
  return typeof value === "string" && (replyProcessings as readonly string[]).includes(value);
}

export function deriveRequestStatus(item: {
  requestStatus?: string | null;
  lastEmailedAt?: string | null;
  responseStatus?: string | null;
}): RequestStatus {
  if (isRequestStatus(item.requestStatus)) return item.requestStatus;
  if (
    item.responseStatus &&
    item.responseStatus !== "fara_raspuns" &&
    isInstitutionResponse(item.responseStatus)
  ) {
    return "raspuns_primit";
  }
  if (item.lastEmailedAt) return "in_asteptare";
  return "netrimisa";
}

export function wasSent(status: RequestStatus) {
  return status !== "netrimisa" && status !== "pregatita" && status !== "eroare";
}