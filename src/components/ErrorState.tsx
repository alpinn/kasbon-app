import { RotateCcw, TriangleAlert } from "lucide-react";

export default function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-card border border-line bg-surface px-6 py-12 text-center shadow-card"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-negative-soft text-negative">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">Waduh, ada yang error</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{message}</p>
      <button type="button" onClick={onRetry} className="btn btn-primary mt-6">
        <RotateCcw className="size-4" aria-hidden="true" />
        Coba lagi
      </button>
    </div>
  );
}
