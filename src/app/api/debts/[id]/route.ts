import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { invalidInput, jsonError, readJson, requireUser, serverError } from "@/lib/api";
import { debtId, updateDebt } from "@/lib/debts/schema";

type Context = { params: Promise<{ id: string }> };

const notFound = () => jsonError(404, "Catatan nggak ketemu");

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const id = debtId.safeParse((await params).id);
  if (!id.success) return invalidInput(id.error);

  const json = await readJson(request);
  if (json instanceof Response) return json;

  const parsed = updateDebt.safeParse(json.body);
  if (!parsed.success) return invalidInput(parsed.error);
  const { settled, ...fields } = parsed.data;

  const patch = {
    ...fields,
    ...(settled !== undefined && {
      settled_at: settled ? new Date().toISOString() : null,
    }),
  };

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
