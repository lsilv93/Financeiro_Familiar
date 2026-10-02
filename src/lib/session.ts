import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import type { Prisma, Scope } from "@prisma/client";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  familyId: string;
  emergencyReserve: number;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const u = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!u) return null;
  // Senha redefinida depois que esta sessão foi emitida -> sessão inválida.
  if (u.passwordChangedAt && (session.user.pwd ?? 0) < u.passwordChangedAt.getTime()) return null;
  return { id: u.id, name: u.name, email: u.email, familyId: u.familyId, emergencyReserve: Number(u.emergencyReserve) };
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new HttpError(401, "Não autenticado");
  return u;
}

/** Executa um handler convertendo erros em respostas JSON padronizadas. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn());
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message, ...e.extra }, { status: e.status });
    if (e && typeof e === "object" && "issues" in e) {
      const issues = (e as { issues: { path: (string | number)[]; message: string }[] }).issues;
      const msg = issues.map((i) => (i.path.length ? `${i.path.join(".")}: ` : "") + i.message).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export type ScopeFilter = "ALL" | "PERSONAL" | "FAMILY";

export function parseScopeFilter(v: string | null): ScopeFilter {
  return v === "PERSONAL" || v === "FAMILY" ? v : "ALL";
}

/**
 * Regra de visibilidade central:
 * - PERSONAL: somente o próprio usuário;
 * - FAMILY: todos os membros da mesma família.
 */
export function visibleWhere(user: CurrentUser, filter: ScopeFilter = "ALL"): Prisma.TransactionWhereInput {
  const personal: Prisma.TransactionWhereInput = { scope: "PERSONAL", userId: user.id };
  const family: Prisma.TransactionWhereInput = { scope: "FAMILY", familyId: user.familyId };
  if (filter === "PERSONAL") return personal;
  if (filter === "FAMILY") return family;
  return { OR: [personal, family] };
}

export function scopeWhereFor(user: CurrentUser, scope: Scope): Prisma.TransactionWhereInput {
  return visibleWhere(user, scope);
}
