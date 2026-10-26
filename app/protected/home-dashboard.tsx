"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Calculator,
  Camera,
  History,
  Play,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sum } from "@/lib/nutrition";
import { GOAL_LABEL, targetFromProfile, type Goal, type Target } from "@/lib/macros";
import { ExerciseFigure } from "@/components/exercise-figure";
import { FuelPerspective } from "@/components/fuel-perspective";

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

const card = "rounded-xl border bg-card shadow-[0_1px_2px_rgba(24,35,74,0.04),0_8px_24px_rgba(24,35,74,0.05)]";
const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";

function Bar({ pct, tone }: { pct: number; tone: "brand" | "navy" }) {
  const over = pct > 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="presentation">
      <div
        className={`h-full rounded-full ${over ? "bg-destructive" : tone === "brand" ? "bg-brand" : "bg-primary"}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

const TOOLS = [
  { href: "/protected/workout", title: "Build a routine", desc: "Gentle moves picked for your body and your time.", Icon: Sparkles },
  { href: "/protected/library", title: "Browse exercises", desc: "54 desk, prehab and mobility moves with pictures.", Icon: BookOpen },
  { href: "/protected/macros", title: "Set my targets", desc: "Calories and macros to maintain, cut or bulk.", Icon: Calculator },
  { href: "/protected/meals", title: "Snap a meal", desc: "Photo in, calories out, checked against USDA data.", Icon: Camera },
];

export function HomeDashboard() {
  const [plan, setPlan] = useState<LatestPlan | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [weightLbs, setWeightLbs] = useState<number | null>(null);
  const [today, setToday] = useState<Today | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hello, setHello] = useState("Welcome back");
  const [dateLabel, setDateLabel] = useState("");
  const [day, setDay] = useState(0);

  // Clock-based values are set in the browser after load (Cache Components can't pre-render them).
  useEffect(() => {
    setHello(greeting());
    setDateLabel(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
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
      setWeightLbs(profileRes.data?.weight_lbs ? Number(profileRes.data.weight_lbs) : null);
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
  const left = target && today ? target.calories - Math.round(today.kcal) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{dateLabel || " "}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{hello}</h1>
          <p className="text-muted-foreground">Here&apos;s your movement and nutrition for today.</p>
        </div>
        <Link
          href="/protected/meals"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground no-underline hover:brightness-95"
        >
          <UtensilsCrossed aria-hidden="true" className="h-4 w-4" />
          Log a meal
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Today's routine */}
        <section aria-labelledby="routine-h" className={`${card} flex flex-col gap-4 p-6 lg:col-span-3`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Activity aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className={eyebrow}>Today&apos;s routine</p>
                <h2 id="routine-h" className="text-lg font-semibold leading-snug">
                  {!loaded ? "Loading…" : routine ? `Routine ${routine.day_label} · ${routine.focus}` : "No routine yet"}
                </h2>
              </div>
            </div>
            {routine && moves.length > 0 && (
              <span className="shrink-0 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold">
                {moves.length} exercises
              </span>
            )}
          </div>

          {loaded && routine && moves.length > 0 && (
            <ol className="grid gap-3 sm:grid-cols-2">
              {moves.slice(0, 4).map((m, i) => (
                <li key={i} className="flex flex-col gap-2 rounded-xl border p-2.5">
                  <ExerciseFigure name={m.exercises?.name ?? ""} className="border-0" />
                  <div className="flex items-baseline justify-between gap-2 px-1">
                    <span className="text-sm font-bold">
                      <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                      {m.exercises?.name ?? "Exercise"}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{m.dose}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {loaded && routine && moves.length > 4 && (
            <p className="text-sm text-muted-foreground">+{moves.length - 4} more in this routine</p>
          )}
          {loaded && !routine && (
            <p className="text-muted-foreground">
              Build one in about a minute: short, gentle routines picked from a vetted library of 54 desk, prehab and
              mobility moves.
            </p>
          )}

          <div className="mt-auto flex flex-wrap gap-3 pt-1">
            <Link
              href="/protected/workout"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground no-underline hover:bg-primary/90"
            >
              <Play aria-hidden="true" className="h-4 w-4" />
              {routine ? "Open routine builder" : "Build my routine"}
            </Link>
            <Link
              href="/protected/library"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-5 text-sm font-semibold text-foreground no-underline hover:bg-muted"
            >
              <BookOpen aria-hidden="true" className="h-4 w-4" />
              Exercise library
            </Link>
          </div>
        </section>

        {/* Today's fuel */}
        <section aria-labelledby="fuel-h" className={`${card} flex flex-col gap-4 p-6 lg:col-span-2`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={eyebrow} id="fuel-h">
                Today&apos;s fuel
              </p>
              {target && today ? (
                <p className="mt-1">
                  <span className="text-[34px] font-semibold leading-none tracking-tight">
                    {Math.round(today.kcal).toLocaleString()}
                  </span>
                  <span className="ml-1.5 text-muted-foreground">/ {target.calories.toLocaleString()} kcal</span>
                </p>
              ) : (
                <p className="mt-1 text-lg font-semibold">{loaded ? "No targets yet" : "Loading…"}</p>
              )}
            </div>
            {goal && (
              <Link
                href="/protected/macros"
                className="shrink-0 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold capitalize text-foreground no-underline hover:bg-muted"
                title="Change your goal in the macro calculator"
              >
                {GOAL_LABEL[goal]}
              </Link>
            )}
          </div>

          {loaded && target && today ? (
            <>
              <div className="space-y-1.5">
                <Bar pct={pct(today.kcal, target.calories)} tone="brand" />
                <p className={`text-sm font-bold ${left !== null && left < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {left !== null && left >= 0
                    ? `${left.toLocaleString()} kcal left · ${pct(today.kcal, target.calories)}% of target`
                    : `${Math.abs(left ?? 0).toLocaleString()} kcal over target`}
                </p>
              </div>
              <div className="space-y-2.5">
                {(
                  [
                    ["Protein", today.protein, target.protein],
                    ["Carbs", today.carbs, target.carbs],
                    ["Fat", today.fat, target.fat],
                  ] as const
                ).map(([label, eaten, goalValue]) => (
                  <div key={label} className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold">{label}</span>
                      <span className="text-muted-foreground">
                        <span className="font-bold text-foreground">{Math.round(eaten)}</span> / {goalValue} g
                      </span>
                    </div>
                    <Bar pct={pct(eaten, goalValue)} tone="navy" />
                  </div>
                ))}
              </div>
              <FuelPerspective eaten={today.kcal} target={target.calories} weightLbs={weightLbs} />
            </>
          ) : loaded ? (
            <p className="text-sm text-muted-foreground">
              <Link href="/protected/macros" className="font-bold text-foreground underline">
                Set your targets
              </Link>{" "}
              in the macro calculator to track today&apos;s calories and macros here.
            </p>
          ) : null}

          <Link
            href="/protected/meals/history"
            className="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-bold text-foreground underline-offset-2 hover:underline"
          >
            <History aria-hidden="true" className="h-4 w-4" />
            Meal history
          </Link>
        </section>
      </div>

      {/* Quick actions */}
      <section aria-labelledby="tools" className="flex flex-col gap-3">
        <h2 id="tools" className="text-lg font-semibold">
          Quick actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map(({ href, title, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${card} group flex flex-col gap-2 p-5 text-foreground no-underline transition hover:border-info/60`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="mt-1 font-semibold">{title}</span>
              <span className="text-sm text-muted-foreground">{desc}</span>
              <ArrowRight
                aria-hidden="true"
                className="mt-auto h-4 w-4 self-end text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
