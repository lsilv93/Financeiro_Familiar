import { z } from "zod";
import { handle, requireUser } from "@/lib/session";
import { isMonth } from "@/lib/dates";
import { generateMonths } from "@/lib/recurring";

export const dynamic = "force-dynamic";

const schema = z.object({ month: z.string().refine(isMonth, "Mês inválido") });

/** Gera (de forma idempotente) os lançamentos pendentes de um mês a partir das regras fixas ativas. */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { month } = schema.parse(await req.json());
    return generateMonths(user, [month]);
  });
}
