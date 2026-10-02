import { prisma } from "@/lib/prisma";
import { handle, requireUser } from "@/lib/session";
import { familyList } from "@/lib/shoppingLists";
import { num } from "@/lib/money";

export const dynamic = "force-dynamic";

/** Itens da lista e o histórico das compras já finalizadas nela. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const list = await familyList((await ctx.params).id, user.familyId);
    const members = await prisma.user.findMany({ where: { familyId: user.familyId }, select: { id: true, name: true } });
    const nameOf = new Map(members.map((m) => [m.id, m.name.split(" ")[0]]));
    const items = await prisma.shoppingItem.findMany({ where: { listId: list.id }, orderBy: [{ status: "asc" }, { createdAt: "asc" }] });

    const txIds = [...new Set(items.map((i) => i.transactionId).filter((x): x is string => !!x))];
    const txs = txIds.length ? await prisma.transaction.findMany({ where: { id: { in: txIds }, familyId: user.familyId }, select: { id: true, amount: true, paymentMethod: true, category: true, subcategory: true } }) : [];
    const tx = new Map(txs.map((t) => [t.id, t]));
    const groups = new Map<string, { key: string; boughtBy: string; boughtAt: string; amount: number | null; paymentMethod: string | null; category: string | null; items: string[] }>();
    for (const i of items.filter((x) => x.status === "BOUGHT")) {
      const key = i.transactionId ?? `${i.boughtById}|${i.boughtAt?.toISOString().slice(0, 16)}`;
      const t = i.transactionId ? tx.get(i.transactionId) : undefined;
      const g = groups.get(key) ?? { key, boughtBy: nameOf.get(i.boughtById ?? "") ?? "Alguém", boughtAt: i.boughtAt!.toISOString(), amount: t ? num(t.amount) : null, paymentMethod: t?.paymentMethod ?? null, category: t?.category ?? null, items: [] };
      g.items.push(i.name);
      groups.set(key, g);
    }
    return {
      list: { id: list.id, code: list.code, name: list.name, status: list.status, createdBy: nameOf.get(list.createdById) ?? "Alguém", createdAt: list.createdAt.toISOString(), closedAt: list.closedAt?.toISOString() ?? null },
      items: items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, bought: i.status === "BOUGHT", boughtBy: i.boughtById ? nameOf.get(i.boughtById) ?? null : null, boughtAt: i.boughtAt?.toISOString() ?? null })),
      purchases: [...groups.values()].sort((a, b) => b.boughtAt.localeCompare(a.boughtAt)),
    };
  });
}

/** Exclui a lista inteira (a tela pede confirmação). Despesas já lançadas permanecem. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const list = await familyList((await ctx.params).id, user.familyId);
    await prisma.shoppingList.delete({ where: { id: list.id } });
    return { deleted: true };
  });
}
