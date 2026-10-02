import { prisma } from "@/lib/prisma";
import { HttpError, handle, parseScopeFilter, requireUser } from "@/lib/session";
import { savingsSchema } from "@/lib/validation";
import { savingsWhere } from "@/lib/dashboard";
import { bankBalance } from "@/lib/savings";
import { fmtDay, monthOf, parseDay, shiftMonth, today } from "@/lib/dates";
import { num, round2 } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const q = new URL(req.url).searchParams;
    const where = savingsWhere(user, parseScopeFilter(q.get("scope")));
    const entries = await prisma.savingsEntry.findMany({ where, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });

    const banks = new Map<string, { bank: string; deposits: number; withdrawals: number }>();
    for (const e of entries) {
      const k = e.bank.toLowerCase();
      const b = banks.get(k) ?? { bank: e.bank, deposits: 0, withdrawals: 0 };
      if (e.kind === "DEPOSIT") b.deposits += num(e.amount);
      else b.withdrawals += num(e.amount);
      banks.set(k, b);
    }
    const bankList = [...banks.values()]
      .map((b) => ({ bank: b.bank, deposits: round2(b.deposits), withdrawals: round2(b.withdrawals), balance: round2(b.deposits - b.withdrawals) }))
      .sort((a, b) => b.balance - a.balance);
    const total = round2(bankList.reduce((a, b) => a + b.balance, 0));

    // Evolução do saldo (últimos 12 meses, acumulado).
    const t0 = today();
    const start = shiftMonth(monthOf(t0), -11);
    let running = 0;
    const evolution: { month: string; balance: number }[] = [];
    const byMonth = new Map<string, number>();
    for (const e of entries) {
      const m = monthOf(e.date);
      byMonth.set(m, (byMonth.get(m) ?? 0) + (e.kind === "DEPOSIT" ? 1 : -1) * num(e.amount));
    }
    const before = [...byMonth.entries()].filter(([m]) => m < start).reduce((a, [, v]) => a + v, 0);
    running = before;
    for (let m = start; m <= monthOf(t0); m = shiftMonth(m, 1)) {
      running += byMonth.get(m) ?? 0;
      evolution.push({ month: m, balance: round2(running) });
    }

    const thisMonth = monthOf(t0);
    const mEntries = entries.filter((e) => monthOf(e.date) === thisMonth);
    const family = await prisma.family.findUnique({ where: { id: user.familyId }, select: { emergencyReserve: true } });
    return {
      total,
      banks: bankList,
      evolution,
      month: {
        deposited: round2(mEntries.filter((e) => e.kind === "DEPOSIT").reduce((a, e) => a + num(e.amount), 0)),
        withdrawn: round2(mEntries.filter((e) => e.kind === "WITHDRAWAL").reduce((a, e) => a + num(e.amount), 0)),
      },
      goal: { personal: user.emergencyReserve, family: num(family?.emergencyReserve) },
      knownBanks: bankList.map((b) => b.bank),
      entries: entries.slice(0, 100).map((e) => ({ id: e.id, kind: e.kind, bank: e.bank, amount: num(e.amount), date: fmtDay(e.date), note: e.note, scope: e.scope, mine: e.userId === user.id })),
    };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const b = savingsSchema.parse(await req.json());
    const { balance, canonical } = await bankBalance(user, b.scope, b.bank);
    if (b.kind === "WITHDRAWAL") {
      if (!b.confirmed) throw new HttpError(400, "Confirme o resgate: reserva é para ser guardada e não mexida.");
      if (b.amount > balance + 0.001) throw new HttpError(400, `Saldo insuficiente em ${canonical ?? b.bank}: disponível R$ ${balance.toFixed(2).replace(".", ",")}.`);
    }
    const e = await prisma.savingsEntry.create({
      data: { kind: b.kind, bank: canonical ?? b.bank, amount: b.amount, date: parseDay(b.date), note: b.note, scope: b.scope, userId: user.id, familyId: user.familyId },
    });
    return { id: e.id };
  });
}
