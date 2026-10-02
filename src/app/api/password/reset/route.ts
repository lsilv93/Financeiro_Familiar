import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, handle } from "@/lib/session";
import { ipKey, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(100),
});

/** Define a nova senha, desbloqueia a conta e invalida links e sessões anteriores. */
export async function POST(req: Request) {
  return handle(async () => {
    const { token, password } = schema.parse(await req.json());
    await rateLimit(await ipKey("reset"), 10, 60);
    const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") } });
    if (!rec || rec.usedAt || rec.expiresAt < new Date()) throw new HttpError(400, "Link inválido ou expirado. Solicite um novo link de recuperação.");
    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: await hash(password, 12), failedLogins: 0, lockedAt: null, passwordChangedAt: now } }),
      prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: now } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: rec.userId, id: { not: rec.id } } }),
    ]);
    return { ok: true };
  });
}
