import { handle, parseScopeFilter, requireUser } from "@/lib/session";
import { dashboard } from "@/lib/finance";
import { currentMonth, isMonth } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const q = new URL(req.url).searchParams;
    const m = q.get("month");
    return dashboard(user, m && isMonth(m) ? m : currentMonth(), parseScopeFilter(q.get("scope")));
  });
}
