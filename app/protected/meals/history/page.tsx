"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sum } from "@/lib/nutrition";
import { GOAL_LABEL, targetFromProfile, type Goal, type Target } from "@/lib/macros";

type MealItem = {
  name: string;
  grams: number;
  kcal: number;
  usda_description: string | null;
  item_order: number;
};

type Meal = {
  id: string;
  meal_type: string;
  eaten_at: string;
  total_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_items: MealItem[];
};

type Day = {
  key: string; // YYYY-MM-DD in the user's local time
  date: Date;
  meals: Meal[];
  totals: { kcal: number; protein: number; carbs: number; fat: number };
};

const RANGES = [7, 14, 30] as const;

function localKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "On target" = within 10% of the goal's calories.
function status(kcal: number, target: number): { label: string; cls: string } {
  const pct = kcal / target;
  if (pct < 0.9) return { label: "under", cls: "text-muted-foreground" };
  if (pct <= 1.1) return { label: "on target", cls: "text-green-600" };
  return { label: "over", cls: "text-red-500" };
}

export default function MealHistoryPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Midnight today in the user's time zone. Set in the browser after load, because
  // Cache Components can't pre-render a value that depends on the clock.
  const [todayStart, setTodayStart] = useState<Date | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.from("macro_profiles").select("*").maybeSingle();
      const t = data ? targetFromProfile(data) : null;
      setGoal(t?.goal ?? null);
      setTarget(t?.target ?? null);
    })();
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setTodayStart(d);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (range - 1));
    setLoading(true);
    (async () => {
      // meal_items is joined through its meal_id foreign key; RLS limits both to this user.
      const { data, error: loadError } = await supabase
        .from("meal_logs")
        .select(
          "id,meal_type,eaten_at,total_kcal,protein_g,carbs_g,fat_g,meal_items(name,grams,kcal,usda_description,item_order)",
        )
        .gte("eaten_at", start.toISOString())
        .order("eaten_at", { ascending: false });
      if (loadError) setError(`Could not load your meals: ${loadError.message}`);
      else {
        setError(null);
        setMeals((data ?? []) as Meal[]);
      }
      setLoading(false);
    })();
  }, [range]);

  // Every day in the range, newest first, including days with nothing logged.
  const days: Day[] = useMemo(() => {
    const byKey = new Map<string, Meal[]>();
    for (const m of meals) {
      const k = localKey(new Date(m.eaten_at));
      byKey.set(k, [...(byKey.get(k) ?? []), m]);
    }
    const out: Day[] = [];
    if (!todayStart) return out;
    for (let i = 0; i < range; i++) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const k = localKey(d);
      const dayMeals = byKey.get(k) ?? [];
      out.push({
        key: k,
        date: d,
        meals: dayMeals,
        totals: sum(
          dayMeals.map((m) => ({
            kcal: Number(m.total_kcal),
            protein: Number(m.protein_g),
            carbs: Number(m.carbs_g),
            fat: Number(m.fat_g),
          })),
        ),
      });
    }
    return out;
  }, [meals, range, todayStart]);

  const logged = days.filter((d) => d.meals.length > 0);
  const avg = logged.length
    ? {
        kcal: Math.round(logged.reduce((t, d) => t + d.totals.kcal, 0) / logged.length),
        protein: Math.round(logged.reduce((t, d) => t + d.totals.protein, 0) / logged.length),
      }
    : null;
  const onTarget = target ? logged.filter((d) => status(d.totals.kcal, target.calories).label === "on target").length : 0;

  // Chart scale: tallest of any day or the target, plus headroom.
  const chartMax = Math.max(target?.calories ?? 0, ...days.map((d) => d.totals.kcal), 1) * 1.1;
  const chartDays = [...days].reverse(); // oldest on the left

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Meal History</h1>
          <p className="text-sm text-muted-foreground">
            {goal && target ? (
              <>
                Compared with your {target.calories} kcal {GOAL_LABEL[goal]} target.
              </>
            ) : (
              <>
                <Link href="/protected/macros" className="underline">
                  Save a profile
                </Link>{" "}
                to compare days against a target.
              </>
            )}
          </p>
        </div>
        <Link href="/protected/meals" className="shrink-0 text-sm underline">
          ← Log a meal
        </Link>
      </div>

      <div className="flex gap-2" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            aria-pressed={range === r}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold ${range === r ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
          >
            {r} days
          </button>
        ))}
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {!loading && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-3xl border bg-card p-4 shadow-[0_8px_24px_rgba(24,35,74,0.06)]">
            <div className="text-2xl font-semibold">{logged.length}</div>
            <div className="text-xs text-muted-foreground">days logged</div>
          </div>
          <div className="rounded-3xl border bg-card p-4 shadow-[0_8px_24px_rgba(24,35,74,0.06)]">
            <div className="text-2xl font-semibold">{avg ? avg.kcal : "–"}</div>
            <div className="text-xs text-muted-foreground">avg kcal / logged day</div>
          </div>
          <div className="rounded-3xl border bg-card p-4 shadow-[0_8px_24px_rgba(24,35,74,0.06)]">
            <div className="text-2xl font-semibold">{target ? `${onTarget}/${logged.length}` : "–"}</div>
            <div className="text-xs text-muted-foreground">days within 10% of target</div>
          </div>
        </div>
      )}

      {/* Daily calories chart */}
      {!loading && logged.length > 0 && (
        <div className="rounded-3xl border bg-card p-5 shadow-[0_8px_24px_rgba(24,35,74,0.06)]">
          <p className="mb-2 text-xs text-muted-foreground">
            Daily calories · dashed line = target ({target ? target.calories : "none"} kcal)
          </p>
          <div className="relative flex h-40 items-end gap-1">
            {target && (
              <div
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/60"
                style={{ bottom: `${(target.calories / chartMax) * 100}%` }}
              />
            )}
            {chartDays.map((d) => {
              const h = (d.totals.kcal / chartMax) * 100;
              const over = target ? d.totals.kcal > target.calories * 1.1 : false;
              return (
                <div
                  key={d.key}
                  className="flex h-full flex-1 items-end"
                  title={`${d.date.toLocaleDateString([], { month: "short", day: "numeric" })}: ${d.totals.kcal} kcal`}
                >
                  <div
                    className={`w-full rounded-t ${over ? "bg-red-500" : "bg-primary"}`}
                    style={{ height: `${h}%`, minHeight: d.totals.kcal > 0 ? 2 : 0 }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{chartDays[0].date.toLocaleDateString([], { month: "short", day: "numeric" })}</span>
            <span>Today</span>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : logged.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No meals in the last {range} days.{" "}
          <Link href="/protected/meals" className="underline">
            Log one
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-3">
          {days
            .filter((d) => d.meals.length > 0)
            .map((d) => {
              const s = target ? status(d.totals.kcal, target.calories) : null;
              return (
                <div key={d.key} className="overflow-hidden rounded-3xl border bg-card shadow-[0_8px_24px_rgba(24,35,74,0.06)]">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b p-3">
                    <span className="whitespace-nowrap font-medium">
                      {d.date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span className="text-sm sm:text-right">
                      <b>{d.totals.kcal}</b>
                      {target && ` / ${target.calories}`} kcal · P {d.totals.protein} · C {d.totals.carbs} · F{" "}
                      {d.totals.fat}
                      {s && <span className={`ml-2 whitespace-nowrap ${s.cls}`}>{s.label}</span>}
                    </span>
                  </div>
                  <ul className="divide-y">
                    {d.meals.map((m) => (
                      <li key={m.id} className="p-3 text-sm">
                        <details>
                          <summary className="flex cursor-pointer list-none items-center justify-between">
                            <span>
                              <span className="font-medium capitalize">{m.meal_type}</span>{" "}
                              <span className="text-muted-foreground">
                                {new Date(m.eaten_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                              </span>
                            </span>
                            <span>
                              {m.total_kcal} kcal <span className="text-muted-foreground">▾</span>
                            </span>
                          </summary>
                          <ul className="mt-2 space-y-1 pl-3">
                            {[...(m.meal_items ?? [])]
                              .sort((a, b) => a.item_order - b.item_order)
                              .map((it, i) => (
                                <li key={i} className="flex justify-between text-muted-foreground">
                                  <span>
                                    {it.name} · {Number(it.grams)} g
                                  </span>
                                  <span>{it.kcal} kcal</span>
                                </li>
                              ))}
                          </ul>
                        </details>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
