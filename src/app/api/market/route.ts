import { handle, requireUser } from "@/lib/session";
import { loadMarket, type Indicator } from "@/lib/news";
import { getDaily } from "@/lib/dailyCache";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

/** Valores do dia (câmbio, juros/inflação e bolsa). Atualiza uma vez por dia no primeiro acesso. */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    await rateLimit(`market:user:${user.id}`, 60, 5);
    const { value, fetchedAt, stale } = await getDaily<{ indicators: Indicator[] }>("market:v2", loadMarket, (v) => v.indicators.length > 0);
    return { indicators: value?.indicators ?? [], updatedAt: fetchedAt?.toISOString() ?? null, stale };
  });
}
