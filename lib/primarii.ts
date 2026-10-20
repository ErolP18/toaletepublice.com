import seed from "@/data/primarii.json";
import { isInstitutionKind, type InstitutionKind } from "@/lib/desk";

export type PrimarieSeed = {
  id: string;
  name: string;
  kind: InstitutionKind;
  county: string;
  city: string;
  email: string;
  notes: string;
};

export function primariiSeed(): PrimarieSeed[] {
  return (seed as Array<Record<string, string>>).flatMap((row) => {
    if (!row.id?.trim() || !row.name?.trim() || !isInstitutionKind(row.kind)) return [];
    return [
      {
        id: row.id.trim(),
        name: row.name.trim(),
        kind: row.kind,
        county: row.county?.trim() ?? "",
        city: row.city?.trim() ?? "",
        email: (row.email ?? "").trim().toLowerCase(),
        notes: row.notes?.trim() ?? "",
      },
    ];
  });
}
