import { ChevronDown, List, Search, Users } from "lucide-react";
import type { ListQuery } from "@/lib/debts/schema";

export type Filters = {
  search: string;
  status: ListQuery["status"];
  type: ListQuery["type"];
  sort: ListQuery["sort"];
  grouped: boolean;
};

export const defaultFilters: Filters = {
  search: "",
  status: "all",
  type: "all",
  sort: "newest",
  grouped: false,
};

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink-muted">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) =>
            onChange(options.find((o) => o.value === e.target.value)!.value)
          }
          className="field appearance-none pr-9"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

const views = [
  { grouped: false, label: "Daftar", icon: List },
  { grouped: true, label: "Per orang", icon: Users },
];

export default function DebtFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Cari nama</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Cari nama orang"
          maxLength={100}
          className="field pl-9"
        />
      </label>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Select
          label="Status"
          value={filters.status}
          onChange={(status) => onChange({ status })}
          options={[
            { value: "all", label: "Semua" },
            { value: "unpaid", label: "Belum lunas" },
            { value: "paid", label: "Lunas" },
          ]}
        />
        <Select
          label="Tipe"
          value={filters.type}
          onChange={(type) => onChange({ type })}
          options={[
            { value: "all", label: "Semua" },
            { value: "owed_to_me", label: "Dihutang" },
            { value: "i_owe", label: "Saya hutang" },
          ]}
        />
        <Select
          label="Urutkan"
          className="col-span-2 sm:col-span-1"
          value={filters.sort}
          onChange={(sort) => onChange({ sort })}
          options={[
            { value: "newest", label: "Terbaru" },
            { value: "oldest", label: "Terlama" },
            { value: "amount_desc", label: "Jumlah terbesar" },
            { value: "amount_asc", label: "Jumlah terkecil" },
          ]}
        />
      </div>

      <div
        role="group"
        aria-label="Pilih tampilan catatan"
        className="inline-flex rounded-control border border-line-strong bg-surface p-0.5"
      >
        {views.map(({ grouped, label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            aria-pressed={filters.grouped === grouped}
            onClick={() => onChange({ grouped })}
            className={`btn rounded-[0.625rem] px-3 ${
              filters.grouped === grouped
                ? "bg-primary-soft text-primary"
                : "text-ink-muted hover:bg-surface-muted"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
