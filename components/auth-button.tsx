import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  if (user) {
    const email = String(user.email ?? "");
    const initials = email.slice(0, 2).toUpperCase() || "ME";
    return (
      <div className="flex items-center gap-3">
        <span
          title={email}
          aria-label={`Signed in as ${email}`}
          className="hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white ring-1 ring-white/15 sm:inline-flex"
        >
          {initials}
        </span>
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Link
        href="/auth/login"
        className="inline-flex min-h-10 items-center rounded-lg border border-white/30 px-4 text-sm font-semibold text-white no-underline hover:bg-white/10"
      >
        Log in
      </Link>
      <Link
        href="/auth/sign-up"
        className="inline-flex min-h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground no-underline hover:brightness-95"
      >
        Sign up
      </Link>
    </div>
  );
}
