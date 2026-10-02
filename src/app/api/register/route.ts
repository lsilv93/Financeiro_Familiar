import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { HttpError, handle } from "@/lib/session";
import { ipKey, lookupInvite, rateLimit } from "@/lib/security";
import { createJoinRequest } from "@/lib/family";

export const dynamic = "force-dynamic";

const newInviteCode = () => randomBytes(5).toString("hex").toUpperCase();

export async function POST(req: Request) {
  return handle(async () => {
    const body = registerSchema.parse(await req.json());
    await rateLimit(await ipKey("register"), 10, 60); // até 9 cadastros por hora por IP
    if (await prisma.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, "Este email já está cadastrado");

    // Com código: valida antes de criar qualquer coisa.
    const target = body.inviteCode ? await lookupInvite(body.inviteCode) : null;
    if (body.inviteCode && !target) throw new HttpError(400, "Código de convite inválido");

    const passwordHash = await hash(body.password, 12);
    // Todo usuário nasce com a própria família. Quem entra por código fica "aguardando aprovação"
    // até o usuário principal da família de destino aceitar o pedido.
    const user = await prisma.$transaction(async (db) => {
      const fam = await db.family.create({ data: { name: body.familyName || `Família ${body.name.split(" ")[0]}`, inviteCode: newInviteCode() } });
      const u = await db.user.create({ data: { name: body.name, email: body.email, passwordHash, familyId: fam.id, role: body.role, awaitingApproval: !!target } });
      await db.family.update({ where: { id: fam.id }, data: { ownerId: u.id } });
      return u;
    });
    if (target) await createJoinRequest({ id: user.id, name: user.name }, target);
    return { id: user.id, pending: !!target };
  });
}
