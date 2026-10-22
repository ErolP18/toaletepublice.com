import type { Institution } from "@/lib/desk";
import { todayRo, type TemplateVars } from "./template";
import { mailIdentity } from "./identity";

export function institutionVars(
  institution: Institution | null,
  extra: { to?: string; sentAt?: string | null; registration?: string | null } = {},
): TemplateVars {
  const identity = mailIdentity();
  const registration = extra.registration?.trim();
  return {
    institutie: institution?.name || extra.to || "",
    localitate: institution?.city || "",
    judet: institution?.county || "",
    data: todayRo(),
    data_solicitarii: extra.sentAt
      ? todayRo(new Date(extra.sentAt))
      : institution?.lastEmailedAt
        ? todayRo(new Date(institution.lastEmailedAt))
        : "",
    numar_inregistrare: registration ? `, nr. ${registration}` : "",
    solicitant_nume: identity.name || "",
    solicitant_adresa: identity.address || "",
    solicitant_email: identity.email || "",
    solicitant_telefon: identity.phone ? `, telefon ${identity.phone}` : "",
  };
}
