"use client";

import { useCallback, useEffect, useState } from "react";
import { HandCoins, Plus, SearchX } from "lucide-react";
import { useDebts } from "@/hooks/useDebts";
import type { Debt, DebtInput } from "@/lib/debts/schema";
import BalanceChart from "./BalanceChart";
import ConfirmDelete from "./ConfirmDelete";
import DebtFilters, { defaultFilters, type Filters } from "./DebtFilters";
import DebtFormDialog from "./DebtFormDialog";
import DebtGroupList from "./DebtGroupList";
import DebtList from "./DebtList";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import { ListSkeleton, SummarySkeleton } from "./Skeleton";
import SummaryCards from "./SummaryCards";
import Toast, { type ToastState } from "./Toast";

const sumOf = (debts: Debt[], type: Debt["type"]) =>
  debts
    .filter((d) => d.type === type && d.settled_at === null)
    .reduce((sum, d) => sum + d.amount, 0);

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<{ debt?: Debt } | null>(null);
  const [deleting, setDeleting] = useState<Debt | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQ(filters.search.trim()), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const all = useDebts();
  const list = useDebts({
    status: filters.status,
    type: filters.type,
    sort: filters.sort,
    q: q || undefined,
  });

  const dismissToast = useCallback(() => setToast(null), []);
  const notify = (message: string, tone: ToastState["tone"]) =>
    setToast({ message, tone });

  async function run(id: string, action: () => Promise<unknown>, done: string) {
    setPending((ids) => [...ids, id]);
    try {
      await action();
      await all.refetch();
      notify(done, "success");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Ada yang salah, coba lagi ya",
        "error",
      );
    } finally {
      setPending((ids) => ids.filter((x) => x !== id));
    }
  }

  async function submit(input: DebtInput) {
    const debt = form?.debt;
    if (debt) await list.update(debt.id, input);
    else await list.create(input);
    await all.refetch();
    setForm(null);
    notify(debt ? "Perubahan disimpan" : "Catatan disimpan", "success");
  }

  const toggle = (debt: Debt) =>
    run(
      debt.id,
      () => list.settle(debt.id, debt.settled_at === null),
      debt.settled_at === null ? "Udah ditandai lunas" : "Balik jadi belum lunas",
    );

  async function confirmDelete() {
    if (!deleting) return;
    await run(deleting.id, () => list.remove(deleting.id), "Catatan dihapus");
    setDeleting(null);
  }

  const error = all.error ?? list.error;
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          all.refetch();
          list.refetch();
        }}
      />
    );
  }

  const summaryLoading = all.loading && all.data.length === 0;
  const owed = sumOf(all.data, "owed_to_me");
  const owe = sumOf(all.data, "i_owe");
  const actions = {
    pending,
    onToggle: toggle,
    onEdit: (debt: Debt) => setForm({ debt }),
    onDelete: setDeleting,
  };

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Ringkasan hutang-piutangmu</h1>

      {summaryLoading ? (
        <SummarySkeleton />
      ) : (
        <>
          <SummaryCards owed={owed} owe={owe} />
          {owed + owe > 0 && <BalanceChart owed={owed} owe={owe} />}
        </>
      )}

      <section aria-labelledby="entries-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="entries-title" className="text-lg font-semibold">
            Catatan
          </h2>
          <button
            type="button"
            onClick={() => setForm({})}
            className="btn btn-primary fixed inset-x-4 bottom-4 z-10 min-h-12 shadow-sheet sm:static sm:min-h-11 sm:shadow-none"
          >
            <Plus className="size-5" aria-hidden="true" />
            Catat baru
          </button>
        </div>

        {summaryLoading ? (
          <ListSkeleton />
        ) : all.data.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="Belum ada catatan"
            description="Mulai catat siapa hutang ke siapa, biar nggak ada yang kelupaan."
            action={{ label: "Catat yang pertama", icon: Plus, onClick: () => setForm({}) }}
          />
        ) : (
          <>
            <DebtFilters
              filters={filters}
              onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
            />
            <div
              aria-busy={list.loading}
              className={`transition-opacity duration-150 ${list.loading && list.data.length > 0 ? "opacity-60" : ""}`}
            >
              {(list.loading || all.loading) && list.data.length === 0 ? (
                <ListSkeleton />
              ) : list.data.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="Nggak ketemu"
                  description="Nggak ada catatan yang cocok sama filter atau pencarianmu."
                  action={{
                    label: "Reset filter",
                    onClick: () => setFilters(defaultFilters),
                  }}
                />
              ) : filters.grouped ? (
                <DebtGroupList debts={list.data} {...actions} />
              ) : (
                <DebtList debts={list.data} {...actions} />
              )}
            </div>
          </>
        )}
      </section>

      {form && (
        <DebtFormDialog
          debt={form.debt}
          onSubmit={submit}
          onClose={() => setForm(null)}
        />
      )}
      {deleting && (
        <ConfirmDelete
          debt={deleting}
          pending={pending.includes(deleting.id)}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
