import type { CreditCard, Prisma, RecurringRule } from "@prisma/client";
import { prisma } from "./prisma";
import type { CurrentUser } from "./session";
import { cardDueDate, currentMonth, dayInMonth, shiftMonth } from "./dates";

/** Quantos meses à frente as receitas/despesas fixas são geradas automaticamente. */
export const HORIZON_MONTHS = 12;
/** Limite máximo ao navegar para meses distantes. */
export const MAX_AHEAD_MONTHS = 36;

type RuleWithCard = RecurringRule & { card: CreditCard | null };

export const visibleRulesWhere = (user: CurrentUser): Prisma.RecurringRuleWhereInput => ({
  OR: [
    { scope: "PERSONAL", userId: user.id },
    { scope: "FAMILY", familyId: user.familyId },
  ],
});

function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to && out.length < 200; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

function rowFor(r: RuleWithCard, month: string): Prisma.TransactionCreateManyInput {
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
    status: "PENDING",
    paymentMethod: r.paymentMethod,
    cardId: r.cardId,
    userId: r.userId,
    familyId: r.familyId,
    ruleId: r.id,
    recurringMonth: month,
  };
}

/**
 * Garante que cada regra fixa ativa tenha seus lançamentos (pendentes) do mês atual
 * até `through` (padrão: 12 meses à frente). Idempotente: nunca duplica um mês.
 * Valores já editados/pagos de um mês específico são preservados.
 */
export async function ensureRecurring(user: CurrentUser, through?: string): Promise<number> {
  const now = currentMonth();
  const limit = shiftMonth(now, MAX_AHEAD_MONTHS);
  let last = through && /^\d{4}-\d{2}$/.test(through) ? through : shiftMonth(now, HORIZON_MONTHS);
  if (last < shiftMonth(now, HORIZON_MONTHS) && !through) last = shiftMonth(now, HORIZON_MONTHS);
  if (last > limit) last = limit;

  const rules = await prisma.recurringRule.findMany({ where: { AND: [{ active: true }, visibleRulesWhere(user)] }, include: { card: true } });
  if (!rules.length) return 0;

  const existing = await prisma.transaction.findMany({
    where: { ruleId: { in: rules.map((r) => r.id) }, recurringMonth: { gte: now, lte: last } },
    select: { ruleId: true, recurringMonth: true },
  });
  const have = new Set(existing.map((e) => `${e.ruleId}|${e.recurringMonth}`));

  const rows: Prisma.TransactionCreateManyInput[] = [];
  for (const r of rules) {
    const from = r.startMonth > now ? r.startMonth : now;
    const to = r.endMonth && r.endMonth < last ? r.endMonth : last;
    for (const m of monthsBetween(from, to)) if (!have.has(`${r.id}|${m}`)) rows.push(rowFor(r, m));
  }
  if (!rows.length) return 0;
  const res = await prisma.transaction.createMany({ data: rows, skipDuplicates: true });
  return res.count;
}

/** Gera explicitamente os meses informados (usado pelo botão manual, inclusive meses passados). */
export async function generateMonths(user: CurrentUser, months: string[]): Promise<{ generated: number; skipped: number }> {
  const rules = await prisma.recurringRule.findMany({ where: { AND: [{ active: true }, visibleRulesWhere(user)] }, include: { card: true } });
  const rows = rules.flatMap((r) => months.filter((m) => m >= r.startMonth && (!r.endMonth || m <= r.endMonth)).map((m) => rowFor(r, m)));
  const res = await prisma.transaction.createMany({ data: rows, skipDuplicates: true });
  return { generated: res.count, skipped: rows.length - res.count };
}

/** Remove os lançamentos futuros ainda pendentes de uma regra (ao pausar/excluir). Mês atual e passados permanecem. */
export async function removeFuturePending(ruleId: string): Promise<number> {
  const r = await prisma.transaction.deleteMany({ where: { ruleId, status: "PENDING", recurringMonth: { gt: currentMonth() } } });
  return r.count;
}
