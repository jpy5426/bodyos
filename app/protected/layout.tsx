import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { BrandLogo } from "@/components/brand-logo";
import { SiteNav } from "@/components/site-nav";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="w-full">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <BrandLogo href="/protected" />
          <SiteNav />
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense fallback={<div className="h-11 w-24" />}>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-14 pt-4">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-5 py-8 text-xs text-muted-foreground">
          <p>BodyOS · IST 440W Senior Capstone · Penn State</p>
          <p>For prevention and general wellness. Not medical advice.</p>
        </div>
      </footer>
    </div>
  );
}
