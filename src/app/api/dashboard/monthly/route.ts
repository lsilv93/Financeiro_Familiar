import { handle, parseScopeFilter, requireUser } from "@/lib/session";
import { monthlyComparison } from "@/lib/monthly";
import { currentMonth, isMonth, shiftMonth } from "@/lib/dates";
import { MAX_AHEAD_MONTHS } from "@/lib/recurring";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const q = new URL(req.url).searchParams;
    const now = currentMonth();
    let end = q.get("end") ?? now;
    if (!isMonth(end)) end = now;
    if (end > shiftMonth(now, MAX_AHEAD_MONTHS)) end = shiftMonth(now, MAX_AHEAD_MONTHS);
    const n = Number(q.get("months"));
    const months = n === 6 || n === 12 || n === 24 ? n : 12;
    return monthlyComparison(user, { end, months, filter: parseScopeFilter(q.get("scope")) });
  });
}
