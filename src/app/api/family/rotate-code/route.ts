import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { handle, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Gera um novo código de convite; links e códigos antigos deixam de funcionar. */
export async function POST() {
  return handle(async () => {
    const user = await requireUser();
    const inviteCode = randomBytes(5).toString("hex").toUpperCase();
    await prisma.family.update({ where: { id: user.familyId }, data: { inviteCode } });
    return { inviteCode };
  });
}
