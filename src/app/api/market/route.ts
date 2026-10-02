import { handle, requireUser } from "@/lib/session";
import { loadMarket } from "@/lib/news";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await requireUser();
    return loadMarket();
  });
}
