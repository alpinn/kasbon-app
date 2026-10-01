export function SummarySkeleton() {
  return (
    <div
      role="status"
      aria-label="Memuat ringkasan"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      <div className="skeleton h-24" />
      <div className="skeleton h-24" />
      <div className="skeleton col-span-2 h-24 sm:col-span-1" />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div role="status" aria-label="Memuat catatan" className="space-y-3">
      <div className="skeleton h-36" />
      <div className="skeleton h-36" />
      <div className="skeleton h-36" />
    </div>
  );
}
