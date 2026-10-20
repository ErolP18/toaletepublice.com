import nodemailer from "nodemailer";
import { smtpFromAddress, smtpFromName } from "./identity";
import { cleanBody, cleanHeader, isEmail, normalizeEmail } from "./validate";

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function createMailTransport() {
  const host = env("SMTP_HOST");
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  const port = Number(env("SMTP_PORT") || "587");
  if (!host || !user || !pass) {
    throw new Error("SMTP nu e configurat. Completează SMTP_HOST, SMTP_USER și SMTP_PASS.");
  }

  const allowInvalid = env("SMTP_ALLOW_INVALID_CERT") === "1";
  const secure = env("SMTP_SECURE") === "1" || port === 465;

  return nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure,
    auth: { user, pass },
    tls: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: !allowInvalid,
      servername: env("SMTP_TLS_SERVERNAME") || (host === "127.0.0.1" || host === "localhost" ? undefined : host),
    },
  });
}

export async function sendPlainMail(input: { to: string; subject: string; text: string }) {
  const to = normalizeEmail(input.to);
  if (!isEmail(to)) throw new Error("Adresa de e-mail nu e validă.");
  const from = smtpFromAddress();
  if (!from || !isEmail(from)) {
    throw new Error("SMTP_FROM trebuie să fie adresa Proton cu care trimiți.");
  }

  const subject = cleanHeader(input.subject, 180);
  const text = cleanBody(input.text);
  if (!subject) throw new Error("Subiectul e gol.");
  if (!text) throw new Error("Mesajul e gol.");

  const transport = createMailTransport();
  await transport.sendMail({
    from: `${cleanHeader(smtpFromName(), 80)} <${from}>`,
    to,
    subject,
    text,
  });

  return { to, subject, text };
}
