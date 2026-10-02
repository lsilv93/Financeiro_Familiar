import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser } from "@/lib/session";
import { shoppingItemEditSchema } from "@/lib/validation";
import { closeIfComplete } from "@/lib/shoppingLists";

export const dynamic = "force-dynamic";

async function pendingItem(id: string, familyId: string) {
  const item = await prisma.shoppingItem.findFirst({ where: { id, familyId } });
  if (!item) throw new HttpError(404, "Item não encontrado");
  if (item.status === "BOUGHT") throw new HttpError(409, "Este item já foi comprado e não pode mais ser alterado.");
  return item;
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const item = await pendingItem((await ctx.params).id, user.familyId);
    const b = shoppingItemEditSchema.parse(await req.json());
    await prisma.shoppingItem.update({ where: { id: item.id }, data: { ...(b.name ? { name: b.name } : {}), ...(b.quantity !== undefined ? { quantity: b.quantity || null } : {}) } });
    return { ok: true };
  });
}

/** Remove um item pendente da lista (se era o último pendente, a lista é encerrada). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const item = await pendingItem((await ctx.params).id, user.familyId);
    await prisma.shoppingItem.delete({ where: { id: item.id } });
    const closed = await closeIfComplete(item.listId);
    return { deleted: true, closed };
  });
}
