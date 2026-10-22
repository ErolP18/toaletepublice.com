import { mkdir, unlink, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 8 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "private", "uploads", "replies");
const ID_PATTERN = /^[a-zA-Z0-9-]{8,80}$/;

function sniff(bytes: Uint8Array): { ext: string; mime: string } | null {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { ext: "pdf", mime: "application/pdf" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ext: "png", mime: "image/png" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

export function replyStoragePath(key: string) {
  if (!key || key.includes("..") || key.includes("/") || key.includes("\\")) {
    throw new Error("Fișier invalid.");
  }
  return path.join(UPLOAD_DIR, key);
}

export async function saveReplyFile(replyId: string, file: File) {
  if (!ID_PATTERN.test(replyId)) throw new Error("Identificator invalid.");
  if (!file.size) throw new Error("Alege un fișier.");
  if (file.size > MAX_BYTES) throw new Error("Fișierul e prea mare (maximum 8 MB).");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) throw new Error("Folosește PDF, JPG, PNG sau WebP.");

  await mkdir(UPLOAD_DIR, { recursive: true });
  const id = crypto.randomUUID();
  const storageKey = `${id}.${kind.ext}`;
  await writeFile(path.join(UPLOAD_DIR, storageKey), bytes);
  const filename = path.basename(file.name || `document.${kind.ext}`).slice(0, 120);
  return {
    id,
    filename: filename || `document.${kind.ext}`,
    mime: kind.mime,
    byteSize: bytes.length,
    storageKey,
  };
}

export async function readReplyFile(storageKey: string) {
  return readFile(replyStoragePath(storageKey));
}

export async function deleteReplyFile(storageKey: string) {
  await unlink(replyStoragePath(storageKey)).catch(() => undefined);
}
