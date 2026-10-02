import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser } from "@/lib/session";
import { currentMonth } from "@/lib/dates";
import { ensureRecurring, removeFuturePending, visibleRulesWhere } from "@/lib/recurring";

export const dynamic = "force-dynamic";

async function ownRule(id: string) {
  const user = await requireUser();
  const rule = await prisma.recurringRule.findFirst({ where: { AND: [{ id }, visibleRulesWhere(user)] } });
  if (!rule) throw new HttpError(404, "Regra não encontrada");
  return { user, rule };
}

const schema = z.object({
  active: z.boolean().optional(),
  amount: z.coerce.number().positive().max(1_000_000_000).optional(),
  description: z.string().trim().min(1).max(120).optional(),
  endMonth: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
});

/**
 * Altera a regra. Valor/descrição também são aplicados aos meses futuros ainda pendentes
 * (meses já pagos ficam intactos). Pausar remove os meses futuros pendentes.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { user, rule } = await ownRule((await ctx.params).id);
    const b = schema.parse(await req.json());
    await prisma.recurringRule.update({ where: { id: rule.id }, data: b });
    if (b.amount !== undefined || b.description !== undefined) {
      await prisma.transaction.updateMany({
        where: { ruleId: rule.id, status: "PENDING", recurringMonth: { gte: currentMonth() } },
        data: { ...(b.amount !== undefined ? { amount: b.amount } : {}), ...(b.description !== undefined ? { description: b.description } : {}) },
      });
    }
    let removed = 0;
    if (b.active === false) removed = await removeFuturePending(rule.id);
    if (b.endMonth) await prisma.transaction.deleteMany({ where: { ruleId: rule.id, status: "PENDING", recurringMonth: { gt: b.endMonth } } });
    if (b.active === true || b.endMonth === null) await ensureRecurring(user);
    return { ok: true, removedFuture: removed };
  });
}

/** Exclui a regra e os meses futuros pendentes; o que já foi pago ou venceu permanece no histórico. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { rule } = await ownRule((await ctx.params).id);
    const removed = await removeFuturePending(rule.id);
    await prisma.recurringRule.delete({ where: { id: rule.id } });
    return { deleted: true, removedFuture: removed };
  });
}
