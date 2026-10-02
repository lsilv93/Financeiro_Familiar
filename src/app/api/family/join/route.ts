import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser } from "@/lib/session";
import { lookupInvite } from "@/lib/security";
import { createJoinRequest } from "@/lib/family";

export const dynamic = "force-dynamic";

const schema = z.object({ inviteCode: z.string().trim().toUpperCase().min(4).max(20) });

/**
 * Pede para entrar em outra família pelo código de convite (precisa de aprovação).
 * Só é permitido se o usuário for o único membro da família atual; ao ser aprovado, seus dados são migrados.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { inviteCode } = schema.parse(await req.json());
    const target = await lookupInvite(inviteCode, user.id);
    if (!target) throw new HttpError(400, "Código de convite inválido");
    if (target.id === user.familyId) throw new HttpError(400, "Você já faz parte desta família");
    const members = await prisma.user.count({ where: { familyId: user.familyId } });
    if (members > 1) throw new HttpError(400, "Sua família atual possui outros membros; não é possível trocar de família");

    // Não entra direto: o usuário principal da família precisa aprovar (você continua usando a sua até lá).
    await createJoinRequest({ id: user.id, name: user.name }, { id: target.id, name: target.name });
    return { pending: true, familyName: target.name };
  });
}
