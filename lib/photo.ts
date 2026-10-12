import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "toilets");

export function isUploadPath(value: string | null | undefined) {
  return Boolean(value?.startsWith("/uploads/toilets/") && !value.includes(".."));
}

async function removeFile(publicPath: string | null | undefined) {
  if (!isUploadPath(publicPath)) return;
  await unlink(path.join(process.cwd(), "public", publicPath)).catch(() => undefined);
}

export async function saveToiletPhoto(id: string, file: File, previous?: string | null) {
  if (!file.size) throw new Error("Alege o poză.");
  if (file.size > MAX_BYTES) throw new Error("Poza e prea mare (maximum 4 MB).");
  const ext = TYPES[file.type];
  if (!ext) throw new Error("Folosește JPG, PNG sau WebP.");

  await mkdir(UPLOAD_DIR, { recursive: true });
  await removeFile(previous);

  const filename = `${id}-${Date.now()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/toilets/${filename}`;
}

export async function deleteToiletPhoto(publicPath: string | null | undefined) {
  await removeFile(publicPath);
}
