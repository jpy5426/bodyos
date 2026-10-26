"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { ExerciseFigure, VideoLink } from "@/components/exercise-figure";

type Goal = "desk_relief" | "injury_prevention" | "mobility";
type Level = "ground_zero" | "beginner" | "intermediate";
type Where = "seated" | "standing" | "floor";

const FOCUS_AREAS = [
  "neck",
  "shoulders",
  "upper back",
  "lower back",
  "hips",
  "knees",
  "ankles",
  "wrists",
];

const EQUIPMENT_OPTIONS: { key: string; label: string }[] = [
  { key: "resistance_band", label: "Resistance band" },
  { key: "step", label: "Step or stair" },
  { key: "strap", label: "Strap or belt" },
  { key: "towel", label: "Towel" },
];

const GOAL_LABEL: Record<Goal, string> = {
  desk_relief: "Desk relief",
  injury_prevention: "Injury prevention",
  mobility: "Mobility",
};

type PlanBlock = {
  name: string;
  body_region: string;
  position: string;
  dose: string;
  cues: string[];
};
type PlanDay = { id?: string; day_label: string; focus: string; blocks: PlanBlock[] };
type Plan = {
  id: string;
  objective: Goal;
  level: string;
  weeks: number;
  minutes: number;
  guide: string;
  days: PlanDay[];
};

const field = "w-full min-h-11 rounded-xl border border-input bg-card px-3 py-2 text-foreground";

export default function RoutinePage() {
  const [objective, setObjective] = useState<Goal>("desk_relief");
  const [level, setLevel] = useState<Level>("ground_zero");
  const [age, setAge] = useState("30");
  const [where, setWhere] = useState<Where>("standing");
  const [minutes, setMinutes] = useState("10");
  const [weeks, setWeeks] = useState("4");
  const [focusAreas, setFocusAreas] = useState<Set<string>>(new Set());
  const [equipment, setEquipment] = useState<Set<string>>(new Set());
  const [hasPain, setHasPain] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  function toggle(setter: Dispatch<SetStateAction<Set<string>>>, key: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleGenerate() {
    setError(null);
    setPlan(null);

    const a = Number(age);
    const wk = Number(weeks);
    if (![a, wk].every(Number.isFinite) || a <= 0) {
      setError("Please enter valid numbers.");
      return;
    }
    if (a < 18) {
      setError("BodyOS routines are for adults 18 and older.");
      return;
    }
    if (wk < 4 || wk > 12) {
      setError("Program length must be between 4 and 12 weeks.");
      return;
    }
    if (hasPain) {
      setError(
        "Because you have current pain or an injury, please follow a plan from a physical therapist or doctor. BodyOS routines are for prevention only.",
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective,
          level,
          age: a,
          where,
          minutes: Number(minutes),
          weeks: wk,
          focusAreas: Array.from(focusAreas),
          equipment: Array.from(equipment),
          hasPain,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Something went wrong building your routine.");
        return;
      }
      setPlan(data.plan);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Mobility &amp; Prehab Routine Builder</h1>
        <p className="text-sm text-muted-foreground">
          Short, low-impact routines for people who sit most of the day, want to prevent injuries, or
          want to move better.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-5 shadow-sm">
        <label className="space-y-1">
          <span className="text-sm">Goal</span>
          <select className={field} value={objective} onChange={(e) => setObjective(e.target.value as Goal)}>
            <option value="desk_relief">Desk relief (sit most of the day)</option>
            <option value="injury_prevention">Injury prevention (prehab)</option>
            <option value="mobility">Improve mobility</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm">Current activity level</span>
          <select className={field} value={level} onChange={(e) => setLevel(e.target.value as Level)}>
            <option value="ground_zero">Ground zero (mostly sitting)</option>
            <option value="beginner">Some activity</option>
            <option value="intermediate">Active, want better movement</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm">Where can you exercise?</span>
          <select className={field} value={where} onChange={(e) => setWhere(e.target.value as Where)}>
            <option value="seated">Seated only (at my desk)</option>
            <option value="standing">Seated or standing</option>
            <option value="floor">Anywhere, including the floor</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm">Minutes per session</span>
          <select className={field} value={minutes} onChange={(e) => setMinutes(e.target.value)}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20">20</option>
            <option value="30">30</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm">Age</span>
          <input className={field} value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" />
        </label>
        <label className="space-y-1">
          <span className="text-sm">Program length (weeks)</span>
          <input className={field} value={weeks} onChange={(e) => setWeeks(e.target.value)} inputMode="numeric" />
        </label>
      </div>

      <div className="space-y-2">
        <span className="text-sm">Body areas to focus on (leave blank for whole body)</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FOCUS_AREAS.map((area) => (
            <label key={area} className="flex items-center gap-2 text-sm capitalize">
              <input type="checkbox" checked={focusAreas.has(area)} onChange={() => toggle(setFocusAreas, area)} />
              {area}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm">Equipment you have (a chair and a wall are always included)</span>
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={equipment.has(opt.key)} onChange={() => toggle(setEquipment, opt.key)} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-2 rounded-xl border bg-card p-4 text-sm">
        <input type="checkbox" className="mt-1" checked={hasPain} onChange={(e) => setHasPain(e.target.checked)} />
        <span>
          I have current pain or an injury.
          <span className="block text-muted-foreground">
            BodyOS is for prevention. If you&apos;re hurt, a physical therapist or doctor should guide your exercise.
          </span>
        </span>
      </label>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex min-h-12 items-center justify-center rounded-lg bg-brand px-7 font-bold text-brand-foreground hover:brightness-95 disabled:opacity-50"
      >
        {loading ? "Building your routine... this can take up to a minute" : "Build my routine"}
      </button>

      {error && <p className="text-red-500">{error}</p>}

      {plan && (
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {GOAL_LABEL[plan.objective]} &middot; {plan.minutes} min &middot; {plan.weeks} weeks &middot; rotate
              routines A → B → C
            </p>
            <p className="rounded-xl bg-secondary p-4 text-sm">{plan.guide}</p>
          </div>
          {plan.days.map((day) => (
            <div key={day.day_label} className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold">
                Routine {day.day_label}: {day.focus}
              </h2>
              <ol className="divide-y">
                {day.blocks.map((b, i) => (
                  <li key={i} className="grid gap-3 py-4 first:pt-1 last:pb-0 sm:grid-cols-[minmax(0,240px)_1fr] sm:gap-5">
                    <ExerciseFigure name={b.name} />
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <h3 className="font-bold">
                          <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                          {b.name}
                        </h3>
                        <span className="text-sm font-bold">{b.dose}</span>
                      </div>
                      <p className="text-xs capitalize text-muted-foreground">
                        {b.body_region} · {b.position}
                      </p>
                      {b.cues.length > 0 && (
                        <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                          {b.cues.map((c, k) => (
                            <li key={k}>{c}</li>
                          ))}
                        </ul>
                      )}
                      <VideoLink name={b.name} />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        General education, not medical advice. Move within a pain-free range and stop if anything hurts.
      </p>
    </div>
  );
}