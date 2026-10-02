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

  // Sem nenhuma receita no mês, não há orçamento para comparar: não assusta o usuário novo com o alerta.
  const { start, end } = monthRange(month);
  const hasIncome = (await prisma.transaction.count({ where: { AND: [visibleWhere(user, p.scope), { type: "INCOME", dueDate: { gte: start, lt: end } }] } })) > 0;

  let level: BudgetLevel = "OK";
  if (!isReserveContribution && hasIncome) {
    if (after < 0) level = "NEGATIVE";
    else if (reserve > 0 && after < reserve) level = "RESERVE";
  }
  return { level, month, projectedBefore: projected, projectedAfter: after, impact, emergencyReserve: reserve, hasIncome };
}

export function nextMonth(m: string) {
  return shiftMonth(m, 1);
}
