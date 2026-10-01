import type { CreditCard, Prisma, Scope, Transaction } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError, type CurrentUser, type ScopeFilter, visibleWhere } from "./session";
import { cardDueDate, monthRange, parseDay, fmtDay, today, shiftMonth } from "./dates";
import { num, round2, splitInstallments } from "./money";
import { INVESTMENT_KEY, RESERVE_SUB, TITHE_KEY, EXPENSE_CATEGORIES } from "./categories";

export const txInclude = {
  card: { select: { name: true } },
  plan: { select: { installmentsCount: true } },
} as const;

export function serializeTx(t: Transaction & { card?: { name: string } | null; plan?: { installmentsCount: number } | null }) {
  return {
    id: t.id,
    type: t.type,
    scope: t.scope,
    description: t.description,
    amount: num(t.amount),
    category: t.category,
    subcategory: t.subcategory,
    date: fmtDay(t.date),
    dueDate: fmtDay(t.dueDate),
    status: t.status,
    paidAt: t.paidAt?.toISOString() ?? null,
    paymentMethod: t.paymentMethod,
    cardId: t.cardId,
    cardName: t.card?.name ?? null,
    planId: t.planId,
    installmentNumber: t.installmentNumber,
    installmentsCount: t.plan?.installmentsCount ?? null,
    recurringMonth: t.recurringMonth,
    ownerId: t.userId,
  };
}

/** Cartão precisa existir, estar ativo e ser acessível ao usuário. */
export async function getUsableCard(user: CurrentUser, cardId: string): Promise<CreditCard> {
  const card = await prisma.creditCard.findFirst({
    where: {
      id: cardId,
      active: true,
      OR: [
        { scope: "PERSONAL", userId: user.id },
        { scope: "FAMILY", familyId: user.familyId },
      ],
    },
  });
  if (!card) throw new HttpError(400, "Cartão de crédito não encontrado");
  return card;
}

export function resolveDueDate(date: string, dueDate: string | null, card: CreditCard | null): Date {
  if (dueDate) return parseDay(dueDate);
  if (card) return cardDueDate(parseDay(date), card.dueDay, card.closingDay);
  return parseDay(date);
}

async function reserveFor(user: CurrentUser, filter: ScopeFilter): Promise<number> {
  const family = await prisma.family.findUnique({ where: { id: user.familyId }, select: { emergencyReserve: true } });
  const fam = num(family?.emergencyReserve);
  if (filter === "PERSONAL") return user.emergencyReserve;
  if (filter === "FAMILY") return fam;
  return user.emergencyReserve + fam;
}

function sum(list: { amount: Prisma.Decimal }[]): number {
  return round2(list.reduce((a, t) => a + num(t.amount), 0));
}

export async function projectedBalance(user: CurrentUser, month: string, filter: ScopeFilter): Promise<number> {
  const { start, end } = monthRange(month);
  const txs = await prisma.transaction.findMany({
    where: { AND: [visibleWhere(user, filter), { dueDate: { gte: start, lt: end } }] },
    select: { type: true, amount: true },
  });
  return round2(sum(txs.filter((t) => t.type === "INCOME")) - sum(txs.filter((t) => t.type === "EXPENSE")));
}

export type BudgetLevel = "OK" | "RESERVE" | "NEGATIVE";

export async function budgetCheck(
  user: CurrentUser,
  p: { scope: Scope; amount: number; installments: number; category?: string | null; subcategory?: string | null; date: string; dueDate: string | null; cardId: string | null; paymentMethod?: string | null },
) {
  const card = p.paymentMethod === "CREDIT" && p.cardId ? await getUsableCard(user, p.cardId) : null;
  const due = resolveDueDate(p.date, p.dueDate, card);
  const month = fmtDay(due).slice(0, 7);
  // Impacto no mês do vencimento = valor da 1ª parcela.
  const impact = splitInstallments(p.amount, p.installments)[0];
  const projected = await projectedBalance(user, month, p.scope);
  const reserve = await reserveFor(user, p.scope);
  const after = round2(projected - impact);
  const isReserveContribution = p.category === INVESTMENT_KEY && p.subcategory === RESERVE_SUB;

  let level: BudgetLevel = "OK";
  if (!isReserveContribution) {
    if (after < 0) level = "NEGATIVE";
    else if (reserve > 0 && after < reserve) level = "RESERVE";
  }
  return { level, month, projectedBefore: projected, projectedAfter: after, impact, emergencyReserve: reserve };
}

export async function dashboard(user: CurrentUser, month: string, filter: ScopeFilter) {
  const { start, end } = monthRange(month);
  const base = visibleWhere(user, filter);
  const txs = await prisma.transaction.findMany({ where: { AND: [base, { dueDate: { gte: start, lt: end } }] } });

  const inc = txs.filter((t) => t.type === "INCOME");
  const exp = txs.filter((t) => t.type === "EXPENSE");
  const received = sum(inc.filter((t) => t.status === "PAID"));
  const spent = sum(exp.filter((t) => t.status === "PAID"));
  const incomeTotal = sum(inc);
  const expenseTotal = sum(exp);
  const projected = round2(incomeTotal - expenseTotal);

  const byCat = new Map<string, number>();
  for (const t of exp) byCat.set(t.category, (byCat.get(t.category) ?? 0) + num(t.amount));
  const categories = [...byCat.entries()]
    .map(([key, total]) => ({
      key,
      label: EXPENSE_CATEGORIES[key]?.label ?? key,
      color: EXPENSE_CATEGORIES[key]?.color ?? "#94a3b8",
      total: round2(total),
      percent: expenseTotal ? round2((total / expenseTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
  // Aportes não são "gasto de consumo": ficam fora do destaque de maior gasto.
  const topCategory = categories.find((c) => c.key !== INVESTMENT_KEY) ?? null;

  const t0 = today();
  const soon = new Date(t0.getTime() + 7 * 86400000);
  const pendingExp = { AND: [base, { type: "EXPENSE" as const, status: "PENDING" as const }] };
  const [overdue, upcoming] = await Promise.all([
    prisma.transaction.findMany({ where: { AND: [...pendingExp.AND, { dueDate: { lt: t0 } }] }, select: { amount: true } }),
    prisma.transaction.findMany({ where: { AND: [...pendingExp.AND, { dueDate: { gte: t0, lte: soon } }] }, select: { amount: true } }),
  ]);

  const reserve = await reserveFor(user, filter);
  const catSum = (key: string, status?: "PAID") => sum(exp.filter((t) => t.category === key && (!status || t.status === status)));

  return {
    month,
    scope: filter,
    totals: { received, spent, balance: round2(received - spent), projected, incomeTotal, expenseTotal, pendingExpenses: round2(expenseTotal - spent) },
    invested: { paid: catSum(INVESTMENT_KEY, "PAID"), planned: catSum(INVESTMENT_KEY) },
    tithes: { paid: catSum(TITHE_KEY, "PAID"), planned: catSum(TITHE_KEY) },
    categories,
    topCategory,
    overdue: { count: overdue.length, total: sum(overdue) },
    upcoming: { count: upcoming.length, total: sum(upcoming) },
    emergencyReserve: reserve,
    reserveAtRisk: projected < 0 ? "NEGATIVE" : reserve > 0 && projected < reserve ? "RESERVE" : "OK",
  };
}

export function nextMonth(m: string) {
  return shiftMonth(m, 1);
}
