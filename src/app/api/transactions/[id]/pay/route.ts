import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser, visibleWhere } from "@/lib/session";
import { serializeTx, txInclude } from "@/lib/finance";

export const dynamic = "force-dynamic";

/** Confirma (ou desfaz) o pagamento. Saldo/parcelas restantes são derivados do status. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const paid = body?.paid !== false;
    const tx = await prisma.transaction.findFirst({ where: { AND: [{ id }, visibleWhere(user)] } });
    if (!tx) throw new HttpError(404, "Lançamento não encontrado");
    const updated = await prisma.transaction.update({
      where: { id },
      data: { status: paid ? "PAID" : "PENDING", paidAt: paid ? new Date() : null },
      include: txInclude,
    });
    return serializeTx(updated);
  });
}
