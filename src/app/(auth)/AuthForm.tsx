"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert, LoaderCircle, Wallet } from "lucide-react";
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
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-control bg-primary text-on-primary">
            <Wallet className="size-5" aria-hidden="true" />
          </span>
          <span className="text-2xl font-semibold tracking-tight">Kasbon</span>
        </div>

        <form
          action={action}
          className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card"
        >
          <h1 className="text-xl font-semibold">{text.title}</h1>

          <label className="block space-y-1.5 text-sm font-medium">
            <span>Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              defaultValue={state.email}
              className="field"
            />
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            <span>Password</span>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              autoComplete={text.autoComplete}
              className="field"
            />
          </label>

          {state.error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-control bg-negative-soft px-3 py-2 text-sm text-negative"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary w-full"
          >
            {pending && (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            )}
            {pending ? text.pending : text.submit}
          </button>

          <p className="text-center text-sm text-ink-muted">
            {text.switchText}{" "}
            <Link
              href={text.switchHref}
              className="inline-block py-2 font-medium text-primary underline underline-offset-2"
            >
              {text.switchLink}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
