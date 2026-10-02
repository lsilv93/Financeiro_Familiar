import { prisma } from "@/lib/prisma";
import { handle, requireUserAnyState } from "@/lib/session";
import { familyOwnerId } from "@/lib/family";

export const dynamic = "force-dynamic";

/** Situação do acesso do usuário (aguardando aprovação, aprovado ou recusado). */
export async function GET() {
  return handle(async () => {
    const user = await requireUserAnyState();
    const last = await prisma.joinRequest.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { family: { select: { name: true, ownerId: true } } } });
    const owner = last ? await prisma.user.findUnique({ where: { id: last.family.ownerId ?? (await familyOwnerId(last.familyId)) ?? "" }, select: { name: true } }) : null;
    const fam = await prisma.family.findUnique({ where: { id: user.familyId }, select: { name: true, ownerId: true } });
    return {
      awaitingApproval: user.awaitingApproval,
      request: last ? { status: last.status, familyName: last.family.name, ownerName: owner?.name ?? null, createdAt: last.createdAt.toISOString() } : null,
      isOwner: fam?.ownerId === user.id,
      familyName: fam?.name ?? "",
    };
  });
}
