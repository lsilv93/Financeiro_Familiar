import { prisma } from "./prisma";
import { type CurrentUser, type ScopeFilter, visibleWhere } from "./session";
import { addDays, diffDays, fmtDay, monthOf, parseDay, shiftMonth, startOfWeek, today, type Period } from "./dates";
import { num, round2 } from "./money";
import { EXPENSE_CATEGORIES, INVESTMENT_KEY, TITHE_KEY } from "./categories";

type Range = { start: Date; end: Date }; // end exclusivo
type Bucket = { key: string; label: string; start: Date; end: Date };

const NEEDS = ["MORADIA", "ALIMENTACAO", "TRANSPORTE", "SAUDE", "EDUCACAO", "TARIFAS", TITHE_KEY];
const WANTS = ["LAZER", "OUTROS"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function utcDate(y: number, m0: number, d: number) {
  return new Date(Date.UTC(y, m0, d));
}

function rangeFor(period: Period, ref: Date): { range: Range; prev: Range | null; series: Range } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  switch (period) {
    case "day": {
      const range = { start: ref, end: addDays(ref, 1) };
      return { range, prev: { start: addDays(ref, -1), end: ref }, series: { start: addDays(ref, -6), end: addDays(ref, 1) } };
    }
    case "week": {
      const start = startOfWeek(ref);
      const range = { start, end: addDays(start, 7) };
      return { range, prev: { start: addDays(start, -7), end: start }, series: range };
    }
    case "month": {
      const range = { start: utcDate(y, m, 1), end: utcDate(y, m + 1, 1) };
      return { range, prev: { start: utcDate(y, m - 1, 1), end: range.start }, series: range };
    }
    case "year": {
      const range = { start: utcDate(y, 0, 1), end: utcDate(y + 1, 0, 1) };
      return { range, prev: { start: utcDate(y - 1, 0, 1), end: range.start }, series: range };
    }
    default:
      return { range: { start: ref, end: ref }, prev: null, series: { start: ref, end: ref } }; // ajustado depois
  }
}

function buildBuckets(period: Period, s: Range, unit: "day" | "month" | "year"): Bucket[] {
  const out: Bucket[] = [];
  if (unit === "day") {
    for (let d = s.start; d < s.end; d = addDays(d, 1)) {
      const label = period === "month" ? String(d.getUTCDate()) : `${DOW[d.getUTCDay()]} ${d.getUTCDate()}`;
      out.push({ key: fmtDay(d), label, start: d, end: addDays(d, 1) });
    }
  } else if (unit === "month") {
    for (let m = monthOf(s.start); parseDay(`${m}-01`) < s.end; m = shiftMonth(m, 1)) {
      const st = parseDay(`${m}-01`);
      const lab = period === "total" ? `${MONTHS[st.getUTCMonth()]}/${String(st.getUTCFullYear()).slice(2)}` : MONTHS[st.getUTCMonth()];
      out.push({ key: m, label: lab, start: st, end: parseDay(`${shiftMonth(m, 1)}-01`) });
    }
  } else {
    for (let y = s.start.getUTCFullYear(); y <= s.end.getUTCFullYear() - (s.end.getUTCMonth() === 0 && s.end.getUTCDate() === 1 ? 1 : 0); y++) {
      out.push({ key: String(y), label: String(y), start: utcDate(y, 0, 1), end: utcDate(y + 1, 0, 1) });
    }
  }
  return out;
}

type Tx = { type: "INCOME" | "EXPENSE"; status: "PAID" | "PENDING"; amount: number; dueDate: Date; category: string; description: string; id: string };

const sum = (l: Tx[]) => round2(l.reduce((a, t) => a + t.amount, 0));
const inRange = (t: Tx, r: Range) => t.dueDate >= r.start && t.dueDate < r.end;

export async function dashboard(user: CurrentUser, opts: { period: Period; ref: string; filter: ScopeFilter }) {
  const { period, filter } = opts;
  const t0 = today();
  const ref = parseDay(opts.ref);
  const base = visibleWhere(user, filter);

  // Para "total", o intervalo é do primeiro lançamento até o último (ou hoje).
  let { range, prev, series } = rangeFor(period, ref);
  if (period === "total") {
    const agg = await prisma.transaction.aggregate({ where: base, _min: { dueDate: true }, _max: { dueDate: true } });
    const min = agg._min.dueDate ?? t0;
    const max = agg._max.dueDate && agg._max.dueDate > t0 ? agg._max.dueDate : t0;
    range = { start: utcDate(min.getUTCFullYear(), min.getUTCMonth(), 1), end: utcDate(max.getUTCFullYear(), max.getUTCMonth() + 1, 1) };
    series = range;
  }

  const lo = [range.start, series.start, prev?.start].filter(Boolean).reduce((a, b) => (a! < b! ? a : b))!;
  const hi = [range.end, series.end, prev?.end].filter(Boolean).reduce((a, b) => (a! > b! ? a : b))!;
  const rows = await prisma.transaction.findMany({
    where: { AND: [base, { dueDate: { gte: lo, lt: hi } }] },
    select: { id: true, type: true, status: true, amount: true, dueDate: true, category: true, description: true },
  });
  const txs: Tx[] = rows.map((r) => ({ ...r, amount: num(r.amount) }));
  const cur = txs.filter((t) => inRange(t, range));

  const inc = cur.filter((t) => t.type === "INCOME");
  const exp = cur.filter((t) => t.type === "EXPENSE");
  const received = sum(inc.filter((t) => t.status === "PAID"));
  const spent = sum(exp.filter((t) => t.status === "PAID"));
  const incomeTotal = sum(inc);
  const expenseTotal = sum(exp);
  const projected = round2(incomeTotal - expenseTotal);

  // ---- séries (barras / linha) ----
  let unit: "day" | "month" | "year" = period === "day" || period === "week" || period === "month" ? "day" : "month";
  if (period === "total") {
    const months = (range.end.getUTCFullYear() - range.start.getUTCFullYear()) * 12 + range.end.getUTCMonth() - range.start.getUTCMonth();
    if (months > 24) unit = "year";
  }
  const buckets = buildBuckets(period, series, unit);
  const seriesOut = buckets.map((b) => {
    const l = txs.filter((t) => t.dueDate >= b.start && t.dueDate < b.end);
    const bi = l.filter((t) => t.type === "INCOME");
    const be = l.filter((t) => t.type === "EXPENSE");
    return {
      key: b.key,
      label: b.label,
      start: fmtDay(b.start),
      incomePaid: sum(bi.filter((t) => t.status === "PAID")),
      incomeTotal: sum(bi),
      expensePaid: sum(be.filter((t) => t.status === "PAID")),
      expenseTotal: sum(be),
      isCurrent: t0 >= b.start && t0 < b.end,
      isFuture: b.start > t0,
    };
  });

  // ---- categorias ----
  const byCat = new Map<string, number>();
  for (const t of exp) byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  const categories = [...byCat.entries()]
    .map(([key, total]) => ({
      key,
      label: EXPENSE_CATEGORIES[key]?.label ?? key,
      color: EXPENSE_CATEGORIES[key]?.color ?? "#94a3b8",
      total: round2(total),
      percent: expenseTotal ? round2((total / expenseTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
  const topCategory = categories.find((c) => c.key !== INVESTMENT_KEY) ?? null;
  const catSum = (key: string, paidOnly = false) => sum(exp.filter((t) => t.category === key && (!paidOnly || t.status === "PAID")));

  // ---- período anterior (comparativo) ----
  let comparison: null | { income: number; expense: number; balance: number; incomeDelta: number | null; expenseDelta: number | null } = null;
  if (prev) {
    const p = txs.filter((t) => inRange(t, prev!));
    const pi = sum(p.filter((t) => t.type === "INCOME"));
    const pe = sum(p.filter((t) => t.type === "EXPENSE"));
    const delta = (a: number, b: number) => (b > 0 ? round2(((a - b) / b) * 100) : null);
    comparison = { income: pi, expense: pe, balance: round2(pi - pe), incomeDelta: delta(incomeTotal, pi), expenseDelta: delta(expenseTotal, pe) };
  }

  // ---- ritmo de gastos / projeção ----
  const containsToday = t0 >= range.start && t0 < range.end;
  const daysTotal = Math.max(1, diffDays(range.start, range.end));
  const daysElapsed = containsToday ? diffDays(range.start, t0) + 1 : t0 >= range.end ? daysTotal : 0;
  // Só conta o que já foi pago até hoje e só projeta quando há dias suficientes para uma média confiável.
  const spentToDate = sum(exp.filter((t) => t.status === "PAID" && t.dueDate <= t0));
  const avgDailySpend = daysElapsed > 0 ? round2(spentToDate / daysElapsed) : 0;
  const minDays = Math.min(5, Math.ceil(daysTotal * 0.15));
  const canProject = containsToday && period !== "total" && daysElapsed >= minDays;
  const paceSpend = canProject ? round2(avgDailySpend * daysTotal) : null;
  const pace = {
    daysElapsed,
    daysTotal,
    avgDailySpend,
    paceSpend, // quanto se gastaria no período mantendo o ritmo atual
    paceBalance: paceSpend === null ? null : round2(incomeTotal - Math.max(paceSpend, expenseTotal)),
    insufficient: containsToday && period !== "total" && !canProject, // poucos dias para projetar
    minDays,
  };

  // ---- indicadores ----
  const savingsRate = incomeTotal > 0 ? round2(((incomeTotal - expenseTotal) / incomeTotal) * 100) : null;
  const commitment = incomeTotal > 0 ? round2((expenseTotal / incomeTotal) * 100) : null;
  const catTotal = (keys: string[]) => round2(keys.reduce((a, k) => a + (byCat.get(k) ?? 0), 0));
  const needs = catTotal(NEEDS);
  const wants = catTotal(WANTS);
  const saving = catTotal([INVESTMENT_KEY]);
  const pct = (v: number) => (incomeTotal > 0 ? round2((v / incomeTotal) * 100) : null);
  const rule503020 = { needs, wants, saving, needsPct: pct(needs), wantsPct: pct(wants), savingPct: pct(saving) };

  const topExpenses = [...exp].sort((a, b) => b.amount - a.amount).slice(0, 5).map((t) => ({ id: t.id, description: t.description, category: EXPENSE_CATEGORIES[t.category]?.label ?? t.category, amount: t.amount }));

  // ---- pendências, reserva, cartões ----
  const soon = addDays(t0, 7);
  const pendingExp = [base, { type: "EXPENSE" as const, status: "PENDING" as const }];
  const [overdue, upcoming, family, savingsAgg, last3, cards, cardUsed] = await Promise.all([
    prisma.transaction.aggregate({ where: { AND: [...pendingExp, { dueDate: { lt: t0 } }] }, _sum: { amount: true }, _count: true }),
    prisma.transaction.aggregate({ where: { AND: [...pendingExp, { dueDate: { gte: t0, lte: soon } }] }, _sum: { amount: true }, _count: true }),
    prisma.family.findUnique({ where: { id: user.familyId }, select: { emergencyReserve: true } }),
    prisma.savingsEntry.groupBy({ by: ["kind"], where: savingsWhere(user, filter), _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { AND: [base, { type: "EXPENSE", status: "PAID", dueDate: { gte: parseDay(`${shiftMonth(monthOf(t0), -3)}-01`), lt: parseDay(`${monthOf(t0)}-01`) } }] }, _sum: { amount: true } }),
    prisma.creditCard.findMany({ where: { active: true, OR: [{ scope: "PERSONAL", userId: user.id }, { scope: "FAMILY", familyId: user.familyId }] }, select: { id: true, limit: true } }),
    prisma.transaction.aggregate({ where: { type: "EXPENSE", status: "PENDING", cardId: { not: null }, card: { active: true, OR: [{ scope: "PERSONAL", userId: user.id }, { scope: "FAMILY", familyId: user.familyId }] } }, _sum: { amount: true } }),
  ]);
  const famReserve = num(family?.emergencyReserve);
  const reserve = filter === "PERSONAL" ? user.emergencyReserve : filter === "FAMILY" ? famReserve : user.emergencyReserve + famReserve;
  const savedTotal = round2(num(savingsAgg.find((s) => s.kind === "DEPOSIT")?._sum.amount) - num(savingsAgg.find((s) => s.kind === "WITHDRAWAL")?._sum.amount));
  const avgMonthlyExpense = num(last3._sum.amount) / 3 || (period === "month" ? expenseTotal : 0);
  const coverageMonths = avgMonthlyExpense > 0 ? round2(savedTotal / avgMonthlyExpense) : null;
  const cardLimit = round2(cards.reduce((a, c) => a + num(c.limit), 0));
  const cardsUsed = round2(num(cardUsed._sum.amount));

  // ---- saúde financeira (0-100) ----
  const factors = [
    { key: "savings", label: "Taxa de poupança", max: 40, pts: savingsRate === null ? 0 : Math.max(0, Math.min(40, (savingsRate / 20) * 40)), hint: "Meta: guardar 20% ou mais da renda" },
    { key: "commitment", label: "Comprometimento da renda", max: 30, pts: commitment === null ? 0 : commitment <= 80 ? 30 : Math.max(0, 30 - ((commitment - 80) / 20) * 30), hint: "Ideal: gastar até 80% da renda" },
    { key: "reserve", label: "Reserva de emergência", max: 20, pts: coverageMonths === null ? 0 : Math.max(0, Math.min(20, (coverageMonths / 6) * 20)), hint: "Meta: 6 meses de despesas guardados" },
    { key: "overdue", label: "Contas em dia", max: 10, pts: overdue._count === 0 ? 10 : 0, hint: "Sem contas vencidas" },
  ].map((f) => ({ ...f, pts: round2(f.pts) }));
  const score = Math.round(factors.reduce((a, f) => a + f.pts, 0));
  const health = { score, label: score >= 80 ? "Excelente" : score >= 60 ? "Boa" : score >= 40 ? "Atenção" : "Crítica", factors, hasData: incomeTotal > 0 || expenseTotal > 0 };

  return {
    period,
    ref: opts.ref,
    scope: filter,
    range: { start: fmtDay(range.start), end: fmtDay(addDays(range.end, -1)) },
    unit,
    totals: { received, spent, balance: round2(received - spent), projected, incomeTotal, expenseTotal, pendingExpenses: round2(expenseTotal - spent) },
    series: seriesOut,
    categories,
    topCategory,
    topExpenses,
    invested: { paid: catSum(INVESTMENT_KEY, true), planned: catSum(INVESTMENT_KEY) },
    tithes: { paid: catSum(TITHE_KEY, true), planned: catSum(TITHE_KEY) },
    comparison,
    pace,
    indicators: { savingsRate, commitment, rule503020 },
    savings: { total: savedTotal, coverageMonths, avgMonthlyExpense: round2(avgMonthlyExpense), goal: reserve },
    cards: { limit: cardLimit, used: cardsUsed, usedPercent: cardLimit > 0 ? round2((cardsUsed / cardLimit) * 100) : null },
    health,
    overdue: { count: overdue._count, total: round2(num(overdue._sum.amount)) },
    upcoming: { count: upcoming._count, total: round2(num(upcoming._sum.amount)) },
    emergencyReserve: reserve,
    reserveAtRisk: projected < 0 ? "NEGATIVE" : reserve > 0 && projected < reserve ? "RESERVE" : "OK",
  };
}

/** Mesma regra de visibilidade das transações, aplicada aos lançamentos de poupança. */
export function savingsWhere(user: CurrentUser, filter: ScopeFilter = "ALL") {
  const personal = { scope: "PERSONAL" as const, userId: user.id };
  const family = { scope: "FAMILY" as const, familyId: user.familyId };
  if (filter === "PERSONAL") return personal;
  if (filter === "FAMILY") return family;
  return { OR: [personal, family] };
}
