import Link from "next/link";
import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { AuthButton } from "@/components/auth-button";
import { DeskIllustration } from "@/components/desk-illustration";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

// Main call to action: "Open BodyOS" when signed in, otherwise sign up.
async function HeroCta() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    return (
      <Link
        href="/protected"
        className="inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-black text-brand-foreground no-underline hover:brightness-95"
      >
        Open BodyOS
      </Link>
    );
  }
  return <SignUpCta />;
}

function SignUpCta() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/auth/sign-up"
        className="inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-black text-brand-foreground no-underline hover:brightness-95"
      >
        Get started free
      </Link>
      <Link
        href="/auth/login"
        className="inline-flex min-h-12 items-center rounded-full border-2 border-[#4A5C9A] px-6 font-extrabold text-white no-underline hover:bg-white/10"
      >
        I have an account
      </Link>
    </div>
  );
}

const FEATURES = [
  {
    title: "Gentle AI routines",
    desc: "Short desk-break, prehab and mobility routines built from a vetted exercise library, never made-up moves.",
    tint: "bg-[#FFF1E2]",
  },
  {
    title: "54-exercise library",
    desc: "Clear how-to steps and doses for seated, standing and floor moves you can do anywhere.",
    tint: "bg-[#E6F0FF]",
  },
  {
    title: "Simple nutrition",
    desc: "Set a calorie goal, snap a photo of your plate, and see your day at a glance. Calories come from USDA data.",
    tint: "bg-[#E9F7EF]",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <BrandLogo href="/" />
        {hasEnvVars && (
          <Suspense fallback={<div className="h-11 w-40" />}>
            <AuthButton />
          </Suspense>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 pb-14 pt-4">
        <section className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-primary p-8 text-primary-foreground sm:p-12">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">
              Sit less, move better, stay injury-free.
            </h1>
            <p className="max-w-xl text-lg text-[#DCE3F7]">
              BodyOS builds short, gentle routines for people who sit most of the day or want to prevent
              injuries, and keeps simple track of what you eat.
            </p>
            <div className="mt-2">
              {hasEnvVars ? (
                <Suspense fallback={<SignUpCta />}>
                  <HeroCta />
                </Suspense>
              ) : (
                <SignUpCta />
              )}
            </div>
          </div>
          <DeskIllustration className="mx-auto w-full max-w-[280px] flex-[0_1_280px]" />
        </section>

        <section aria-label="Features" className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className={`flex flex-col gap-2 rounded-3xl p-6 ${f.tint}`}>
              <h2 className="text-xl font-black">{f.title}</h2>
              <p className="text-[15px] text-[#3E4970]">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-5 py-8 text-xs text-muted-foreground">
          <p>BodyOS · IST 440W Senior Capstone · Penn State</p>
          <p>For prevention and general wellness. Not medical advice.</p>
        </div>
      </footer>
    </div>
  );
}
