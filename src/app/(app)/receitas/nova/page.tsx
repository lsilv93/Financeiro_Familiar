import { PageHeader } from "@/components/ui";
import { TransactionForm } from "@/components/TransactionForm";

export default function NovaReceitaPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Nova receita" subtitle="Registre uma entrada de dinheiro" />
      <TransactionForm fixedType="INCOME" />
    </div>
  );
}
