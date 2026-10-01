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

export async function readJson(
  request: Request,
): Promise<{ body: unknown } | Response> {
  const type = request.headers.get("content-type")?.toLowerCase();
  if (!type?.startsWith("application/json")) {
    return jsonError(415, "Kirim datanya dalam format JSON ya");
  }
  try {
    return { body: await request.json() };
  } catch {
    return jsonError(400, "Format data nggak valid");
  }
}

export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return jsonError(401, "Kamu belum masuk, masuk dulu ya");
  return { supabase };
}
