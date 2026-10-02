import { handle } from "@/lib/session";
import { lookupInvite } from "@/lib/security";

export const dynamic = "force-dynamic";

/** Público: valida um código de convite (com limite de tentativas) e devolve apenas o nome da família. */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const fam = await lookupInvite((await ctx.params).code);
    return fam ? { valid: true, familyName: fam.name } : { valid: false };
  });
}
