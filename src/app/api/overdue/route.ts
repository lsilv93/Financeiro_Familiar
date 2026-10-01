import { prisma } from "@/lib/prisma";
import { handle, parseScopeFilter, requireUser, visibleWhere } from "@/lib/session";
import { serializeTx, txInclude } from "@/lib/finance";
import { today } from "@/lib/dates";
import { round2 } from "@/lib/money";

export const dynamic = "force-dynamic";

/** Contas vencidas e a vencer (padrão: próximos 7 dias) ainda pendentes de pagamento. */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const q = new URL(req.url).searchParams;
    const days = Math.min(60, Math.max(1, Number(q.get("days")) || 7));
    const t0 = today();
    const limit = new Date(t0.getTime() + days * 86400000);
    const base = { AND: [visibleWhere(user, parseScopeFilter(q.get("scope"))), { type: "EXPENSE" as const, status: "PENDING" as const }] };

    const rows = await prisma.transaction.findMany({
      where: { AND: [...base.AND, { dueDate: { lte: limit } }] },
      include: txInclude,
      orderBy: { dueDate: "asc" },
    });
    const mapped = rows.map((t) => ({
      ...serializeTx(t),
      daysDiff: Math.round((t.dueDate.getTime() - t0.getTime()) / 86400000), // negativo = dias de atraso
    }));
    const overdue = mapped.filter((t) => t.daysDiff < 0);
    const upcoming = mapped.filter((t) => t.daysDiff >= 0);
    const total = (l: typeof mapped) => round2(l.reduce((a, t) => a + t.amount, 0));
    return { overdue, upcoming, overdueTotal: total(overdue), upcomingTotal: total(upcoming), days };
  });
}
