import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { invalidInput, jsonError, requireUser, serverError } from "@/lib/api";
import { debtId, updateDebt } from "@/lib/debts/schema";
import type { Debt } from "@/lib/debts/schema";

type Context = { params: Promise<{ id: string }> };

const notFound = () => jsonError(404, "Catatan nggak ketemu");

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const id = debtId.safeParse((await params).id);
  if (!id.success) return invalidInput(id.error);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Format data nggak valid");
  }

  const parsed = updateDebt.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const { settled, ...fields } = parsed.data;

  const { data: current, error: readError } = await auth.supabase
    .from("debts")
    .select("*")
    .eq("id", id.data)
    .maybeSingle();
  if (readError) return serverError(readError);
  if (!current) return notFound();

  const patch: Partial<Debt> = { ...fields };
  if (settled === false) patch.settled_at = null;
  if (settled === true && current.settled_at === null) {
    patch.settled_at = new Date().toISOString();
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ data: current });

  const { data, error } = await auth.supabase
    .from("debts")
    .update(patch)
    .eq("id", id.data)
    .select()
    .maybeSingle();
  if (error) return serverError(error);
  if (!data) return notFound();
  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const id = debtId.safeParse((await params).id);
  if (!id.success) return invalidInput(id.error);

  const { data, error } = await auth.supabase
    .from("debts")
    .delete()
    .eq("id", id.data)
    .select("id");
  if (error) return serverError(error);
  if (data.length === 0) return notFound();
  return NextResponse.json({ data: { id: id.data } });
}
