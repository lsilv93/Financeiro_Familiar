import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handle, requireUser } from "@/lib/session";
import { cardDueDate, dayInMonth, isMonth } from "@/lib/dates";

export const dynamic = "force-dynamic";

const schema = z.object({ month: z.string().refine(isMonth, "Mês inválido") });

/** Gera (de forma idempotente) os lançamentos PENDENTES do mês a partir das regras recorrentes ativas. */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { month } = schema.parse(await req.json());
    const rules = await prisma.recurringRule.findMany({
      where: { active: true, OR: [{ scope: "PERSONAL", userId: user.id }, { scope: "FAMILY", familyId: user.familyId }] },
      include: { card: true },
    });
    const data = rules.map((r) => {
      const date = dayInMonth(month, r.dayOfMonth);
      const dueDate = r.card ? cardDueDate(date, r.card.dueDay, r.card.closingDay) : date;
      return {
        type: r.type,
        scope: r.scope,
        description: r.description,
        amount: r.amount,
        category: r.category,
        subcategory: r.subcategory,
        date,
        dueDate,
        status: "PENDING" as const,
        paymentMethod: r.paymentMethod,
        cardId: r.cardId,
        userId: r.userId,
        familyId: r.familyId,
        ruleId: r.id,
        recurringMonth: month,
      };
    });
    const res = await prisma.transaction.createMany({ data, skipDuplicates: true });
    return { generated: res.count, skipped: data.length - res.count };
  });
}
