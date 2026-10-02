import { ThemeIconButton } from "./ThemeToggle";
import { LogoMark } from "./Illustrations";

// Poucos emojis discretos (moedas, cartões e PIX) flutuando nas bordas, sem poluir o formulário.
// `lg` = só aparece em telas grandes; no celular ficam apenas os dos cantos, menores.
const FLOATERS: { e: string; pix?: boolean; pos: string; size: string; delay: string; lg?: boolean }[] = [
  { e: "🪙", pos: "left-[5%] top-[7%] lg:left-[8%] lg:top-[14%]", size: "text-[24px] lg:text-[44px]", delay: "0s" },
  { e: "💳", pos: "left-[24%] top-[3%] lg:left-auto lg:right-[8%] lg:top-[18%]", size: "text-[24px] lg:text-[46px]", delay: "-1.4s" },
  { e: "💠", pix: true, pos: "left-[9%] bottom-[16%]", size: "text-[34px]", delay: "-2.6s", lg: true },
  { e: "🪙", pos: "right-[10%] bottom-[12%]", size: "text-[36px]", delay: "-3.3s", lg: true },
  { e: "💳", pos: "left-[16%] top-[50%]", size: "text-[32px]", delay: "-0.8s", lg: true },
  { e: "💠", pix: true, pos: "right-[16%] top-[54%]", size: "text-[30px]", delay: "-2s", lg: true },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-[14px]">
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        {FLOATERS.map((f, i) => (
          <span key={i} className={`emoji-float absolute ${f.pos} ${f.lg ? "hidden lg:flex" : "flex"} flex-col items-center`} style={{ animationDelay: f.delay }}>
            <span className={`leading-none ${f.size}`}>{f.e}</span>
            {f.pix && <span className="mt-1 text-[10px] font-bold tracking-[0.2em] text-t3">PIX</span>}
          </span>
        ))}
      </div>
      <div className="absolute right-4 top-4 z-10"><ThemeIconButton /></div>
      <div className="relative z-10 w-full max-w-md py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto flex items-center justify-center"><LogoMark size={64} /></div>
          <h1 className="mt-4 text-[26px] text-fg">Financeiro Familiar</h1>
          <p className="mt-1 text-[13px] text-t3">Controle pessoal e da família em um só lugar</p>
          <p className="mt-3 flex items-center justify-center gap-4 text-[12px] text-t3" aria-label="Moedas, cartões e PIX">
            <span><span className="mr-1 text-[15px]">🪙</span>Moedas</span>
            <span><span className="mr-1 text-[15px]">💳</span>Cartões</span>
            <span><span className="mr-1 text-[15px]">💠</span>PIX</span>
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
