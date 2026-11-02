"use client";

// Landing-page login state, checked in the browser.
//
// Week 9 load test: with the login check on the server, every visit to "/" had
// to be rendered fresh (~12 ms of server CPU each) and the page slowed to a
// 7.5 s p99 with timeouts at 100 simultaneous visitors. Checking the session
// here lets Next.js pre-build "/" as a static page that the server just hands out.
// The signed-out version is the default, so the page works even before this runs.
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";

function useSessionEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return; // Supabase not configured: stay signed out
    }
    // getSession reads the saved login cookie; no network call.
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setEmail(session?.user.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return email;
}

export function LandingAuthButton() {
  const email = useSessionEmail();
  if (email !== null) {
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

// Main call to action: "Open BodyOS" when signed in, otherwise sign up.
export function LandingHeroCta() {
  const email = useSessionEmail();
  if (email !== null) {
    return (
      <Link
        href="/protected"
        className="inline-flex min-h-12 items-center rounded-lg bg-brand px-6 font-bold text-brand-foreground no-underline hover:brightness-95"
      >
        Open BodyOS
      </Link>
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/auth/sign-up"
        className="inline-flex min-h-12 items-center rounded-lg bg-brand px-6 font-bold text-brand-foreground no-underline hover:brightness-95"
      >
        Get started free
      </Link>
      <Link
        href="/auth/login"
        className="inline-flex min-h-12 items-center rounded-lg border border-white/30 px-6 font-semibold text-white no-underline hover:bg-white/10"
      >
        I have an account
      </Link>
    </div>
  );
}
