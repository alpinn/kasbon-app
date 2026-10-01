import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { invalidInput, jsonError, requireUser, serverError } from "@/lib/api";
import { debtInput, listQuery } from "@/lib/debts/schema";

const SORTS = {
  newest: { column: "created_at", ascending: false },
  oldest: { column: "created_at", ascending: true },
  amount_desc: { column: "amount", ascending: false },
  amount_asc: { column: "amount", ascending: true },
} as const;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

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
  if (q) query = query.ilike("counterpart_name", `%${escapeLike(q)}%`);

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Format data nggak valid");
  }

  const parsed = debtInput.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);

  const { data, error } = await auth.supabase
    .from("debts")
    .insert({ ...parsed.data, user_id: auth.user.id })
    .select()
    .single();
  if (error) return serverError(error);
  return NextResponse.json({ data }, { status: 201 });
}
