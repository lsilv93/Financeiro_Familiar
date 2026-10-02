import { handle, requireUser } from "@/lib/session";
import { loadNews, CATEGORY_ORDER, type NewsItem, type NewsCategory } from "@/lib/news";
import { getDaily } from "@/lib/dailyCache";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

type Payload = { top: Record<NewsCategory, NewsItem[]>; sources: { name: string; ok: boolean }[] };

/** Principais notícias (até 3 por assunto). Atualiza uma vez por dia: o 1º acesso do dia busca nas fontes. */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    await rateLimit(`news:user:${user.id}`, 40, 5);
    const { value, fetchedAt, stale } = await getDaily<Payload>("news:v2", loadNews, (v) => CATEGORY_ORDER.some((c) => v.top[c].length > 0));
    return { top: value?.top ?? { dolar: [], inflacao: [], investimentos: [], brasil: [] }, sources: value?.sources ?? [], updatedAt: fetchedAt?.toISOString() ?? null, stale };
  });
}
