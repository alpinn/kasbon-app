"use client";

import ErrorState from "@/components/ErrorState";

export default function Error({ retry }: { retry: () => void }) {
  return (
    <ErrorState
      message="Halamannya gagal dimuat. Coba lagi ya."
      onRetry={retry}
    />
  );
}
