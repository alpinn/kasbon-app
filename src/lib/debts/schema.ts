import { z } from "zod";

export const MAX_AMOUNT = 1_000_000_000_000_000;

export const debtTypes = ["owed_to_me", "i_owe"] as const;

const numericString = (value: unknown) =>
  typeof value === "string" && value.trim() !== "" ? Number(value) : value;

const blankToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

export const debtInput = z.object(
  {
    type: z.enum(debtTypes, { error: "Pilih tipenya dulu ya" }),
    counterpart_name: z
      .string({ error: "Isi nama orangnya dulu ya" })
      .trim()
      .min(1, "Isi nama orangnya dulu ya")
      .max(100, "Namanya kepanjangan, maksimal 100 karakter"),
    amount: z.preprocess(
      numericString,
      z
        .number({ error: "Jumlahnya harus berupa angka" })
        .int("Jumlahnya harus bilangan bulat, tanpa koma")
        .gt(0, "Jumlahnya harus lebih dari 0")
        .max(MAX_AMOUNT, "Jumlahnya terlalu besar"),
    ),
    due_date: z.preprocess(
      blankToNull,
      z.iso.date({ error: "Tanggalnya nggak valid (format YYYY-MM-DD)" }).nullish(),
    ),
    note: z
      .string({ error: "Catatannya harus berupa teks" })
      .trim()
      .max(200, "Catatannya kepanjangan, maksimal 200 karakter")
      .transform((value) => (value === "" ? null : value))
      .nullish(),
  },
  { error: "Format data nggak valid" },
);

export const updateDebt = debtInput
  .partial()
  .extend({ settled: z.boolean({ error: "Status lunas cuma boleh true atau false" }).optional() })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    error: "Nggak ada data yang diubah",
  });

export const listQuery = z.object({
  status: z
    .enum(["all", "unpaid", "paid"], { error: "Status nggak valid" })
    .default("all"),
  type: z
    .enum(["all", ...debtTypes], { error: "Tipe nggak valid" })
    .default("all"),
  q: z.string().trim().max(100, "Pencarian maksimal 100 karakter").optional(),
  sort: z
    .enum(["newest", "oldest", "amount_desc", "amount_asc"], {
      error: "Urutan nggak valid",
    })
    .default("newest"),
});

export const debtId = z.uuid({ error: "ID catatan nggak valid" });

export type DebtType = (typeof debtTypes)[number];
export type DebtInput = z.output<typeof debtInput>;
export type DebtUpdate = z.output<typeof updateDebt>;
export type ListQuery = z.output<typeof listQuery>;

export type Debt = {
  id: string;
  user_id: string;
  type: DebtType;
  counterpart_name: string;
  amount: number;
  note: string | null;
  due_date: string | null;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
};
