import { Equal, TrendingDown, TrendingUp } from "lucide-react";
import { formatRupiah } from "@/lib/format";

export default function SummaryCards({
  owed,
  owe,
}: {
  owed: number;
  owe: number;
}) {
  const net = owed - owe;
  const tone =
    net > 0 ? "text-positive" : net < 0 ? "text-negative" : "text-ink";
  const NetIcon = net > 0 ? TrendingUp : net < 0 ? TrendingDown : Equal;
  const caption =
    net > 0
      ? "Lebih banyak yang hutang ke kamu"
      : net < 0
        ? "Kamu lebih banyak hutang"
        : "Impas, nggak ada selisih";

  return (
    <section
      aria-label="Ringkasan"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <p className="text-sm text-ink-muted">Total dihutang ke saya</p>
        <p className="mt-1 text-xl font-semibold tracking-tight whitespace-nowrap text-positive tabular-nums lg:text-2xl">
          {formatRupiah(owed)}
        </p>
      </div>
      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <p className="text-sm text-ink-muted">Total saya hutang</p>
        <p className="mt-1 text-xl font-semibold tracking-tight whitespace-nowrap text-negative tabular-nums lg:text-2xl">
          {formatRupiah(owe)}
        </p>
      </div>
      <div className="rounded-card border border-line bg-surface p-4 shadow-card sm:col-span-2 lg:col-span-1">
        <p className="text-sm text-ink-muted">Net</p>
        <p
          className={`mt-1 text-xl font-semibold tracking-tight whitespace-nowrap tabular-nums lg:text-2xl ${tone}`}
        >
          {formatRupiah(net)}
        </p>
        <p className={`mt-1 flex items-center gap-1.5 text-sm ${tone}`}>
          <NetIcon className="size-4 shrink-0" aria-hidden="true" />
          {caption}
        </p>
      </div>
    </section>
  );
}
