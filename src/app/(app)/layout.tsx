import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { BottomNav, Sidebar } from "@/components/Nav";
import { PendingApproval } from "@/components/PendingApproval";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.awaitingApproval) return <PendingApproval userName={user.name} />;
  return (
    <>
      <Sidebar userName={user.name} />
      <main className="mx-auto max-w-5xl px-[14px] pb-32 pt-6 md:ml-[17rem] md:max-w-none md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
      <BottomNav />
    </>
  );
}
