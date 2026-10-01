import { ChevronDown } from "lucide-react";
import type { Debt } from "@/lib/debts/schema";
import { formatRupiah } from "@/lib/format";
import type { DebtActions } from "./DebtItem";
import DebtList from "./DebtList";

function groupByPerson(debts: Debt[]) {
  const groups = new Map<string, Debt[]>();
  for (const debt of debts) {
    const key = debt.counterpart_name.trim().toLocaleLowerCase("id-ID");
    groups.set(key, [...(groups.get(key) ?? []), debt]);
  }
  return [...groups];
}

export default function DebtGroupList({
  debts,
  pending,
  ...actions
}: { debts: Debt[]; pending: string[] } & DebtActions) {
  return (
    <ul className="space-y-3">
      {groupByPerson(debts).map(([person, entries]) => {
        const open = entries.filter((d) => d.settled_at === null);
        const net = open.reduce(
          (sum, d) => sum + (d.type === "owed_to_me" ? d.amount : -d.amount),
          0,
        );
        const label =
          open.length === 0
            ? "Semua lunas"
            : net > 0
              ? "Dia hutang ke kamu"
              : net < 0
                ? "Kamu hutang ke dia"
                : "Impas";
        const tone =
          open.length > 0 && net > 0
            ? "text-positive"
            : net < 0
              ? "text-negative"
              : "text-ink-muted";

        return (
          <li key={person}>
            <details className="group rounded-card border border-line bg-surface shadow-card">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-card p-4 [&::-webkit-details-marker]:hidden">
                <ChevronDown
                  className="size-5 shrink-0 text-ink-muted transition-transform duration-150 group-open:rotate-180"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold break-words">
                    {entries[0].counterpart_name}
                  </span>
                  <span className="block text-sm text-ink-muted">
                    {entries.length} catatan · {open.length} belum lunas
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block text-xs ${tone}`}>{label}</span>
                  {open.length > 0 && net !== 0 && (
                    <span
                      className={`block font-semibold tabular-nums ${tone}`}
                    >
                      {formatRupiah(Math.abs(net))}
                    </span>
                  )}
                </span>
              </summary>
              <div className="rounded-b-card border-t border-line bg-canvas p-3">
                <DebtList debts={entries} pending={pending} {...actions} />
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
