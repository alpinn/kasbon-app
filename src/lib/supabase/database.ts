import type { Debt, DebtType } from "@/lib/debts/schema";

export type Database = {
  public: {
    Tables: {
      debts: {
        Row: Debt;
        Insert: Pick<Debt, "type" | "counterpart_name" | "amount"> &
          Partial<Omit<Debt, "type" | "counterpart_name" | "amount">>;
        Update: Partial<Debt>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { debt_type: DebtType };
    CompositeTypes: Record<string, never>;
  };
};
