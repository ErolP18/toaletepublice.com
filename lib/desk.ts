export const institutionKinds = [
  "primarie",
  "consiliu_judetean",
  "sector",
  "minister",
  "alta",
] as const;

export type InstitutionKind = (typeof institutionKinds)[number];

export const institutionResponses = ["fara_raspuns", "administreaza", "nu_administreaza"] as const;

export type InstitutionResponse = (typeof institutionResponses)[number];

export const institutionKindLabels: Record<InstitutionKind, string> = {
  primarie: "Primărie",
  consiliu_judetean: "Consiliu județean",
  sector: "Primărie de sector",
  minister: "Minister / agenție",
  alta: "Altă instituție",
};

export const institutionResponseLabels: Record<InstitutionResponse, string> = {
  fara_raspuns: "Fără răspuns",
  administreaza: "Administrăm toalete",
  nu_administreaza: "Nu administrăm",
};

export type Institution = {
  id: string;
  name: string;
  kind: InstitutionKind;
  county: string;
  city: string;
  email: string;
  responseStatus: InstitutionResponse;
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
};

export function isInstitutionKind(value: unknown): value is InstitutionKind {
  return typeof value === "string" && (institutionKinds as readonly string[]).includes(value);
}

export function isInstitutionResponse(value: unknown): value is InstitutionResponse {
  return typeof value === "string" && (institutionResponses as readonly string[]).includes(value);
}
