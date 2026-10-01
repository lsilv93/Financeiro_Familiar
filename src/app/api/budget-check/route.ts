import { handle, requireUser } from "@/lib/session";
import { budgetCheckSchema } from "@/lib/validation";
import { budgetCheck } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    return budgetCheck(user, budgetCheckSchema.parse(await req.json()));
  });
}
