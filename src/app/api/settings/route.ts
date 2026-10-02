import { prisma } from "@/lib/prisma";
import { handle, requireUser } from "@/lib/session";
import { settingsSchema } from "@/lib/validation";
import { num } from "@/lib/money";

export const dynamic = "force-dynamic";

async function snapshot(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { family: { include: { members: { select: { id: true, name: true, email: true, role: true } } } } },
  });
  return {
    user: { id: u.id, name: u.name, email: u.email, role: u.role, emergencyReserve: num(u.emergencyReserve) },
    family: {
      id: u.family.id,
      name: u.family.name,
      inviteCode: u.family.inviteCode,
      emergencyReserve: num(u.family.emergencyReserve),
      members: u.family.members,
    },
  };
}

export async function GET() {
  return handle(async () => snapshot((await requireUser()).id));
}

export async function PUT(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const b = settingsSchema.parse(await req.json());
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { name: b.name, emergencyReserve: b.emergencyReserve, role: b.role } }),
      prisma.family.update({ where: { id: user.familyId }, data: { name: b.familyName, emergencyReserve: b.familyEmergencyReserve } }),
    ]);
    return snapshot(user.id);
  });
}
