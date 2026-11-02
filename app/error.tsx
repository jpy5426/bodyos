"use client";

// Shown when something inside a page crashes, instead of a blank screen.
// The rest of the app (navigation, login) keeps working.
import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground">
        This page hit an unexpected problem. Your saved data is safe. Try again, or go back to your dashboard.
      </p>
      {error.digest && <p className="text-xs text-muted-foreground">Error reference: {error.digest}</p>}
      <div className="flex gap-3">
        <button onClick={reset} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
          Try again
        </button>
        <Link href="/protected" className="rounded-md border px-4 py-2">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
