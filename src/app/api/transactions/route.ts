import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handle, parseScopeFilter, requireUser, visibleWhere } from "@/lib/session";
import { transactionSchema } from "@/lib/validation";
import { getUsableCard, resolveDueDate, serializeTx, txInclude } from "@/lib/finance";
import { dayInMonth, fmtDay, monthOf, parseDay, shiftMonth, isMonth } from "@/lib/dates";
import { num, round2, splitInstallments } from "@/lib/money";
import { ensureRecurring } from "@/lib/recurring";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const q = new URL(req.url).searchParams;
    const wantMonth = q.get("month") ?? (q.get("to") ? q.get("to")!.slice(0, 7) : undefined);
    await ensureRecurring(user, wantMonth && isMonth(wantMonth) ? wantMonth : undefined);
    const filters: Prisma.TransactionWhereInput[] = [visibleWhere(user, parseScopeFilter(q.get("scope")))];

    const month = q.get("month");
    const from = q.get("from");
    const to = q.get("to");
    if (month && isMonth(month)) {
      filters.push({ dueDate: { gte: parseDay(`${month}-01`), lt: parseDay(`${shiftMonth(month, 1)}-01`) } });
    } else if (from || to) {
      filters.push({ dueDate: { ...(from ? { gte: parseDay(from) } : {}), ...(to ? { lte: parseDay(to) } : {}) } });
    }
    const type = q.get("type");
    if (type === "INCOME" || type === "EXPENSE") filters.push({ type });
    const method = q.get("method");
    if (method && ["PIX", "CASH", "DEBIT", "CREDIT"].includes(method)) filters.push({ paymentMethod: method as "PIX" });
    const status = q.get("status");
    if (status === "PAID" || status === "PENDING") filters.push({ status });
    const category = q.get("category");
    if (category) filters.push({ category });
    const cardId = q.get("cardId");
    if (cardId) filters.push({ cardId });
    const search = q.get("q")?.trim().slice(0, 100);
    if (search) filters.push({ description: { contains: search, mode: "insensitive" } });

    const where: Prisma.TransactionWhereInput = { AND: filters };
    const page = Math.max(1, Number(q.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(q.get("pageSize")) || 30));

    const [items, total, agg] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: txInclude,
        orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
    ]);
    const income = num(agg.find((a) => a.type === "INCOME")?._sum.amount);
    const expense = num(agg.find((a) => a.type === "EXPENSE")?._sum.amount);
    return { items: items.map(serializeTx), total, page, pageSize, totals: { income, expense, balance: round2(income - expense) } };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const b = transactionSchema.parse(await req.json());
    const isCredit = b.type === "EXPENSE" && b.paymentMethod === "CREDIT";
    const card = isCredit ? await getUsableCard(user, b.cardId!) : null;
    const method = b.type === "EXPENSE" ? b.paymentMethod! : null;
    const firstDue = resolveDueDate(b.date, b.dueDate, card);
    const common = {
      type: b.type,
      scope: b.scope,
      description: b.description,
      category: b.category,
      subcategory: b.subcategory,
      date: parseDay(b.date),
      paymentMethod: method,
      cardId: card?.id ?? null,
      userId: user.id,
      familyId: user.familyId,
    };

    // Parcelado: cria o plano + uma transação por parcela (apenas a 1ª respeita o status informado).
    if (b.installments > 1) {
      const parts = splitInstallments(b.amount, b.installments);
      const dueDay = firstDue.getUTCDate();
      const plan = await prisma.installmentPlan.create({
        data: {
          description: b.description,
          totalAmount: b.amount,
          installmentsCount: b.installments,
          category: b.category,
          subcategory: b.subcategory,
          paymentMethod: method!,
          scope: b.scope,
          userId: user.id,
          familyId: user.familyId,
          cardId: card?.id ?? null,
          transactions: {
            create: parts.map((amount, i) => ({
              ...common,
              amount,
              dueDate: dayInMonth(shiftMonth(monthOf(firstDue), i), dueDay),
              installmentNumber: i + 1,
              status: i === 0 ? b.status : "PENDING",
              paidAt: i === 0 && b.status === "PAID" ? new Date() : null,
            })),
          },
        },
        include: { transactions: true },
      });
      return { id: plan.transactions[0].id, planId: plan.id, created: b.installments };
    }

    // Mês-rótulo da recorrência: cartão = mês da compra; demais = mês do vencimento.
    const label = card ? monthOf(parseDay(b.date)) : monthOf(firstDue);
    const tx = await prisma.$transaction(async (db) => {
      let ruleId: string | null = null;
      if (b.recurring) {
        const rule = await db.recurringRule.create({
          data: {
            type: b.type,
            description: b.description,
            amount: b.amount,
            category: b.category,
            subcategory: b.subcategory,
            paymentMethod: method,
            // cartão: dia da compra; demais: dia do vencimento
            dayOfMonth: (card ? parseDay(b.date) : firstDue).getUTCDate(),
            startMonth: label,
            endMonth: b.repeatMonths ? shiftMonth(label, b.repeatMonths - 1) : null,
            scope: b.scope,
            userId: user.id,
            familyId: user.familyId,
            cardId: card?.id ?? null,
          },
        });
        ruleId = rule.id;
      }
      return db.transaction.create({
        data: {
          ...common,
          amount: b.amount,
          dueDate: firstDue,
          status: b.status,
          paidAt: b.status === "PAID" ? new Date() : null,
          ruleId,
          recurringMonth: ruleId ? label : null,
        },
      });
    });
    let replicated = 0;
    if (b.recurring) replicated = await ensureRecurring(user);
    return { id: tx.id, created: 1 + replicated, replicated, dueDate: fmtDay(tx.dueDate) };
  });
}
