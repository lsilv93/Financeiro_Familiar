import { prisma } from "./prisma";

const SP = "America/Sao_Paulo";
const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: SP }).format(d);

/**
 * Cache de dados externos que atualiza UMA vez por dia (fuso de São Paulo):
 * o primeiro acesso do dia busca nas fontes e grava; os demais leem do banco.
 * Se a busca falhar, devolve o último valor gravado (marcado como `stale`).
 */
export async function getDaily<T>(key: string, loader: () => Promise<T>, isUsable: (v: T) => boolean): Promise<{ value: T | null; fetchedAt: Date | null; stale: boolean }> {
  const cur = await prisma.cacheEntry.findUnique({ where: { key } });
  if (cur && dayOf(cur.fetchedAt) === dayOf(new Date())) return { value: cur.value as T, fetchedAt: cur.fetchedAt, stale: false };
  try {
    const fresh = await loader();
    if (isUsable(fresh)) {
      const row = await prisma.cacheEntry.upsert({ where: { key }, create: { key, value: fresh as object }, update: { value: fresh as object, fetchedAt: new Date() } });
      return { value: fresh, fetchedAt: row.fetchedAt, stale: false };
    }
  } catch (e) {
    console.error(`[dailyCache:${key}]`, e instanceof Error ? e.message : e);
  }
  return cur ? { value: cur.value as T, fetchedAt: cur.fetchedAt, stale: true } : { value: null, fetchedAt: null, stale: true };
}
