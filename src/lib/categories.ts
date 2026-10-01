export type CategoryDef = { label: string; color: string; subs: string[] };

export const EXPENSE_CATEGORIES: Record<string, CategoryDef> = {
  ALIMENTACAO: { label: "Alimentação", color: "#f97316", subs: ["Mercado", "Padaria", "iFood", "Restaurantes"] },
  TRANSPORTE: { label: "Transporte/Veículo", color: "#3b82f6", subs: ["Gasolina", "Sem Parar", "Uber", "Manutenção", "Parcela do Carro"] },
  MORADIA: { label: "Moradia", color: "#8b5cf6", subs: ["Aluguel/Condomínio", "Parcela do Apê", "Luz", "Água", "Internet"] },
  SAUDE: { label: "Saúde & Bem-estar", color: "#ef4444", subs: ["Farmácia", "Plano de Saúde", "Academia"] },
  LAZER: { label: "Lazer & Estilo de Vida", color: "#ec4899", subs: ["Assinaturas/Streaming", "Viagens", "Compras"] },
  EDUCACAO: { label: "Educação", color: "#06b6d4", subs: ["Cursos", "Faculdade", "Livros"] },
  DIZIMOS: { label: "Dízimos, Ofertas e Doações", color: "#eab308", subs: ["Dízimo", "Oferta", "Doação"] },
  INVESTIMENTOS: { label: "Investimentos & Aportes", color: "#10b981", subs: ["Ações", "Renda Fixa", "Reserva de Emergência"] },
  TARIFAS: { label: "Tarifas & Impostos", color: "#64748b", subs: ["IPVA", "IPTU", "Tarifas Bancárias"] },
  OUTROS: { label: "Outros", color: "#94a3b8", subs: [] },
};

export const INCOME_CATEGORIES: Record<string, { label: string }> = {
  SALARIO: { label: "Salário" },
  PLR: { label: "PLR" },
  DECIMO_TERCEIRO: { label: "13º Salário" },
  FERIAS: { label: "Férias" },
  HORA_EXTRA: { label: "Hora Extra" },
  FREELANCE: { label: "Trabalhos Externos (Freelance)" },
  PREMIACAO: { label: "Premiação" },
  EMPRESTIMOS: { label: "Empréstimos" },
  REND_INVESTIMENTOS: { label: "Rendimento de Investimentos" },
  OUTROS: { label: "Outros" },
};

export const PAYMENT_METHODS = {
  PIX: "Pix",
  CASH: "Dinheiro",
  DEBIT: "Débito",
  CREDIT: "Cartão de Crédito",
} as const;

export const INVESTMENT_KEY = "INVESTIMENTOS";
export const TITHE_KEY = "DIZIMOS";
export const RESERVE_SUB = "Reserva de Emergência";

export function categoryLabel(type: "INCOME" | "EXPENSE", key: string): string {
  return (type === "INCOME" ? INCOME_CATEGORIES[key]?.label : EXPENSE_CATEGORIES[key]?.label) ?? key;
}

export function isValidCategory(type: "INCOME" | "EXPENSE", key: string): boolean {
  return type === "INCOME" ? key in INCOME_CATEGORIES : key in EXPENSE_CATEGORIES;
}
