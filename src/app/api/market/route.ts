import { handle, requireUser } from "@/lib/session";
import { loadMarket } from "@/lib/news";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    await rateLimit(`market:user:${user.id}`, 60, 5);
    return loadMarket();
  });
}
