import { PageHeader } from "@/components/ui";
import { TransactionForm } from "@/components/TransactionForm";

export default function NovoLancamentoPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Novo lançamento" subtitle="Registre uma receita ou despesa" />
      <TransactionForm />
    </div>
  );
}
