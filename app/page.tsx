import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LandingAuthButton, LandingHeroCta } from "@/components/landing-session";
import { BookOpen, Camera, Sparkles } from "lucide-react";
import { HeroPreview } from "@/components/hero-preview";
import { hasEnvVars } from "@/lib/utils";

const FEATURES = [
  {
    title: "Gentle AI routines",
    desc: "Short desk-break, prehab and mobility routines built from a vetted exercise library, never made-up moves.",
    Icon: Sparkles,
  },
  {
    title: "54-exercise library",
    desc: "Step-by-step pictures, doses and video links for seated, standing and floor moves you can do anywhere.",
    Icon: BookOpen,
  },
  {
    title: "Simple nutrition",
    desc: "Set a calorie goal, snap a photo of your plate, and see your day at a glance. Calories come from USDA data.",
    Icon: Camera,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navy band: top bar + hero */}
      <div className="bg-primary text-primary-foreground">
        <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <BrandLogo href="/" />
          {hasEnvVars && <LandingAuthButton />}
        </header>
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 pt-10 md:grid-cols-[1.1fr_1fr] md:pb-20 md:pt-14">
          <div className="flex flex-col gap-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F6A341]">Mobility · Prehab · Nutrition</p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Sit less, move better, stay injury-free.
            </h1>
            <p className="max-w-xl text-lg text-[#C9D3F2]">
              BodyOS builds short, gentle routines for people who sit most of the day or want to prevent
              injuries, and keeps simple track of what you eat.
            </p>
            <div className="mt-1">
              <LandingHeroCta />
            </div>
          </div>
          <HeroPreview className="mx-auto w-full max-w-[440px]" />
        </section>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-12">
        <section aria-label="Features" className="grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ title, desc, Icon }) => (
            <div key={title} className="flex flex-col gap-2.5 rounded-xl border bg-card p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-[15px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t bg-card/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-5 py-8 text-xs text-muted-foreground">
          <p>BodyOS · IST 440W Senior Capstone · Penn State</p>
          <p>For prevention and general wellness. Not medical advice.</p>
        </div>
      </footer>
    </div>
  );
}
