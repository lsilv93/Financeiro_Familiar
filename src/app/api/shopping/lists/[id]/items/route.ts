import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser } from "@/lib/session";
import { shoppingAddSchema } from "@/lib/validation";
import { familyList } from "@/lib/shoppingLists";
import { currentMonth } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const list = await familyList((await ctx.params).id, user.familyId);
    if (list.status === "CLOSED") throw new HttpError(400, "Esta lista já foi encerrada.");
    const b = shoppingAddSchema.parse(await req.json());
    const dup = await prisma.shoppingItem.findFirst({ where: { listId: list.id, status: { not: "BOUGHT" }, name: { equals: b.name, mode: "insensitive" } } });
    if (dup) throw new HttpError(409, `“${dup.name}” já está nesta lista.`);
    if ((await prisma.shoppingItem.count({ where: { listId: list.id } })) >= 300) throw new HttpError(400, "A lista chegou ao limite de 300 itens.");
    const item = await prisma.shoppingItem.create({ data: { name: b.name, quantity: b.quantity, month: currentMonth(), createdById: user.id, familyId: user.familyId, listId: list.id } });
    return { id: item.id };
  });
}
