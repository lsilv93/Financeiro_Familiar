export type Tx = {
  id: string;
  type: "INCOME" | "EXPENSE";
  scope: "PERSONAL" | "FAMILY";
  description: string;
  amount: number;
  category: string;
  subcategory: string | null;
  date: string;
  dueDate: string;
  status: "PAID" | "PENDING";
  paymentMethod: "PIX" | "CASH" | "DEBIT" | "CREDIT" | null;
  cardName: string | null;
  planId: string | null;
  installmentNumber: number | null;
  installmentsCount: number | null;
  recurringMonth: string | null;
};

export type Card = {
  id: string; name: string; limit: number; dueDay: number; closingDay: number | null;
  scope: "PERSONAL" | "FAMILY"; active: boolean; used: number; available: number; mine: boolean;
};
