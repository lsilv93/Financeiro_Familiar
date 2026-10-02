import { Icon } from "./Icon";
import { ThemeIconButton } from "./ThemeToggle";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-[14px]">
      <div className="absolute right-4 top-4"><ThemeIconButton /></div>
      <div className="w-full max-w-md py-10">
        <div className="mb-8 text-center">
          <div className="chip mx-auto !h-16 !w-16 !rounded-[22px] text-lime"><Icon name="bank" size={28} /></div>
          <h1 className="mt-4 text-[26px] text-fg">Financeiro Familiar</h1>
          <p className="mt-1 text-[13px] text-t3">Controle pessoal e da família em um só lugar</p>
        </div>
        {children}
      </div>
    </div>
  );
}
