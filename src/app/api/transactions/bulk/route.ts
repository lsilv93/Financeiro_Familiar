import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handle, requireUser, visibleWhere } from "@/lib/session";
import { addDays, dayInMonth, fmtDay, monthOf, parseDay, shiftMonth } from "@/lib/dates";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    ids: z.array(z.string().min(5).max(40)).min(1).max(200),
    action: z.enum(["pay", "unpay", "postpone", "delete"]),
    days: z.coerce.number().int().min(1).max(3650).optional(),
    months: z.coerce.number().int().min(1).max(120).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // nova data de vencimento
  })
  .refine((v) => v.action !== "postpone" || v.days || v.months || v.date, { message: "Informe quanto adiar (dias, meses ou uma data)" });

/** Ações em lote da planilha: marcar pago/pendente, adiar vencimento ou excluir várias linhas. */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const b = schema.parse(await req.json());
    // Só linhas visíveis ao usuário (as demais são ignoradas, nunca alteradas).
    const rows = await prisma.transaction.findMany({ where: { AND: [{ id: { in: b.ids } }, visibleWhere(user)] } });
    const ids = rows.map((r) => r.id);
    const ignored = b.ids.length - ids.length;

    if (b.action === "pay" || b.action === "unpay") {
      const paid = b.action === "pay";
      const r = await prisma.transaction.updateMany({ where: { id: { in: ids } }, data: { status: paid ? "PAID" : "PENDING", paidAt: paid ? new Date() : null } });
      return { updated: r.count, ignored };
    }

    if (b.action === "postpone") {
      await prisma.$transaction(
        rows.map((t) => {
          let due: Date;
          if (b.date) due = parseDay(b.date);
          else if (b.months) due = dayInMonth(shiftMonth(monthOf(t.dueDate), b.months), t.dueDate.getUTCDate());
          else due = addDays(t.dueDate, b.days!);
          // Lançamentos simples mantêm data = vencimento; cartões/parcelas/fixas só mudam o vencimento.
          const simple = !t.cardId && !t.planId && !t.ruleId;
          return prisma.transaction.update({ where: { id: t.id }, data: { dueDate: due, ...(simple ? { date: due } : {}) } });
        }),
      );
      return { updated: rows.length, ignored, example: rows[0] ? fmtDay(rows[0].dueDate) : null };
    }

    // delete: igual a "só este" (fixas não são regeradas naquele mês; parcelas apagam só a parcela)
    for (const t of rows) {
      if (t.ruleId && t.recurringMonth) await prisma.recurringRule.updateMany({ where: { id: t.ruleId }, data: { skipMonths: { push: t.recurringMonth } } });
    }
    const r = await prisma.transaction.deleteMany({ where: { id: { in: ids } } });
    return { updated: r.count, ignored };
  });
}
