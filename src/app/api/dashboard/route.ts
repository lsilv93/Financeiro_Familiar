import { handle, parseScopeFilter, requireUser } from "@/lib/session";
import { dashboard } from "@/lib/dashboard";
import { isMonth, isPeriod, todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

const isDay = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const q = new URL(req.url).searchParams;
    const legacyMonth = q.get("month");
    const period = isPeriod(q.get("period")) ? (q.get("period") as "day") : "month";
    let ref = q.get("ref");
    if (!isDay(ref)) ref = legacyMonth && isMonth(legacyMonth) ? `${legacyMonth}-01` : todayStr();
    return dashboard(user, { period, ref, filter: parseScopeFilter(q.get("scope")) });
  });
}
