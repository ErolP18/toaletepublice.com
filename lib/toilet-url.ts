const TOILET_ID = /^[a-zA-Z0-9-]{8,80}$/;

export const SITE_ORIGIN = "https://toaletepublice.com";

export function isToiletId(value: string) {
  return TOILET_ID.test(value);
}

export function toiletPath(id: string) {
  return `/t/${id}`;
}

export function parseToiletPath(pathname: string) {
  const match = pathname.match(/^\/t\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    const id = decodeURIComponent(match[1]);
    return isToiletId(id) ? id : null;
  } catch {
    return null;
  }
}

export function toiletPageUrl(id: string, origin = SITE_ORIGIN) {
  return `${origin}${toiletPath(id)}`;
}
