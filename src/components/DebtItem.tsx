import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  Pencil,
  Trash2,
  Undo2,
} from "lucide-react";
import type { Debt } from "@/lib/debts/schema";
import { formatRelativeDate, formatRupiah } from "@/lib/format";

export type DebtActions = {
  onToggle: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
};

export default function DebtItem({
  debt,
  pending,
  onToggle,
  onEdit,
  onDelete,
}: { debt: Debt; pending: boolean } & DebtActions) {
  const settled = debt.settled_at !== null;
  const owedToMe = debt.type === "owed_to_me";
  const date = debt.due_date ?? debt.created_at;
  const TypeIcon = owedToMe ? ArrowDownLeft : ArrowUpRight;
  const StatusIcon = settled ? CircleCheck : Clock;

  return (
    <li
      aria-busy={pending}
      className="rounded-card border border-line bg-surface p-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          className={`min-w-0 font-semibold break-words ${settled ? "text-ink-muted" : ""}`}
        >
          {debt.counterpart_name}
        </h3>
        <p
          className={`shrink-0 text-lg font-semibold tabular-nums ${
            settled
              ? "text-ink-muted"
              : owedToMe
                ? "text-positive"
                : "text-negative"
          }`}
        >
          {formatRupiah(debt.amount)}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
            owedToMe
              ? "bg-positive-soft text-positive"
              : "bg-negative-soft text-negative"
          }`}
        >
          <TypeIcon className="size-3.5" aria-hidden="true" />
          {owedToMe ? "dihutang" : "saya hutang"}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
            settled
              ? "bg-surface-muted text-ink-muted"
              : "bg-warning-soft text-warning"
          }`}
        >
          <StatusIcon className="size-3.5" aria-hidden="true" />
          {settled ? "Lunas" : "Belum lunas"}
        </span>
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          <time dateTime={date}>{formatRelativeDate(date)}</time>
        </span>
      </div>

      {debt.note && (
        <p className="mt-3 text-sm break-words text-ink-muted">{debt.note}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => onToggle(debt)}
          className="btn btn-secondary flex-1 sm:flex-none"
        >
          {settled ? (
            <Undo2 className="size-4" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          {settled ? "Batal lunas" : "Tandai lunas"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onEdit(debt)}
          className="btn btn-secondary"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onDelete(debt)}
          className="btn btn-secondary text-negative"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Hapus
        </button>
      </div>
    </li>
  );
}
