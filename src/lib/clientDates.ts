export type Period = "day" | "week" | "month" | "year" | "total";

export function currentMonthClient(): string {
  return todayClient().slice(0, 7);
}

export function todayClient(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const f = (x: Date) => x.toISOString().slice(0, 10);

/** Move a data de referência de acordo com o período (dia, semana, mês ou ano). */
export function shiftRef(period: Period, ref: string, delta: number): string {
  const x = d(ref);
  if (period === "day") x.setUTCDate(x.getUTCDate() + delta);
  else if (period === "week") x.setUTCDate(x.getUTCDate() + 7 * delta);
  else if (period === "month") { x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() + delta); }
  else if (period === "year") { x.setUTCDate(1); x.setUTCMonth(0); x.setUTCFullYear(x.getUTCFullYear() + delta); }
  return f(x);
}

const br = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

export function periodLabel(period: Period, ref: string, range?: { start: string; end: string }): string {
  if (period === "total") return "Todo o período";
  if (period === "day") return ref === todayClient() ? "Hoje" : `${br(ref)}/${ref.slice(0, 4)}`;
  if (period === "week") return range ? `${br(range.start)} a ${br(range.end)}` : "Semana";
  if (period === "year") return ref.slice(0, 4);
  const s = d(ref.slice(0, 7) + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Intervalo [from, to] (inclusive) do período, na data de referência. */
export function rangeOf(period: Period, ref: string): { from: string; to: string } {
  const x = d(ref);
  if (period === "day") return { from: ref, to: ref };
  if (period === "week") {
    const s = new Date(x); s.setUTCDate(s.getUTCDate() - ((s.getUTCDay() + 6) % 7));
    const e = new Date(s); e.setUTCDate(e.getUTCDate() + 6);
    return { from: f(s), to: f(e) };
  }
  if (period === "year") return { from: `${ref.slice(0, 4)}-01-01`, to: `${ref.slice(0, 4)}-12-31` };
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0));
  return { from: `${ref.slice(0, 7)}-01`, to: f(last) };
}

export function addDaysStr(s: string, n: number): string {
  const x = d(s); x.setUTCDate(x.getUTCDate() + n); return f(x);
}
