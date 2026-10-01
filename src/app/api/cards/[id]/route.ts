import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser } from "@/lib/session";
import { cardSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function ownCard(id: string) {
  const user = await requireUser();
  const card = await prisma.creditCard.findFirst({
    where: { id, OR: [{ scope: "PERSONAL", userId: user.id }, { scope: "FAMILY", familyId: user.familyId }] },
  });
  if (!card) throw new HttpError(404, "Cartão não encontrado");
  return card;
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const card = await ownCard((await ctx.params).id);
    const b = cardSchema.partial().parse(await req.json());
    await prisma.creditCard.update({
      where: { id: card.id },
      data: { name: b.name, limit: b.limit, dueDay: b.dueDay, closingDay: b.closingDay, active: b.active },
    });
    return { ok: true };
  });
}

/** Cartões com histórico são apenas arquivados, para não perder os lançamentos. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const card = await ownCard((await ctx.params).id);
    const used = await prisma.transaction.count({ where: { cardId: card.id } });
    if (used > 0) {
      await prisma.creditCard.update({ where: { id: card.id }, data: { active: false } });
      return { archived: true };
    }
    await prisma.creditCard.delete({ where: { id: card.id } });
    return { deleted: true };
  });
}
