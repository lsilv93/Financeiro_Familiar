import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({ inviteCode: z.string().trim().toUpperCase().min(4).max(20) });

/**
 * Entra em outra família pelo código de convite.
 * Só é permitido se o usuário for o único membro da família atual; seus dados são migrados.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { inviteCode } = schema.parse(await req.json());
    const target = await prisma.family.findUnique({ where: { inviteCode } });
    if (!target) throw new HttpError(400, "Código de convite inválido");
    if (target.id === user.familyId) throw new HttpError(400, "Você já faz parte desta família");
    const members = await prisma.user.count({ where: { familyId: user.familyId } });
    if (members > 1) throw new HttpError(400, "Sua família atual possui outros membros; não é possível trocar de família");

    const old = user.familyId;
    const where = { familyId: old };
    const data = { familyId: target.id };
    await prisma.$transaction([
      prisma.transaction.updateMany({ where, data }),
      prisma.installmentPlan.updateMany({ where, data }),
      prisma.recurringRule.updateMany({ where, data }),
      prisma.creditCard.updateMany({ where, data }),
      prisma.user.update({ where: { id: user.id }, data }),
      prisma.family.delete({ where: { id: old } }),
    ]);
    return { familyId: target.id };
  });
}
