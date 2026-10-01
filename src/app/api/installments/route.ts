import { prisma } from "@/lib/prisma";
import { handle, requireUser } from "@/lib/session";
import { fmtDay, today } from "@/lib/dates";
import { num, round2 } from "@/lib/money";

export const dynamic = "force-dynamic";

/** Planos de parcelamento com saldo restante e parcelas faltantes (derivados do status de cada parcela). */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const t0 = today();
    const plans = await prisma.installmentPlan.findMany({
      where: { OR: [{ scope: "PERSONAL", userId: user.id }, { scope: "FAMILY", familyId: user.familyId }] },
      include: { card: { select: { name: true } }, transactions: { orderBy: { installmentNumber: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return plans.map((p) => {
      const paid = p.transactions.filter((t) => t.status === "PAID");
      const pending = p.transactions.filter((t) => t.status === "PENDING");
      const next = pending[0];
      return {
        id: p.id,
        description: p.description,
        scope: p.scope,
        category: p.category,
        subcategory: p.subcategory,
        paymentMethod: p.paymentMethod,
        cardName: p.card?.name ?? null,
        totalAmount: num(p.totalAmount),
        installmentsCount: p.installmentsCount,
        paidCount: paid.length,
        remainingCount: pending.length,
        paidAmount: round2(paid.reduce((a, t) => a + num(t.amount), 0)),
        remainingAmount: round2(pending.reduce((a, t) => a + num(t.amount), 0)),
        done: pending.length === 0,
        overdueCount: pending.filter((t) => t.dueDate < t0).length,
        next: next ? { id: next.id, number: next.installmentNumber, amount: num(next.amount), dueDate: fmtDay(next.dueDate) } : null,
        installments: p.transactions.map((t) => ({
          id: t.id,
          number: t.installmentNumber,
          amount: num(t.amount),
          dueDate: fmtDay(t.dueDate),
          status: t.status,
          overdue: t.status === "PENDING" && t.dueDate < t0,
        })),
      };
    });
  });
}
