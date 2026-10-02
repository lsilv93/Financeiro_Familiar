import { PageHeader } from "@/components/ui";
import { TransactionForm } from "@/components/TransactionForm";

export default function NovaDespesaPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Nova despesa" subtitle="Registre uma saída de dinheiro" />
      <TransactionForm fixedType="EXPENSE" />
    </div>
  );
}
