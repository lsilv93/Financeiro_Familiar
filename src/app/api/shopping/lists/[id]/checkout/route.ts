import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser } from "@/lib/session";
import { shoppingCheckoutSchema } from "@/lib/validation";
import { closeIfComplete, familyList } from "@/lib/shoppingLists";
import { getUsableCard, resolveDueDate } from "@/lib/finance";
import { parseDay, todayStr } from "@/lib/dates";
import { isValidCategory, EXPENSE_CATEGORIES } from "@/lib/categories";
import { notify } from "@/lib/family";

export const dynamic = "force-dynamic";

/**
 * "Finalizar compra": os itens marcados saem da lista (não podem mais ser selecionados),
 * a despesa é lançada na categoria escolhida e, se a lista ficar 100% comprada, ela é encerrada.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const list = await familyList((await ctx.params).id, user.familyId);
    if (list.status === "CLOSED") throw new HttpError(400, "Esta lista já foi encerrada.");
    const b = shoppingCheckoutSchema.parse(await req.json());
    if (!isValidCategory("EXPENSE", b.category)) throw new HttpError(400, "Categoria inválida");
    if (b.subcategory && !EXPENSE_CATEGORIES[b.category]?.subs.includes(b.subcategory)) throw new HttpError(400, "Subcategoria inválida");
    const ids = [...new Set(b.itemIds)];

    const isCredit = b.paymentMethod === "CREDIT";
    const card = isCredit ? await getUsableCard(user, b.cardId ?? "") : null;
    const date = b.date ?? todayStr();

    const names = await prisma.shoppingItem.findMany({ where: { id: { in: ids }, listId: list.id }, select: { id: true, name: true } });
    if (names.length !== ids.length) throw new HttpError(404, "Algum item não pertence a esta lista");

    const n = ids.length;
    const txId = await prisma.$transaction(async (db) => {
      // Atômico: se outra pessoa já comprou algum dos itens, nada é alterado (evita comprar/lançar em dobro).
      const r = await db.shoppingItem.updateMany({ where: { id: { in: ids }, listId: list.id, status: { not: "BOUGHT" } }, data: { status: "BOUGHT", boughtAt: new Date(), boughtById: user.id } });
      if (r.count !== ids.length) throw new HttpError(409, "Alguns itens já foram comprados por outra pessoa. Atualize a lista e marque de novo.");
      const tx = await db.transaction.create({
        data: {
          type: "EXPENSE",
          scope: b.scope,
          description: b.note ? `${list.name}: ${b.note}` : `${list.name} (${n} ${n === 1 ? "item" : "itens"})`,
          amount: b.amount,
          category: b.category,
          subcategory: b.subcategory ?? (b.category === "ALIMENTACAO" ? "Mercado" : null),
          date: parseDay(date),
          dueDate: resolveDueDate(date, null, card),
          status: isCredit ? "PENDING" : "PAID",
          paidAt: isCredit ? null : new Date(),
          paymentMethod: b.paymentMethod,
          cardId: card?.id ?? null,
          userId: user.id,
          familyId: user.familyId,
        },
      });
      await db.shoppingItem.updateMany({ where: { id: { in: ids } }, data: { transactionId: tx.id } });
      return tx.id;
    });

    const closed = await closeIfComplete(list.id);
    const others = await prisma.user.findMany({ where: { familyId: user.familyId, id: { not: user.id }, awaitingApproval: false }, select: { id: true } });
    await Promise.all(others.map((o) => notify(o.id, { type: "SHOPPING", title: closed ? "Lista de compras encerrada" : "Compra finalizada", body: `${user.name.split(" ")[0]} comprou ${n} ${n === 1 ? "item" : "itens"} da lista “${list.name}”: ${names.slice(0, 4).map((x) => x.name).join(", ")}${n > 4 ? "…" : ""}.${closed ? " A lista foi encerrada (100% comprada)." : ""}` })));
    return { ok: true, items: n, transactionId: txId, closed };
  });
}
