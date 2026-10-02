import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser } from "@/lib/session";
import { approveJoin, familyOwnerId, rejectJoin } from "@/lib/family";

export const dynamic = "force-dynamic";

const schema = z.object({ action: z.enum(["approve", "reject"]) });

/** Somente o usuário principal da família de destino pode aprovar ou recusar. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { action } = schema.parse(await req.json());
    const jr = await prisma.joinRequest.findUnique({ where: { id } });
    // 404 também para quem não é o dono: não revela que o pedido existe.
    if (!jr || (await familyOwnerId(jr.familyId)) !== user.id) throw new HttpError(404, "Pedido não encontrado");
    if (action === "approve") await approveJoin(id, user.id);
    else await rejectJoin(id, user.id);
    await prisma.notification.updateMany({ where: { requestId: id, userId: user.id }, data: { readAt: new Date() } });
    return { ok: true, status: action === "approve" ? "APPROVED" : "REJECTED" };
  });
}
