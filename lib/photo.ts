import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 4 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "toilets");
const ID_PATTERN = /^[a-zA-Z0-9-]{8,80}$/;

function sniffImage(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export function isUploadPath(value: string | null | undefined): value is string {
  return Boolean(value?.startsWith("/uploads/toilets/") && !value.includes("..") && !value.includes("\\"));
}

async function removeFile(publicPath: string | null | undefined) {
  if (!isUploadPath(publicPath)) return;
  const filename = path.basename(publicPath);
  await unlink(path.join(UPLOAD_DIR, filename)).catch(() => undefined);
}

export async function saveToiletPhoto(id: string, file: File, previous?: string | null) {
  if (!ID_PATTERN.test(id)) throw new Error("Identificator invalid.");
  if (!file.size) throw new Error("Alege o poză.");
  if (file.size > MAX_BYTES) throw new Error("Poza e prea mare (maximum 4 MB).");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniffImage(bytes);
  if (!ext) throw new Error("Folosește JPG, PNG sau WebP.");

  await mkdir(UPLOAD_DIR, { recursive: true });
  await removeFile(previous);

  const filename = `${id}-${Date.now()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);
  return `/uploads/toilets/${filename}`;
}

export async function deleteToiletPhoto(publicPath: string | null | undefined) {
  await removeFile(publicPath);
}
