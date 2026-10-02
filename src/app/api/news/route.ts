import { handle, requireUser } from "@/lib/session";
import { loadNews, type NewsCategory } from "@/lib/news";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    await rateLimit(`news:user:${user.id}`, 40, 5); // 40 consultas / 5 min por usuário
    const cat = new URL(req.url).searchParams.get("cat") as NewsCategory | null;
    const { items, sources } = await loadNews();
    const filtered = cat && ["dolar", "inflacao", "investimentos", "brasil"].includes(cat) ? items.filter((n) => n.category === cat) : items;
    const counts = { dolar: 0, inflacao: 0, investimentos: 0, brasil: 0 } as Record<NewsCategory, number>;
    for (const n of items) counts[n.category]++;
    return { items: filtered.slice(0, 60), sources, counts, updatedAt: new Date().toISOString() };
  });
}
