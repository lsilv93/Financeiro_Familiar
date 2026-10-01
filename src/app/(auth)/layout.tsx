import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/painel");
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-5xl">💰</div>
          <h1 className="mt-2 text-2xl font-bold text-brand-700 dark:text-brand-400">Financeiro Familiar</h1>
          <p className="text-sm text-slate-500">Controle pessoal e da família em um só lugar</p>
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </div>
  );
}
