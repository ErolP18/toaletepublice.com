const USUAL_DAYS = 10;
const EXTENSION_DAYS = 10;

export function addCalendarDays(from: Date, days: number) {
  const next = new Date(from.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function foiaDueAt(sentAt: string | Date, extended = false) {
  const start = sentAt instanceof Date ? sentAt : new Date(sentAt);
  return addCalendarDays(start, extended ? USUAL_DAYS + EXTENSION_DAYS : USUAL_DAYS);
}

export function foiaTracking(sentAt: string | null, extendedUntil?: string | null) {
  if (!sentAt) {
    return {
      sentAt: null,
      dueAt: null,
      remainingDays: null,
      overdueDays: null,
      label: "Fără dată de trimitere — termenul se calculează de la înregistrare.",
      overdue: false,
    };
  }
  const start = new Date(sentAt);
  const due = extendedUntil ? new Date(extendedUntil) : foiaDueAt(start);
  const now = new Date();
  const ms = due.getTime() - now.getTime();
  const days = Math.ceil(ms / 86_400_000);
  const overdue = days < 0;
  return {
    sentAt: start.toISOString(),
    dueAt: due.toISOString(),
    remainingDays: overdue ? 0 : days,
    overdueDays: overdue ? Math.abs(days) : 0,
    overdue,
    label: overdue
      ? `Termen orientativ depășit cu ${Math.abs(days)} zile (art. 7 din Legea 544/2001). Nu e o concluzie juridică.`
      : `Termen orientativ: ${days} zile rămase, 10 zile de la trimitere${extendedUntil ? ", cu prelungire notată" : ""} (art. 7). Verifică manual dacă e vorba de zile lucrătoare sau de o prelungire comunicată.`,
  };
}
