import { Suspense } from "react";
import InstitutionDesk from "@/components/InstitutionDesk";

export default function AdminInstitutionsPage() {
  return (
    <Suspense fallback={<p className="banner">Se încarcă instituțiile…</p>}>
      <InstitutionDesk />
    </Suspense>
  );
}
