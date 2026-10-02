import { ThemeIconButton } from "./ThemeToggle";
import { ChartGrowth, Coin, CoinRain, FloatingCard, LogoMark, PiggyBank } from "./Illustrations";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-[14px]">
      <CoinRain />
      <FloatingCard className="absolute left-[6%] top-[26%] hidden w-60 lg:block xl:left-[10%] xl:w-72" />
      <PiggyBank className="absolute bottom-[14%] right-[6%] hidden w-52 lg:block xl:right-[10%] xl:w-64" />
      <ChartGrowth className="absolute left-[14%] top-[62%] hidden h-24 w-36 lg:block" />
      <div className="absolute right-4 top-4 z-10"><ThemeIconButton /></div>
      <div className="relative z-10 w-full max-w-md py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto flex items-center justify-center gap-3">
            <Coin size={30} />
            <LogoMark size={64} />
            <Coin size={30} style={{ animationDelay: "-1.6s" }} />
          </div>
          <h1 className="mt-4 text-[26px] text-fg">Financeiro Familiar</h1>
          <p className="mt-1 text-[13px] text-t3">Controle pessoal e da família em um só lugar</p>
        </div>
        {children}
      </div>
    </div>
  );
}
