import { createHash } from "crypto";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { HttpError } from "./session";

export const MAX_INVITE_FAILURES = 3;
export const BLOCK_MINUTES = 30;
export const MAX_FAMILY_MEMBERS = 12;

export const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);

/** IP do cliente (a Vercel preenche x-forwarded-for) -> chave anônima (hash). */
export async function ipKey(prefix: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return `${prefix}:ip:${sha(ip)}`;
}

export async function blockedMinutes(keys: string[]): Promise<number> {
  const now = new Date();
  const rows = await prisma.attemptLimit.findMany({ where: { key: { in: keys }, blockedUntil: { gt: now } } });
  if (!rows.length) return 0;
  const until = Math.max(...rows.map((r) => r.blockedUntil!.getTime()));
  return Math.max(1, Math.ceil((until - now.getTime()) / 60000));
}

export async function assertNotBlocked(keys: string[]): Promise<void> {
  const min = await blockedMinutes(keys);
  if (min > 0) throw new HttpError(429, `Muitas tentativas inválidas. Por segurança, tente novamente em ${min} minuto(s).`);
}

/** Conta uma falha; ao atingir `max` bloqueia a chave por `blockMin` minutos. Retorna se ficou bloqueada. */
export async function registerFailure(keys: string[], max = MAX_INVITE_FAILURES, blockMin = BLOCK_MINUTES): Promise<boolean> {
  const now = new Date();
  let blocked = false;
  for (const key of keys) {
    const cur = await prisma.attemptLimit.findUnique({ where: { key } });
    const stale = cur && ((cur.blockedUntil && cur.blockedUntil <= now) || now.getTime() - cur.windowStart.getTime() > blockMin * 60000);
    const count = !cur || stale ? 1 : cur.count + 1;
    const blockedUntil = count >= max ? new Date(now.getTime() + blockMin * 60000) : null;
    if (blockedUntil) blocked = true;
    await prisma.attemptLimit.upsert({
      where: { key },
      create: { key, count, windowStart: now, blockedUntil },
      update: { count, windowStart: !cur || stale ? now : cur.windowStart, blockedUntil },
    });
  }
  return blocked;
}

export async function clearFailures(keys: string[]): Promise<void> {
  await prisma.attemptLimit.deleteMany({ where: { key: { in: keys } } });
}

/** Chaves usadas nas tentativas de código de convite (por IP e, se logado, por usuário). */
export async function inviteKeys(userId?: string): Promise<string[]> {
  return [await ipKey("invite"), ...(userId ? [`invite:user:${userId}`] : [])];
}

/** Valida um código de convite aplicando o limite de tentativas. Retorna a família ou null. */
export async function lookupInvite(code: string, userId?: string) {
  const keys = await inviteKeys(userId);
  await assertNotBlocked(keys);
  const clean = code.trim().toUpperCase();
  const fam = clean.length >= 4 && clean.length <= 20 ? await prisma.family.findUnique({ where: { inviteCode: clean }, select: { id: true, name: true, _count: { select: { members: true } } } }) : null;
  if (!fam) {
    const nowBlocked = await registerFailure(keys);
    if (nowBlocked) throw new HttpError(429, `Código inválido. Após ${MAX_INVITE_FAILURES} tentativas inválidas o acesso por convite foi bloqueado por ${BLOCK_MINUTES} minutos.`);
    return null;
  }
  if (fam._count.members >= MAX_FAMILY_MEMBERS) throw new HttpError(400, "Esta família atingiu o limite de membros.");
  return fam;
}

/** Limitador genérico (conta todas as chamadas). Lança 429 ao exceder. */
export async function rateLimit(key: string, max: number, windowMin: number): Promise<void> {
  const blocked = await registerFailure([key], max, windowMin);
  if (blocked) throw new HttpError(429, "Muitas solicitações. Tente novamente mais tarde.");
}
