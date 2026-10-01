import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { invalidInput, readJson, requireUser, serverError } from "@/lib/api";
import { debtInput, listQuery } from "@/lib/debts/schema";

const SORTS = {
  newest: { column: "created_at", ascending: false },
  oldest: { column: "created_at", ascending: true },
  amount_desc: { column: "amount", ascending: false },
  amount_asc: { column: "amount", ascending: true },
} as const;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const parsed = listQuery.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return invalidInput(parsed.error);
  const { status, type, q, sort } = parsed.data;

  let query = auth.supabase.from("debts").select("*");
  if (status === "unpaid") query = query.is("settled_at", null);
  if (status === "paid") query = query.not("settled_at", "is", null);
  if (type !== "all") query = query.eq("type", type);
  if (q) query = query.filter("counterpart_name", "imatch", escapeRegex(q));

  const { column, ascending } = SORTS[sort];
  query = query.order(column, { ascending });
  if (column !== "created_at") {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) return serverError(error);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const json = await readJson(request);
  if (json instanceof Response) return json;

  const parsed = debtInput.safeParse(json.body);
  if (!parsed.success) return invalidInput(parsed.error);

  const { data, error } = await auth.supabase
    .from("debts")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return serverError(error);
  return NextResponse.json({ data }, { status: 201 });
}
