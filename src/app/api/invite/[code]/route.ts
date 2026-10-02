import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Público: valida um código de convite e devolve apenas o nome da família. */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const code = (await ctx.params).code.trim().toUpperCase();
    const fam = code.length >= 4 && code.length <= 20 ? await prisma.family.findUnique({ where: { inviteCode: code }, select: { name: true } }) : null;
    return fam ? { valid: true, familyName: fam.name } : { valid: false };
  });
}
