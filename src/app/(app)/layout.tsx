import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { BottomNav, Sidebar } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <>
      <Sidebar userName={user.name} />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:ml-64 md:max-w-none md:px-8 md:pb-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
      <BottomNav />
    </>
  );
}
