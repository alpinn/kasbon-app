"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; email?: string };

const credentials = z.object({
  email: z.email("Emailnya belum bener, cek lagi ya"),
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
          ? "Email atau passwordnya salah, cek lagi ya"
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
      user_already_exists: "Email ini udah terdaftar, masuk aja ya",
      email_exists: "Email ini udah terdaftar, masuk aja ya",
      weak_password: "Passwordnya terlalu gampang ditebak, coba yang lebih kuat",
    };
    return {
      email,
      error: messages[error.code ?? ""] ?? "Gagal daftar, coba lagi ya",
    };
  }
  if (!data.session) {
    return { email, error: "Cek emailmu buat konfirmasi dulu ya" };
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
