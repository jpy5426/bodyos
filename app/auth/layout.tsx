import { BrandLogo } from "@/components/brand-logo";

// Brand header above the login, sign-up and password pages.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-6xl px-5 py-4">
        <BrandLogo href="/" />
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
