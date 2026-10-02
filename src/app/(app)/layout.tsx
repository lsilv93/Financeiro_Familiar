import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BottomNav, Sidebar } from "@/components/Nav";
import { Greeting } from "@/components/Greeting";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const family = await prisma.family.findUnique({ where: { id: user.familyId }, select: { name: true } });
  const familyName = family?.name ?? "Minha família";
  return (
    <>
      <Sidebar userName={user.name} familyName={familyName} />
      <main className="mx-auto max-w-5xl px-[14px] pb-32 pt-6 md:ml-[17rem] md:max-w-none md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-5xl">
          <Greeting userName={user.name} familyName={familyName} />
          {children}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
