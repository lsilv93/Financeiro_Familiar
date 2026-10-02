import { prisma } from "@/lib/prisma";
import { handle, requireUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
    if (new URL(req.url).searchParams.get("count")) return { unread };

    const rows = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
    const reqIds = rows.map((r) => r.requestId).filter((x): x is string => !!x);
    const reqs = reqIds.length ? await prisma.joinRequest.findMany({ where: { id: { in: reqIds }, family: { ownerId: user.id } }, include: { user: { select: { name: true, email: true, role: true } } } }) : [];
    const byId = new Map(reqs.map((r) => [r.id, r]));
    return {
      unread,
      items: rows.map((n) => {
        const jr = n.requestId ? byId.get(n.requestId) : undefined;
        return {
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          read: !!n.readAt,
          createdAt: n.createdAt.toISOString(),
          request: jr ? { id: jr.id, status: jr.status, name: jr.user.name, email: jr.user.email, role: jr.user.role ? ROLE_LABELS[jr.user.role] : null } : null,
        };
      }),
    };
  });
}
