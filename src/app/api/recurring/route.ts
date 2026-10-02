import { prisma } from "@/lib/prisma";
import { handle, requireUser } from "@/lib/session";
import { num } from "@/lib/money";
import { visibleRulesWhere } from "@/lib/recurring";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const rules = await prisma.recurringRule.findMany({
      where: visibleRulesWhere(user),
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
      startMonth: r.startMonth,
      endMonth: r.endMonth,
      scope: r.scope,
      active: r.active,
    }));
  });
}
