import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser, visibleWhere } from "@/lib/session";
import { getUsableCard, resolveDueDate, serializeTx, txInclude } from "@/lib/finance";
import { parseDay } from "@/lib/dates";
import { isValidCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const updateSchema = z.object({
  description: z.string().trim().min(1).max(120).optional(),
  amount: z.coerce.number().positive().max(1_000_000_000).optional(),
  category: z.string().optional(),
  subcategory: z.string().max(80).nullable().optional(),
  date: day.optional(),
  dueDate: day.optional(),
  status: z.enum(["PAID", "PENDING"]).optional(),
  paymentMethod: z.enum(["PIX", "CASH", "DEBIT", "CREDIT"]).nullable().optional(),
  cardId: z.string().nullable().optional(),
});

async function findTx(id: string) {
  const user = await requireUser();
  const tx = await prisma.transaction.findFirst({ where: { AND: [{ id }, visibleWhere(user)] } });
  if (!tx) throw new HttpError(404, "Lançamento não encontrado");
  return { user, tx };
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { user, tx } = await findTx(id);
    const b = updateSchema.parse(await req.json());
    if (b.category && !isValidCategory(tx.type, b.category)) throw new HttpError(400, "Categoria inválida");

    const method = b.paymentMethod === undefined ? tx.paymentMethod : b.paymentMethod;
    const cardId = method === "CREDIT" ? (b.cardId === undefined ? tx.cardId : b.cardId) : null;
    if (tx.type === "EXPENSE" && !method) throw new HttpError(400, "Escolha a forma de pagamento");
    if (method === "CREDIT" && !cardId) throw new HttpError(400, "Escolha qual cartão de crédito foi utilizado");
    const card = cardId ? await getUsableCard(user, cardId) : null;

    const dateStr = b.date ?? tx.date.toISOString().slice(0, 10);
    const recompute = b.date !== undefined || b.cardId !== undefined || b.paymentMethod !== undefined;
    const dueDate = b.dueDate ? parseDay(b.dueDate) : recompute && card && !tx.planId ? resolveDueDate(dateStr, null, card) : tx.dueDate;

    const status = b.status ?? tx.status;
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        description: b.description,
        amount: b.amount,
        category: b.category,
        subcategory: b.subcategory,
        date: b.date ? parseDay(b.date) : undefined,
        dueDate,
        status,
        paidAt: status === "PAID" ? (tx.status === "PAID" ? tx.paidAt : new Date()) : null,
        paymentMethod: tx.type === "EXPENSE" ? method : null,
        cardId,
      },
      include: txInclude,
    });
    return serializeTx(updated);
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { tx } = await findTx(id);
    const wholePlan = new URL(req.url).searchParams.get("plan") === "true";
    if (wholePlan && tx.planId) {
      await prisma.installmentPlan.delete({ where: { id: tx.planId } }); // cascade nas parcelas
      return { deleted: "plan" };
    }
    await prisma.transaction.delete({ where: { id } });
    return { deleted: "transaction" };
  });
}
