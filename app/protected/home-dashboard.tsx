"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sum } from "@/lib/nutrition";
import { GOAL_LABEL, targetFromProfile, type Goal, type Target } from "@/lib/macros";
import { DeskIllustration } from "@/components/desk-illustration";

type PlanExercise = { dose: string; exercise_order: number; exercises: { name: string } | null };
type PlanDay = { day_label: string; focus: string; day_order: number; plan_exercises: PlanExercise[] };
type LatestPlan = { id: string; created_at: string; plan_days: PlanDay[] };

type Today = { kcal: number; protein: number; carbs: number; fat: number };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function dayOfYear(): number {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime();
  return Math.floor((Date.now() - start) / 86_400_000);
}

// Rotate A → B → C one routine per day, based on the date.
function todaysRoutine(days: PlanDay[], day: number): PlanDay | null {
  if (days.length === 0) return null;
  const sorted = [...days].sort((a, b) => a.day_order - b.day_order);
  return sorted[day % sorted.length];
}

const RING_C = 2 * Math.PI * 36; // circumference for r = 36

function Ring({ pct, color, label }: { pct: number; color: string; label: string }) {
  const shown = Math.min(100, Math.max(0, pct));
  return (
    <svg role="img" aria-label={`${label} ${pct} percent`} width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      <circle cx="44" cy="44" r="36" stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
      <circle
        cx="44"
        cy="44"
        r="36"
        stroke={pct > 110 ? "hsl(var(--destructive))" : color}
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={RING_C}
        strokeDashoffset={RING_C * (1 - shown / 100)}
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="50" textAnchor="middle" fontWeight="900" fontSize="18" fill="currentColor">
        {pct}%
      </text>
    </svg>
  );
}

const TOOLS = [
  {
    href: "/protected/workout",
    title: "Build a routine",
    desc: "AI picks gentle moves for your body and your time.",
    tint: "bg-[#FFF1E2]",
    icon: (
      <>
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
        <path d="M19 15l.8 1.7 1.7.8-1.7.8L19 20l-.8-1.7-1.7-.8 1.7-.8z" />
      </>
    ),
  },
  {
    href: "/protected/library",
    title: "Browse exercises",
    desc: "54 desk, prehab and mobility moves, with how-tos.",
    tint: "bg-[#E6F0FF]",
    icon: (
      <>
        <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" />
        <path d="M4 19V5" />
        <path d="M9 7h6" />
      </>
    ),
  },
  {
    href: "/protected/macros",
    title: "Set my targets",
    desc: "Calories and macros to maintain, cut or bulk.",
    tint: "bg-[#E9F7EF]",
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 7h6" />
        <path d="M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
      </>
    ),
  },
  {
    href: "/protected/meals",
    title: "Snap a meal",
    desc: "Take a photo; we'll find the calories for you.",
    tint: "bg-[#F3ECFF]",
    icon: (
      <>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
  },
];

export function HomeDashboard() {
  const [plan, setPlan] = useState<LatestPlan | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [today, setToday] = useState<Today | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hello, setHello] = useState("Hello");
  const [day, setDay] = useState(0);

  // Clock-based values are set in the browser after load (Cache Components can't pre-render them).
  useEffect(() => {
    setHello(greeting());
    setDay(dayOfYear());
    const supabase = createClient();
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    (async () => {
      const [planRes, profileRes, mealsRes] = await Promise.all([
        // Latest saved routine set with its exercises (RLS: only this user's plans).
        supabase
          .from("workout_plans")
          .select(
            "id, created_at, plan_days(day_label, focus, day_order, plan_exercises(dose, exercise_order, exercises(name)))",
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("macro_profiles").select("*").maybeSingle(),
        supabase
          .from("meal_logs")
          .select("total_kcal, protein_g, carbs_g, fat_g")
          .gte("eaten_at", midnight.toISOString()),
      ]);

      if (planRes.data) setPlan(planRes.data as unknown as LatestPlan);
      const t = profileRes.data ? targetFromProfile(profileRes.data) : null;
      setGoal(t?.goal ?? null);
      setTarget(t?.target ?? null);
      setToday(
        sum(
          (mealsRes.data ?? []).map((m) => ({
            kcal: Number(m.total_kcal),
            protein: Number(m.protein_g),
            carbs: Number(m.carbs_g),
            fat: Number(m.fat_g),
          })),
        ),
      );
      setLoaded(true);
    })();
  }, []);

  const routine = plan ? todaysRoutine(plan.plan_days ?? [], day) : null;
  const moves = routine
    ? [...(routine.plan_exercises ?? [])].sort((a, b) => a.exercise_order - b.exercise_order)
    : [];
  const pct = (eaten: number, goalValue: number) => (goalValue > 0 ? Math.round((eaten / goalValue) * 100) : 0);
  const left = target && today ? target.calories - today.kcal : null;

  return (
    <div className="flex flex-col gap-7">
      {/* Welcome banner with today's routine */}
      <section
        aria-label="Today's routine"
        className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-primary p-7 text-primary-foreground sm:p-8"
      >
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-2.5">
          <h1 className="text-3xl font-black leading-tight sm:text-[42px]">
            {hello}! Time for a stretch?
          </h1>
          {!loaded ? (
            <p className="text-lg text-[#DCE3F7]">Loading your routine…</p>
          ) : routine ? (
            <>
              <p className="text-lg text-[#DCE3F7]">
                Today&apos;s routine is <b className="text-white">Routine {routine.day_label}: {routine.focus}</b>
                {moves.length > 0 && ` · ${moves.length} exercises`}
              </p>
              {moves.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {moves.slice(0, 5).map((m, i) => (
                    <li key={i} className="rounded-full bg-[#2E3B6B] px-3 py-1 text-sm font-semibold">
                      {m.exercises?.name ?? "Exercise"}
                    </li>
                  ))}
                  {moves.length > 5 && (
                    <li className="rounded-full bg-[#2E3B6B] px-3 py-1 text-sm font-semibold">
                      +{moves.length - 5} more
                    </li>
                  )}
                </ul>
              )}
            </>
          ) : (
            <p className="text-lg text-[#DCE3F7]">
              You don&apos;t have a routine yet. Build one in about a minute: short, gentle and made for your desk.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href="/protected/workout"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-black text-brand-foreground no-underline hover:brightness-95"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              {routine ? "View my routines" : "Build my routine"}
            </Link>
            <Link
              href="/protected/meals"
              className="inline-flex min-h-12 items-center rounded-full border-2 border-[#4A5C9A] px-6 font-extrabold text-white no-underline hover:bg-white/10"
            >
              Log a meal
            </Link>
          </div>
        </div>
        <DeskIllustration className="mx-auto hidden w-full max-w-[240px] flex-[0_1_240px] sm:block" />
      </section>

      {/* Today's nutrition */}
      <section
        aria-labelledby="today-fuel"
        className="flex flex-col gap-5 rounded-[28px] bg-card p-7 shadow-[0_8px_24px_rgba(24,35,74,0.06)]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="today-fuel" className="text-[22px] font-black">
            Today&apos;s fuel
          </h2>
          {target && goal && left !== null && (
            <span className="font-bold text-muted-foreground">
              Goal: {GOAL_LABEL[goal]} ·{" "}
              {left >= 0 ? `${left} kcal left` : `${Math.abs(left)} kcal over`}
            </span>
          )}
        </div>

        {!loaded ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : target && today ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Calories", today.kcal, target.calories, "kcal", "hsl(var(--brand))"],
                ["Protein", today.protein, target.protein, "g protein", "hsl(var(--info))"],
                ["Carbs", today.carbs, target.carbs, "g carbs", "hsl(var(--info))"],
                ["Fat", today.fat, target.fat, "g fat", "hsl(var(--info))"],
              ] as const
            ).map(([label, eaten, goalValue, unit, color]) => (
              <div key={label} className="flex items-center gap-3.5">
                <Ring pct={pct(eaten, goalValue)} color={color} label={label} />
                <div>
                  <div className="text-xl font-black">
                    {Math.round(eaten).toLocaleString()}
                    {label === "Calories" ? "" : " g"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    of {goalValue.toLocaleString()} {unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            <Link href="/protected/macros" className="font-bold text-foreground underline">
              Set your targets
            </Link>{" "}
            in the macro calculator to see today&apos;s progress here.
          </p>
        )}
        <Link href="/protected/meals/history" className="self-start text-sm font-bold text-foreground underline">
          View meal history →
        </Link>
      </section>

      {/* Tools */}
      <section aria-labelledby="tools" className="flex flex-col gap-3.5">
        <h2 id="tools" className="text-[22px] font-black">
          What would you like to do?
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col gap-2 rounded-3xl p-6 text-foreground no-underline transition hover:-translate-y-0.5 hover:shadow-md ${t.tint}`}
            >
              <svg
                aria-hidden="true"
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {t.icon}
              </svg>
              <span className="text-[19px] font-black">{t.title}</span>
              <span className="text-[15px] text-[#3E4970]">{t.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
