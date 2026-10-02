import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui";

/** Escolha explícita entre receita e despesa, para ninguém lançar no lugar errado. */
export default function NovoLancamentoPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="O que você quer lançar?" subtitle="Escolha primeiro o tipo do lançamento" />
      <div className="stagger grid gap-5 sm:grid-cols-2">
        <Link href="/receitas/nova" className="card card-link flex flex-col gap-4 !p-6">
          <span className="chip !h-14 !w-14 !rounded-[20px] text-lime"><Icon name="up" size={26} /></span>
          <div><div className="text-[18px] font-semibold text-lime">Receita</div><p className="mt-1 text-[12px] leading-relaxed text-t3">Dinheiro que entra: salário, 13º, freelance, rendimentos…</p></div>
          <span className="btn-primary mt-auto">Lançar receita</span>
        </Link>
        <Link href="/despesas/nova" className="card card-link flex flex-col gap-4 !p-6">
          <span className="chip !h-14 !w-14 !rounded-[20px] text-danger"><Icon name="down" size={26} /></span>
          <div><div className="text-[18px] font-semibold text-danger">Despesa</div><p className="mt-1 text-[12px] leading-relaxed text-t3">Dinheiro que sai: mercado, contas, cartão, parcelas…</p></div>
          <span className="btn-danger mt-auto">Lançar despesa</span>
        </Link>
      </div>
    </div>
  );
}
