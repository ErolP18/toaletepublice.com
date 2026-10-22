function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(headers: string[], rows: string[][]) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map((cell) => csvEscape(cell ?? "")).join(","));
  return `\uFEFF${lines.join("\n")}\n`;
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
