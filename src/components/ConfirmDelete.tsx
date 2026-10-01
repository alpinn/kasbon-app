import { LoaderCircle, Trash2, TriangleAlert } from "lucide-react";
import type { Debt } from "@/lib/debts/schema";
import { formatRupiah } from "@/lib/format";
import Modal from "./Modal";

export default function ConfirmDelete({
  debt,
  pending,
  onConfirm,
  onCancel,
}: {
  debt: Debt;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal titleId="confirm-delete-title" onClose={onCancel}>
      <div className="flex gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-negative-soft text-negative">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="confirm-delete-title" className="text-lg font-semibold">
            Hapus catatan ini?
          </h2>
          <p className="mt-1 text-sm break-words text-ink-muted">
            Catatan {debt.counterpart_name} sebesar {formatRupiah(debt.amount)}{" "}
            bakal hilang dan nggak bisa dibalikin.
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="btn btn-secondary"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="btn btn-danger"
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="size-4" aria-hidden="true" />
          )}
          {pending ? "Menghapus..." : "Ya, hapus"}
        </button>
      </div>
    </Modal>
  );
}
