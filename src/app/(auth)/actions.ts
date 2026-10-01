"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; email?: string };

const credentials = z.object({
  email: z.email("Format email nggak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

function parse(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const result = credentials.safeParse({
    email,
    password: String(formData.get("password") ?? ""),
  });
  return { email, result };
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, result } = parse(formData);
  if (!result.success) return { email, error: result.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);
  if (error) {
    return {
      email,
      error:
        error.code === "invalid_credentials"
          ? "Email atau password salah"
          : "Gagal masuk, coba lagi ya",
    };
  }
  redirect("/");
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, result } = parse(formData);
  if (!result.success) return { email, error: result.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(result.data);
  if (error) {
    const messages: Record<string, string> = {
      user_already_exists: "Email ini sudah terdaftar, coba masuk aja",
      email_exists: "Email ini sudah terdaftar, coba masuk aja",
      weak_password: "Password terlalu lemah, coba yang lebih kuat",
    };
    return {
      email,
      error: messages[error.code ?? ""] ?? "Gagal daftar, coba lagi ya",
    };
  }
  if (!data.session) {
    return { email, error: "Cek emailmu untuk konfirmasi dulu ya" };
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
