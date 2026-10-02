export type Indicator = { code: string; name: string; group: "cambio" | "juros" | "bolsa"; value: number; unit: "BRL" | "%" | "% a.a." | "pts" | "USD"; pct: number | null; date: string | null };

const nf = (n: number, d = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function fmtIndicator(i: Indicator): string {
  switch (i.unit) {
    case "BRL": return i.code === "BTCBRL" ? `R$ ${nf(i.value, 0)}` : `R$ ${nf(i.value, 4).replace(/0{1,2}$/, "")}`;
    case "USD": return `US$ ${nf(i.value, 2)}`;
    case "pts": return `${nf(i.value, 0)} pts`;
    case "% a.a.": return `${nf(i.value)}% a.a.`;
    default: return `${nf(i.value)}%`;
  }
}

export const refDate = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "");
