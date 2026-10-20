const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (current.count >= limit) {
    return { ok: false, remaining: 0, retryAt: current.reset };
  }
  current.count += 1;
  return { ok: true, remaining: limit - current.count };
}

export function rateLimitResponse(retryAt?: number) {
  const retryAfter = retryAt ? Math.max(1, Math.ceil((retryAt - Date.now()) / 1000)) : 60;
  return {
    error: "Prea multe încercări. Așteaptă puțin.",
    retryAfter,
  };
}
