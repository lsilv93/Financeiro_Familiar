import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handle, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({ ids: z.array(z.string().max(40)).max(100).optional() });

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { ids } = schema.parse(await req.json().catch(() => ({})));
    const r = await prisma.notification.updateMany({ where: { userId: user.id, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
    return { updated: r.count };
  });
}
