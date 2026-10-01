import { z } from "zod";
import { EXPENSE_CATEGORIES, isValidCategory } from "./categories";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)");
const optionalText = z.string().trim().max(80).optional().nullable().transform((v) => v || null);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(100),
  inviteCode: z.string().trim().toUpperCase().max(20).optional().nullable(),
  familyName: z.string().trim().max(80).optional().nullable(),
});

export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    scope: z.enum(["PERSONAL", "FAMILY"]),
    description: z.string().trim().min(1, "Informe a descrição").max(120),
    amount: z.coerce.number().positive("O valor deve ser maior que zero").max(1_000_000_000),
    category: z.string().min(1),
    subcategory: optionalText,
    date: day,
    dueDate: day.optional().nullable().transform((v) => v || null),
    status: z.enum(["PAID", "PENDING"]).default("PAID"),
    paymentMethod: z.enum(["PIX", "CASH", "DEBIT", "CREDIT"]).optional().nullable(),
    cardId: z.string().optional().nullable().transform((v) => v || null),
    installments: z.coerce.number().int().min(1).max(120).default(1),
    recurring: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (!isValidCategory(v.type, v.category)) ctx.addIssue({ code: "custom", path: ["category"], message: "Categoria inválida" });
    if (v.type === "EXPENSE") {
      if (!v.paymentMethod) ctx.addIssue({ code: "custom", path: ["paymentMethod"], message: "Escolha a forma de pagamento" });
      if (v.paymentMethod === "CREDIT" && !v.cardId) ctx.addIssue({ code: "custom", path: ["cardId"], message: "Escolha qual cartão de crédito foi utilizado" });
      if (v.subcategory && !EXPENSE_CATEGORIES[v.category]?.subs.includes(v.subcategory))
        ctx.addIssue({ code: "custom", path: ["subcategory"], message: "Subcategoria inválida" });
    }
    if (v.type === "INCOME" && v.installments > 1) ctx.addIssue({ code: "custom", path: ["installments"], message: "Receitas não podem ser parceladas" });
    if (v.installments > 1 && v.recurring) ctx.addIssue({ code: "custom", path: ["recurring"], message: "Parcelamento e recorrência não podem ser combinados" });
  });

export type TransactionInput = z.infer<typeof transactionSchema>;

export const budgetCheckSchema = z.object({
  scope: z.enum(["PERSONAL", "FAMILY"]),
  amount: z.coerce.number().positive(),
  installments: z.coerce.number().int().min(1).max(120).default(1),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  date: day,
  dueDate: day.optional().nullable().transform((v) => v || null),
  paymentMethod: z.enum(["PIX", "CASH", "DEBIT", "CREDIT"]).optional().nullable(),
  cardId: z.string().optional().nullable().transform((v) => v || null),
});

export const cardSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(60),
  limit: z.coerce.number().min(0).max(1_000_000_000),
  dueDay: z.coerce.number().int().min(1).max(31),
  closingDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  scope: z.enum(["PERSONAL", "FAMILY"]).default("PERSONAL"),
  active: z.boolean().optional(),
});

export const settingsSchema = z.object({
  emergencyReserve: z.coerce.number().min(0).max(1_000_000_000).optional(),
  familyEmergencyReserve: z.coerce.number().min(0).max(1_000_000_000).optional(),
  familyName: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(2).max(80).optional(),
});
