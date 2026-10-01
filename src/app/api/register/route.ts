import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { HttpError, handle } from "@/lib/session";

export const dynamic = "force-dynamic";

const newInviteCode = () => randomBytes(4).toString("hex").toUpperCase();

export async function POST(req: Request) {
  return handle(async () => {
    const body = registerSchema.parse(await req.json());
    if (await prisma.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, "Este email já está cadastrado");

    let familyId: string;
    if (body.inviteCode) {
      const fam = await prisma.family.findUnique({ where: { inviteCode: body.inviteCode } });
      if (!fam) throw new HttpError(400, "Código de convite inválido");
      familyId = fam.id;
    } else {
      const fam = await prisma.family.create({
        data: { name: body.familyName || `Família ${body.name.split(" ")[0]}`, inviteCode: newInviteCode() },
      });
      familyId = fam.id;
    }

    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, passwordHash: await hash(body.password, 12), familyId },
    });
    return { id: user.id };
  });
}
