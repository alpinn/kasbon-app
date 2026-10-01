import type { Debt } from "@/lib/debts/schema";
import DebtItem, { type DebtActions } from "./DebtItem";

export default function DebtList({
  debts,
  pending,
  ...actions
}: { debts: Debt[]; pending: string[] } & DebtActions) {
  return (
    <ul className="space-y-3">
      {debts.map((debt) => (
        <DebtItem
          key={debt.id}
          debt={debt}
          pending={pending.includes(debt.id)}
          {...actions}
        />
      ))}
    </ul>
  );
}
