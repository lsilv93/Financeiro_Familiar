import { prisma } from "./prisma";
import type { CurrentUser } from "./session";
import type { Scope } from "@prisma/client";
import { savingsWhere } from "./dashboard";
import { num, round2 } from "./money";

export async function bankBalance(user: CurrentUser, scope: Scope, bank: string): Promise<{ balance: number; canonical: string | null }> {
  const rows = await prisma.savingsEntry.findMany({
    where: { AND: [savingsWhere(user, scope), { bank: { equals: bank, mode: "insensitive" } }] },
    select: { kind: true, amount: true, bank: true },
  });
  const balance = rows.reduce((a, r) => a + (r.kind === "DEPOSIT" ? 1 : -1) * num(r.amount), 0);
  return { balance: round2(balance), canonical: rows[0]?.bank ?? null };
}
