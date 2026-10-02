import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser } from "@/lib/session";
import { shoppingListSchema } from "@/lib/validation";
import { newListCode } from "@/lib/shoppingLists";

export const dynamic = "force-dynamic";

/** Listas da família: pendentes (abertas) e encerradas (100% compradas). */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const members = await prisma.user.findMany({ where: { familyId: user.familyId }, select: { id: true, name: true } });
    const nameOf = new Map(members.map((m) => [m.id, m.name.split(" ")[0]]));
    const lists = await prisma.shoppingList.findMany({
      where: { familyId: user.familyId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { items: { select: { name: true, status: true } } },
      take: 80,
    });
    const shape = (l: (typeof lists)[number]) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      status: l.status,
      createdBy: nameOf.get(l.createdById) ?? "Alguém",
      createdAt: l.createdAt.toISOString(),
      closedAt: l.closedAt?.toISOString() ?? null,
      total: l.items.length,
      bought: l.items.filter((i) => i.status === "BOUGHT").length,
      preview: l.items.filter((i) => i.status !== "BOUGHT").slice(0, 3).map((i) => i.name),
    });
    return { open: lists.filter((l) => l.status === "OPEN").map(shape), closed: lists.filter((l) => l.status === "CLOSED").map(shape).slice(0, 30) };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const b = shoppingListSchema.parse(await req.json().catch(() => ({})));
    if ((await prisma.shoppingList.count({ where: { familyId: user.familyId, status: "OPEN" } })) >= 20) throw new HttpError(400, "Você já tem 20 listas pendentes. Encerre ou exclua alguma antes de criar outra.");
    const list = await prisma.shoppingList.create({ data: { code: await newListCode(), name: b.name, createdById: user.id, familyId: user.familyId } });
    return { id: list.id, code: list.code };
  });
}
