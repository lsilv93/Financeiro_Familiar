import { prisma } from "./prisma";
import { type CurrentUser, type ScopeFilter, visibleWhere } from "./session";
import { currentMonth, monthOf, monthRange, shiftMonth } from "./dates";
import { num, round2 } from "./money";
import { ensureRecurring } from "./recurring";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type MonthRow = {
  month: string; // "YYYY-MM"
  label: string; // "Out/26"
  income: number; // receitas do mês (previstas + recebidas)
  incomePaid: number;
  expense: number; // despesas do mês (previstas + pagas)
  expensePaid: number;
  balance: number;
  incomeDelta: number | null; // variação % sobre o mês anterior
  expenseDelta: number | null;
  isCurrent: boolean;
  isFuture: boolean;
};

/** Receitas e despesas mês a mês (competência = vencimento), terminando em `end`. */
export async function monthlyComparison(user: CurrentUser, opts: { end: string; months: number; filter: ScopeFilter }) {
  const { end, months, filter } = opts;
  await ensureRecurring(user, end);
  const first = shiftMonth(end, -(months - 1));
  const before = shiftMonth(first, -1); // mês extra só para calcular a variação do primeiro
  const rows = await prisma.transaction.findMany({
    where: { AND: [visibleWhere(user, filter), { dueDate: { gte: monthRange(before).start, lt: monthRange(end).end } }] },
    select: { type: true, status: true, amount: true, dueDate: true },
  });

  const acc = new Map<string, { income: number; incomePaid: number; expense: number; expensePaid: number }>();
  for (const r of rows) {
    const m = monthOf(r.dueDate);
    const a = acc.get(m) ?? { income: 0, incomePaid: 0, expense: 0, expensePaid: 0 };
    const v = num(r.amount);
    if (r.type === "INCOME") {
      a.income += v;
      if (r.status === "PAID") a.incomePaid += v;
    } else {
      a.expense += v;
      if (r.status === "PAID") a.expensePaid += v;
    }
    acc.set(m, a);
  }

  const now = currentMonth();
  const delta = (a: number, b: number) => (b > 0 ? round2(((a - b) / b) * 100) : null);
  const out: MonthRow[] = [];
  let prev = acc.get(before) ?? { income: 0, incomePaid: 0, expense: 0, expensePaid: 0 };
  for (let m = first; m <= end; m = shiftMonth(m, 1)) {
    const a = acc.get(m) ?? { income: 0, incomePaid: 0, expense: 0, expensePaid: 0 };
    const [y, mm] = m.split("-").map(Number);
    out.push({
      month: m,
      label: `${MONTHS[mm - 1]}/${String(y).slice(2)}`,
      income: round2(a.income),
      incomePaid: round2(a.incomePaid),
      expense: round2(a.expense),
      expensePaid: round2(a.expensePaid),
      balance: round2(a.income - a.expense),
      incomeDelta: delta(a.income, prev.income),
      expenseDelta: delta(a.expense, prev.expense),
      isCurrent: m === now,
      isFuture: m > now,
    });
    prev = a;
  }

  // Médias só dos meses que já começaram e têm movimento.
  const base = out.filter((r) => !r.isFuture && (r.income > 0 || r.expense > 0));
  const avg = (k: "income" | "expense") => (base.length ? round2(base.reduce((s, r) => s + r[k], 0) / base.length) : 0);
  return {
    end,
    months,
    rows: out,
    summary: {
      avgIncome: avg("income"),
      avgExpense: avg("expense"),
      monthsNegative: base.filter((r) => r.balance < 0).length,
      monthsWithData: base.length,
      maxExpense: base.length ? base.reduce((a, b) => (b.expense > a.expense ? b : a)) : null,
      maxIncome: base.length ? base.reduce((a, b) => (b.income > a.income ? b : a)) : null,
    },
  };
}
