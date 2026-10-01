import type { Prisma } from "@prisma/client";

export const num = (d: Prisma.Decimal | number | null | undefined): number => (d == null ? 0 : Number(d));

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Divide `total` em `n` parcelas em centavos; a última absorve a diferença. */
export function splitInstallments(total: number, n: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const parts = Array<number>(n).fill(base);
  parts[n - 1] += cents - base * n;
  return parts.map((c) => c / 100);
}
