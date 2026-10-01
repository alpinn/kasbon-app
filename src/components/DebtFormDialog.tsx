"use client";

import { useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { z } from "zod";
import {
  debtInput,
  type Debt,
  type DebtInput,
  type DebtType,
} from "@/lib/debts/schema";
import Modal from "./Modal";

type Errors = Partial<Record<keyof DebtInput, string[]>>;

const NOTE_MAX = 200;

const typeOptions: { value: DebtType; label: string }[] = [
  { value: "owed_to_me", label: "Saya dihutang" },
  { value: "i_owe", label: "Saya hutang" },
];

const withDots = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      <div className="mt-1 flex justify-between gap-3 text-xs">
        <p id={`${id}-error`} role={error ? "alert" : undefined} className="text-negative">
          {error}
        </p>
        {hint && <p className="shrink-0 text-ink-muted">{hint}</p>}
      </div>
    </div>
  );
}

export default function DebtFormDialog({
  debt,
  onSubmit,
  onClose,
}: {
  debt?: Debt;
  onSubmit: (input: DebtInput) => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType] = useState<DebtType>(debt?.type ?? "owed_to_me");
  const [name, setName] = useState(debt?.counterpart_name ?? "");
  const [amount, setAmount] = useState(debt ? String(debt.amount) : "");
  const [date, setDate] = useState(
    debt ? (debt.due_date ?? "") : new Date().toLocaleDateString("sv-SE"),
  );
  const [note, setNote] = useState(debt?.note ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const parsed = debtInput.safeParse({
      type,
      counterpart_name: name,
      amount,
      due_date: date,
      note,
    });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Ada yang salah, coba lagi ya",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const describe = (id: string, key: keyof DebtInput) =>
    errors[key] ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};

  return (
    <Modal titleId="debt-form-title" onClose={onClose}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="debt-form-title" className="text-lg font-semibold">
          {debt ? "Edit catatan" : "Catat baru"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup form"
          className="-mr-2 flex size-11 items-center justify-center rounded-control text-ink-muted hover:bg-surface-muted"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Tipe</legend>
          <div className="grid grid-cols-2 gap-3">
            {typeOptions.map((option) => (
              <label key={option.value} className="relative block">
                <input
                  type="radio"
                  name="type"
                  value={option.value}
                  checked={type === option.value}
                  onChange={() => setType(option.value)}
                  className="peer sr-only"
                />
                <span className="flex min-h-12 items-center rounded-control border-2 border-line-strong bg-surface pr-9 pl-3 text-sm font-medium transition-colors duration-150 peer-checked:border-primary peer-checked:bg-primary-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                  {option.label}
                </span>
                <Check
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary opacity-0 peer-checked:opacity-100"
                  aria-hidden="true"
                />
              </label>
            ))}
          </div>
          <p className="mt-1 min-h-4 text-xs text-negative" role="alert">
            {errors.type?.[0]}
          </p>
        </fieldset>

        <Field id="debt-name" label="Nama orang" error={errors.counterpart_name?.[0]}>
          <input
            id="debt-name"
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            className="field"
            {...describe("debt-name", "counterpart_name")}
          />
        </Field>

        <Field id="debt-amount" label="Jumlah" error={errors.amount?.[0]}>
          <div className="relative">
            <span
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-muted"
              aria-hidden="true"
            >
              Rp
            </span>
            <input
              id="debt-amount"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={withDots(amount)}
              onChange={(e) =>
                setAmount(e.target.value.replace(/\D/g, "").replace(/^0+/, ""))
              }
              className="field pl-10 tabular-nums"
              {...describe("debt-amount", "amount")}
            />
          </div>
        </Field>

        <Field id="debt-date" label="Tanggal" error={errors.due_date?.[0]}>
          <input
            id="debt-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field"
            {...describe("debt-date", "due_date")}
          />
        </Field>

        <Field
          id="debt-note"
          label="Catatan"
          error={errors.note?.[0]}
          hint={`Opsional · ${note.length}/${NOTE_MAX}`}
        >
          <textarea
            id="debt-note"
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="field min-h-24 py-2"
            {...describe("debt-note", "note")}
          />
        </Field>

        {serverError && (
          <p
            role="alert"
            className="rounded-control bg-negative-soft px-3 py-2 text-sm text-negative"
          >
            {serverError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Batal
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting && (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            )}
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
