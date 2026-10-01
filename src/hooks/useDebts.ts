"use client";

import { useEffect, useState } from "react";
import type {
  Debt,
  DebtInput,
  DebtUpdate,
  ListQuery,
} from "@/lib/debts/schema";

const NETWORK_ERROR = "Koneksi bermasalah, coba lagi ya";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(NETWORK_ERROR);
  }

  let body: { data?: T; error?: string } = {};
  try {
    body = await response.json();
  } catch {}

  if (!response.ok || body.data === undefined) {
    throw new Error(body.error ?? "Ada yang salah, coba lagi ya");
  }
  return body.data;
}

const json = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const keyOf = (url: string, tick: number) => `${url}#${tick}`;

type Result = { key: string; data: Debt[]; error: string | null };

export function useDebts(filters: Partial<ListQuery> = {}) {
  const { status, type, q, sort } = filters;
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  if (q) params.set("q", q);
  if (sort) params.set("sort", sort);
  const url = `/api/debts?${params}`;
  const key = keyOf(url, tick);

  useEffect(() => {
    const controller = new AbortController();
    const key = keyOf(url, tick);
    request<Debt[]>(url, { signal: controller.signal })
      .then((data) => setResult({ key, data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          data: [],
          error: error instanceof Error ? error.message : NETWORK_ERROR,
        });
      });
    return () => controller.abort();
  }, [url, tick]);

  const refetch = () => setTick((value) => value + 1);

  const mutate = async <T>(target: string, init: RequestInit) => {
    const data = await request<T>(target, init);
    refetch();
    return data;
  };

  return {
    data: result?.data ?? [],
    loading: result?.key !== key,
    error: result?.key === key ? result.error : null,
    refetch,
    create: (input: DebtInput) => mutate<Debt>("/api/debts", json("POST", input)),
    update: (id: string, patch: DebtUpdate) =>
      mutate<Debt>(`/api/debts/${id}`, json("PATCH", patch)),
    settle: (id: string, settled = true) =>
      mutate<Debt>(`/api/debts/${id}`, json("PATCH", { settled })),
    remove: (id: string) =>
      mutate<{ id: string }>(`/api/debts/${id}`, { method: "DELETE" }),
  };
}
