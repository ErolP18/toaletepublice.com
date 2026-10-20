const EMAIL =
  /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isEmail(value: string) {
  const email = normalizeEmail(value);
  if (!email || email.length > 200) return false;
  if (/[\r\n,]/.test(email)) return false;
  return EMAIL.test(email);
}

export function cleanHeader(value: string, max: number) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

export function cleanBody(value: string) {
  return value.replace(/\0/g, "").trim().slice(0, 20_000);
}
