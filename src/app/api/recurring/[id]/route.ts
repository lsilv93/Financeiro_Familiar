import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, handle, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

async function ownRule(id: string) {
  const user = await requireUser();
  const rule = await prisma.recurringRule.findFirst({
    where: { id, OR: [{ scope: "PERSONAL", userId: user.id }, { scope: "FAMILY", familyId: user.familyId }] },
  });
  if (!rule) throw new HttpError(404, "Regra não encontrada");
  return rule;
}

const schema = z.object({
  active: z.boolean().optional(),
  amount: z.coerce.number().positive().max(1_000_000_000).optional(),
  description: z.string().trim().min(1).max(120).optional(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const rule = await ownRule((await ctx.params).id);
    const b = schema.parse(await req.json());
    await prisma.recurringRule.update({ where: { id: rule.id }, data: b });
    return { ok: true };
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const rule = await ownRule((await ctx.params).id);
    await prisma.recurringRule.delete({ where: { id: rule.id } }); // lançamentos já gerados permanecem
    return { deleted: true };
  });
}
