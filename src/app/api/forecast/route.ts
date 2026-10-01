import { prisma } from "@/lib/prisma";
import { handle, parseScopeFilter, requireUser, visibleWhere } from "@/lib/session";
import { serializeTx, txInclude } from "@/lib/finance";
import { currentMonth, isMonth, monthRange, shiftMonth } from "@/lib/dates";
import { num, round2 } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Previsão de um mês (padrão: próximo): lançamentos já existentes (parcelas, recorrências geradas)
 * + regras recorrentes ainda não geradas, com o saldo previsto.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const q = new URL(req.url).searchParams;
    const m = q.get("month");
    const month = m && isMonth(m) ? m : shiftMonth(currentMonth(), 1);
    const { start, end } = monthRange(month);

    const [txs, rules] = await Promise.all([
      prisma.transaction.findMany({
        where: { AND: [visibleWhere(user, parseScopeFilter(q.get("scope"))), { dueDate: { gte: start, lt: end } }] },
        include: txInclude,
        orderBy: { dueDate: "asc" },
      }),
      prisma.recurringRule.findMany({
        where: { active: true, OR: [{ scope: "PERSONAL", userId: user.id }, { scope: "FAMILY", familyId: user.familyId }] },
        orderBy: { dayOfMonth: "asc" },
      }),
    ]);

    const generatedRuleIds = new Set(txs.filter((t) => t.ruleId).map((t) => t.ruleId));
    const notGenerated = rules.filter((r) => !generatedRuleIds.has(r.id));
    const items = txs.map(serializeTx);
    const sumBy = (type: "INCOME" | "EXPENSE") =>
      round2(items.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0) + notGenerated.filter((r) => r.type === type).reduce((a, r) => a + num(r.amount), 0));
    const income = sumBy("INCOME");
    const expense = sumBy("EXPENSE");

    return {
      month,
      items,
      pendingRules: notGenerated.map((r) => ({ id: r.id, type: r.type, description: r.description, amount: num(r.amount), dayOfMonth: r.dayOfMonth, category: r.category, scope: r.scope })),
      installmentsTotal: round2(items.filter((t) => t.planId).reduce((a, t) => a + t.amount, 0)),
      totals: { income, expense, balance: round2(income - expense) },
    };
  });
}
