function read(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function mailIdentity() {
  const name = read("MAIL_SENDER_NAME");
  const address = read("MAIL_SENDER_ADDRESS");
  const email = read("MAIL_SENDER_EMAIL") || read("SMTP_FROM") || read("SMTP_USER");
  const phone = read("MAIL_SENDER_PHONE");
  return { name, address, email, phone };
}

export function mailIdentityReady() {
  const { name, email } = mailIdentity();
  return Boolean(name && email);
}

export function smtpConfigured() {
  return Boolean(read("SMTP_HOST") && read("SMTP_USER") && read("SMTP_PASS") && (read("SMTP_FROM") || read("SMTP_USER")));
}

export function smtpFromAddress() {
  return read("SMTP_FROM") || read("SMTP_USER");
}

export function smtpFromName() {
  return read("MAIL_SENDER_NAME") || "toaletepublice.com";
}

export function adminMailbox() {
  return read("ADMIN_EMAIL") || read("MAIL_SENDER_EMAIL") || "erol@ciucur.com";
}
