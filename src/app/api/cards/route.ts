import { prisma } from "@/lib/prisma";
import { handle, requireUser } from "@/lib/session";
import { cardSchema } from "@/lib/validation";
import { num, round2 } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const cards = await prisma.creditCard.findMany({
      where: { OR: [{ scope: "PERSONAL", userId: user.id }, { scope: "FAMILY", familyId: user.familyId }] },
      orderBy: [{ active: "desc" }, { dueDay: "asc" }, { name: "asc" }],
    });
    // Limite usado = soma das compras ainda não pagas no cartão.
    const used = await prisma.transaction.groupBy({
      by: ["cardId"],
      where: { cardId: { in: cards.map((c) => c.id) }, status: "PENDING", type: "EXPENSE" },
      _sum: { amount: true },
    });
    return cards.map((c) => {
      const u = num(used.find((x) => x.cardId === c.id)?._sum.amount);
      return {
        id: c.id,
        name: c.name,
        limit: num(c.limit),
        dueDay: c.dueDay,
        closingDay: c.closingDay,
        scope: c.scope,
        active: c.active,
        used: round2(u),
        available: round2(num(c.limit) - u),
        mine: c.userId === user.id,
      };
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const b = cardSchema.parse(await req.json());
    const card = await prisma.creditCard.create({
      data: { name: b.name, limit: b.limit, dueDay: b.dueDay, closingDay: b.closingDay ?? null, scope: b.scope, userId: user.id, familyId: user.familyId },
    });
    return { id: card.id };
  });
}
