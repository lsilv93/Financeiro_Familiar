import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/session";
import { appUrl, sendMail } from "@/lib/mail";
import { ipKey, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Informe um email válido") });
const GENERIC = { ok: true, message: "Se este email estiver cadastrado, enviamos um link para redefinir a senha. Verifique também a caixa de spam." };

/** Sempre responde igual (não revela se o email existe). O link vale 1 hora e só funciona uma vez. */
export async function POST(req: Request) {
  return handle(async () => {
    const { email } = schema.parse(await req.json());
    await rateLimit(await ipKey("forgot"), 5, 60);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return GENERIC;
    const recent = await prisma.passwordResetToken.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 3600_000) } } });
    if (recent >= 3) return GENERIC;

    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3600_000) },
    });
    const link = `${appUrl()}/redefinir-senha?token=${token}`;
    await sendMail({
      to: user.email,
      subject: "Redefinir sua senha - Financeiro Familiar",
      text: `Olá, ${user.name}!\n\nRecebemos um pedido para redefinir a senha da sua conta.\nAcesse o link (válido por 1 hora):\n${link}\n\nSe não foi você, ignore este email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0a1b29"><h2>Redefinir senha</h2><p>Olá, ${escapeHtml(user.name)}!</p><p>Recebemos um pedido para redefinir a senha da sua conta no <b>Financeiro Familiar</b>. O link vale por <b>1 hora</b>.</p><p><a href="${link}" style="display:inline-block;background:#bef91b;color:#000e19;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Redefinir senha</a></p><p style="font-size:12px;color:#566c7f">Se o botão não funcionar, copie e cole: ${link}<br>Se não foi você, ignore este email.</p></div>`,
    });
    return GENERIC;
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
