import { prisma } from "@/lib/prisma";
import { handle, requireUser } from "@/lib/session";
import { num } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const rules = await prisma.recurringRule.findMany({
      where: { OR: [{ scope: "PERSONAL", userId: user.id }, { scope: "FAMILY", familyId: user.familyId }] },
      include: { card: { select: { name: true } } },
      orderBy: [{ active: "desc" }, { dayOfMonth: "asc" }],
    });
    return rules.map((r) => ({
      id: r.id,
      type: r.type,
      description: r.description,
      amount: num(r.amount),
      category: r.category,
      subcategory: r.subcategory,
      paymentMethod: r.paymentMethod,
      cardName: r.card?.name ?? null,
      dayOfMonth: r.dayOfMonth,
      scope: r.scope,
      active: r.active,
    }));
  });
}
