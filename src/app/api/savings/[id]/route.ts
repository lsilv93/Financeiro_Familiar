import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser } from "@/lib/session";
import { savingsWhere } from "@/lib/dashboard";
import { bankBalance } from "@/lib/savings";

export const dynamic = "force-dynamic";

/** Exclui um lançamento de poupança (a tela pede confirmação). Não permite deixar o saldo do banco negativo. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const e = await prisma.savingsEntry.findFirst({ where: { AND: [{ id }, savingsWhere(user)] } });
    if (!e) throw new HttpError(404, "Lançamento não encontrado");
    if (body?.confirmed !== true) throw new HttpError(400, "Confirme a exclusão: reserva é para ser guardada e não mexida.");
    if (e.kind === "DEPOSIT") {
      const { balance } = await bankBalance(user, e.scope, e.bank);
      if (balance - Number(e.amount) < -0.001) throw new HttpError(400, "Não é possível excluir este aporte: já houve resgates que dependem dele.");
    }
    await prisma.savingsEntry.delete({ where: { id } });
    return { deleted: true };
  });
}
