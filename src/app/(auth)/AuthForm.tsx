"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthState } from "./actions";

const copy = {
  login: {
    title: "Masuk ke Kasbon",
    submit: "Masuk",
    pending: "Memproses...",
    switchText: "Belum punya akun?",
    switchLink: "Daftar",
    switchHref: "/signup",
    autoComplete: "current-password",
  },
  signup: {
    title: "Bikin akun Kasbon",
    submit: "Daftar",
    pending: "Memproses...",
    switchText: "Sudah punya akun?",
    switchLink: "Masuk",
    switchHref: "/login",
    autoComplete: "new-password",
  },
};

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? login : signup,
    {},
  );
  const text = copy[mode];

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        action={action}
        className="w-full max-w-sm space-y-4 rounded-xl border border-black/10 p-6 shadow-sm dark:border-white/15"
      >
        <h1 className="text-xl font-semibold">{text.title}</h1>

        <label className="block space-y-1 text-sm">
          <span>Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            defaultValue={state.email}
            className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Password</span>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete={text.autoComplete}
            className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {pending ? text.pending : text.submit}
        </button>

        <p className="text-center text-sm">
          {text.switchText}{" "}
          <Link href={text.switchHref} className="font-medium underline">
            {text.switchLink}
          </Link>
        </p>
      </form>
    </main>
  );
}
