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
          className="hidden h-11 w-11 items-center justify-center rounded-full bg-secondary text-sm font-extrabold sm:inline-flex"
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
        className="inline-flex min-h-11 items-center rounded-full border-2 border-border px-5 font-bold text-foreground no-underline hover:bg-muted"
      >
        Log in
      </Link>
      <Link
        href="/auth/sign-up"
        className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 font-extrabold text-brand-foreground no-underline hover:brightness-95"
      >
        Sign up
      </Link>
    </div>
  );
}
