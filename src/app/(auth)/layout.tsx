import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/painel");
  return (
    <div className="flex min-h-screen items-center justify-center p-[14px]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="chip mx-auto !h-16 !w-16 !rounded-[22px] text-lime"><Icon name="bank" size={28} /></div>
          <h1 className="mt-4 text-[26px] text-white">Financeiro Familiar</h1>
          <p className="mt-1 text-[13px] text-t3">Controle pessoal e da família em um só lugar</p>
        </div>
        <div className="card !p-7">{children}</div>
      </div>
    </div>
  );
}
