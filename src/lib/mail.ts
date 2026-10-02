import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string; html: string };

/** URL pública do app (nunca derivada do cabeçalho Host, para evitar links de recuperação forjados). */
export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Envia e-mail por SMTP (ex.: Gmail com senha de app) ou Resend (HTTP).
 * Sem provedor configurado, apenas registra no log do servidor (útil em desenvolvimento).
 */
export async function sendMail(m: Mail): Promise<boolean> {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "Financeiro Familiar <onboarding@resend.dev>";
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const port = Number(process.env.SMTP_PORT || 465);
      const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
      await t.sendMail({ from, to: m.to, subject: m.subject, text: m.text, html: m.html });
      return true;
    }
    if (process.env.RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
      });
      if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
      return true;
    }
    console.warn("[mail] Nenhum provedor de e-mail configurado (SMTP_* ou RESEND_API_KEY). E-mail NÃO enviado:", m.subject, "->", m.to);
    if (process.env.NODE_ENV !== "production") console.warn("[mail] conteúdo:\n" + m.text);
    return false;
  } catch (e) {
    console.error("[mail] falha ao enviar:", e);
    return false;
  }
}
