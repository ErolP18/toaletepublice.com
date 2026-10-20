import { Suspense } from "react";
import MailDesk from "@/components/MailDesk";

export default function AdminMailPage() {
  return (
    <Suspense fallback={<p className="banner">Se încarcă mailul…</p>}>
      <MailDesk />
    </Suspense>
  );
}
