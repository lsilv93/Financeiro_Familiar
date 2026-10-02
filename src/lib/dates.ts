// Todas as datas "só dia" são tratadas em UTC (00:00Z) para evitar deslocamento de fuso.
const TZ = "America/Sao_Paulo";

export function parseDay(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function fmtDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function today(): Date {
  return parseDay(todayStr());
}

export function currentMonth(): string {
  return todayStr().slice(0, 7);
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** Início (inclusive) e fim (exclusivo) de um mês "YYYY-MM". */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

export function monthOf(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Data no mês `month` com o dia `day`, ajustando para o último dia se o mês for curto. */
export function dayInMonth(month: string, day: number): Date {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, Math.min(day, daysInMonth(y, m - 1))));
}

export function isMonth(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

/**
 * Vencimento da fatura de um cartão para uma compra em `purchase`.
 * - Com dia de fechamento: compras após o fechamento caem na fatura seguinte.
 * - Sem fechamento: vence no primeiro `dueDay` igual ou posterior à compra.
 */
export function cardDueDate(purchase: Date, dueDay: number, closingDay?: number | null): Date {
  const pm = monthOf(purchase);
  const pd = purchase.getUTCDate();
  if (closingDay) {
    const invoiceMonth = pd > closingDay ? shiftMonth(pm, 1) : pm;
    const dueMonth = dueDay > closingDay ? invoiceMonth : shiftMonth(invoiceMonth, 1);
    return dayInMonth(dueMonth, dueDay);
  }
  const sameMonth = dayInMonth(pm, dueDay);
  return sameMonth >= purchase ? sameMonth : dayInMonth(shiftMonth(pm, 1), dueDay);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Segunda-feira da semana que contém `d`. */
export function startOfWeek(d: Date): Date {
  return addDays(d, -((d.getUTCDay() + 6) % 7));
}

export type Period = "day" | "week" | "month" | "year" | "total";

export function isPeriod(v: string | null): v is Period {
  return v === "day" || v === "week" || v === "month" || v === "year" || v === "total";
}
