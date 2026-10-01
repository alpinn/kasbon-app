import { formatRupiah } from "@/lib/format";

function Bar({
  label,
  value,
  max,
  fill,
}: {
  label: string;
  value: number;
  max: number;
  fill: string;
}) {
  const width = value > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="font-medium tabular-nums">{formatRupiah(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${fill}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function BalanceChart({
  owed,
  owe,
}: {
  owed: number;
  owe: number;
}) {
  const max = Math.max(owed, owe);
  return (
    <section className="space-y-4 rounded-card border border-line bg-surface p-4 shadow-card">
      <h2 className="text-sm font-semibold">Perbandingan</h2>
      <div
        role="img"
        aria-label={`Perbandingan: dihutang ke saya ${formatRupiah(owed)}, saya hutang ${formatRupiah(owe)}`}
        className="space-y-4"
      >
        <Bar label="Dihutang ke saya" value={owed} max={max} fill="bg-positive" />
        <Bar label="Saya hutang" value={owe} max={max} fill="bg-negative" />
      </div>
    </section>
  );
}
