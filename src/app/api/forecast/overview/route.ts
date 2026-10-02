import { prisma } from "@/lib/prisma";
import { handle, parseScopeFilter, requireUser, visibleWhere } from "@/lib/session";
import { currentMonth, monthOf, monthRange, shiftMonth } from "@/lib/dates";
import { num, round2 } from "@/lib/money";
import { ensureRecurring } from "@/lib/recurring";

export const dynamic = "force-dynamic";

/** Visão mês a mês (receitas, despesas e saldo) do mês atual até os próximos N meses. */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const q = new URL(req.url).searchParams;
    const n = Math.min(24, Math.max(1, Number(q.get("months")) || 12));
    const first = currentMonth();
    const last = shiftMonth(first, n - 1);
    await ensureRecurring(user, last);

    const rows = await prisma.transaction.findMany({
      where: { AND: [visibleWhere(user, parseScopeFilter(q.get("scope"))), { dueDate: { gte: monthRange(first).start, lt: monthRange(last).end } }] },
      select: { type: true, status: true, amount: true, dueDate: true, planId: true, ruleId: true },
    });
    const months = Array.from({ length: n }, (_, i) => shiftMonth(first, i)).map((m) => ({ month: m, income: 0, expense: 0, fixedExpense: 0, installmentExpense: 0, fixedIncome: 0 }));
    const idx = new Map(months.map((m, i) => [m.month, i]));
    for (const r of rows) {
      const m = months[idx.get(monthOf(r.dueDate)) ?? -1];
      if (!m) continue;
      const v = num(r.amount);
      if (r.type === "INCOME") {
        m.income += v;
        if (r.ruleId) m.fixedIncome += v;
      } else {
        m.expense += v;
        if (r.planId) m.installmentExpense += v;
        else if (r.ruleId) m.fixedExpense += v;
      }
    }
    return {
      months: months.map((m) => ({
        month: m.month,
        income: round2(m.income),
        expense: round2(m.expense),
        balance: round2(m.income - m.expense),
        fixedIncome: round2(m.fixedIncome),
        fixedExpense: round2(m.fixedExpense),
        installmentExpense: round2(m.installmentExpense),
      })),
    };
  });
}
