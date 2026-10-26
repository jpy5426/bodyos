import { BrandLogo } from "@/components/brand-logo";

// Brand header above the login, sign-up and password pages.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="w-full bg-primary text-primary-foreground">
        <div className="mx-auto w-full max-w-6xl px-5 py-3">
          <BrandLogo href="/" />
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
