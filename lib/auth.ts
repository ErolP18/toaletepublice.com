import { NextResponse } from "next/server";

const COOKIE = "tp_admin";
const WEEK = 60 * 60 * 24 * 7;
const MAGIC_TTL = 15 * 60;
const encoder = new TextEncoder();

function secret() {
  return normalizeSecret(process.env.AUTH_SECRET ?? "");
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number) {
  return hex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

async function hmac(value: string) {
  const keyMaterial = secret();
  if (!keyMaterial) throw new Error("AUTH_SECRET lipsește.");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keyMaterial),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let out = 0;
  for (let i = 0; i < left.length; i += 1) out |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return out === 0;
}

function normalizeSecret(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

export async function createSessionToken() {
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  const nonce = randomHex(16);
  const payload = `${exp}.${nonce}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(token: string | undefined) {
  if (!token || !secret()) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expRaw, nonce, signature] = parts;
  if (!expRaw || !nonce || !signature) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  try {
    return safeEqual(signature, await hmac(`${expRaw}.${nonce}`));
  } catch {
    return false;
  }
}

export async function createLoginCode() {
  const exp = Math.floor(Date.now() / 1000) + MAGIC_TTL;
  const number = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
  const code = String(number).padStart(6, "0");
  return { code, hash: await hmac(`code:${code}`), exp };
}

export async function hashLoginCode(code: string) {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) return "";
  return hmac(`code:${digits}`);
}

export function adminPasswordConfigured() {
  return Boolean(normalizeSecret(process.env.ADMIN_PASSWORD ?? "") && secret());
}

export async function passwordMatches(password: string) {
  const expected = normalizeSecret(process.env.ADMIN_PASSWORD ?? "");
  const given = password.trim();
  if (!expected || !given || !secret()) return false;
  const [left, right] = await Promise.all([hmac(`pw:${given}`), hmac(`pw:${expected}`)]);
  return safeEqual(left, right);
}

export const sessionCookie = {
  name: COOKIE,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: WEEK,
    secure: process.env.NODE_ENV === "production",
  },
};

export async function sessionJson(data: unknown, status = 200) {
  const response = NextResponse.json(data, { status });
  response.cookies.set(sessionCookie.name, await createSessionToken(), sessionCookie.options);
  return response;
}
