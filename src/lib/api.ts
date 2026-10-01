import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json(
    details === undefined ? { error: message } : { error: message, details },
    { status },
  );
}

export function invalidInput(error: z.ZodError) {
  return jsonError(400, error.issues[0].message, z.flattenError(error).fieldErrors);
}

export function serverError(error: unknown) {
  console.error(error);
  return jsonError(500, "Ada yang salah di server, coba lagi ya");
}

export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return jsonError(401, "Kamu belum login");
  return { supabase, user: { id: data.claims.sub } };
}
