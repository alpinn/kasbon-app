import { Wallet } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import LogoutButton from "./LogoutButton";

export default function AppHeader({ email }: { email?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-control bg-primary text-on-primary">
            <Wallet className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Kasbon</span>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          {email && (
            <span className="hidden max-w-64 truncate text-sm text-ink-muted sm:inline">
              {email}
            </span>
          )}
          <form action={logout}>
            <LogoutButton />
          </form>
        </div>
      </div>
    </header>
  );
}
