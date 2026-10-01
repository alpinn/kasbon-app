"use client";

import { useEffect } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

export type ToastState = {
  message: string;
  tone: "success" | "error";
};

export default function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const Icon = toast?.tone === "error" ? CircleAlert : CircleCheck;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-20 z-30 flex justify-center"
    >
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : undefined}
          className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-control border py-1 pr-1 pl-4 shadow-card ${
            toast.tone === "error"
              ? "border-negative bg-negative-soft text-negative"
              : "border-positive bg-positive-soft text-positive"
          }`}
        >
          <Icon className="size-5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Tutup pesan"
            className="flex size-11 shrink-0 items-center justify-center rounded-control hover:bg-black/5"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
