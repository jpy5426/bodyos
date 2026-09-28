"use client";

import { useState } from "react";

type Objective = "fat_loss" | "muscle_gain" | "strength" | "endurance" | "general_health";
type Level = "ground_zero" | "beginner" | "intermediate" | "advanced";
type Gender = "male" | "female" | "other";

const EQUIPMENT_OPTIONS: { key: string; label: string }[] = [
  { key: "dumbbells", label: "Dumbbells" },
  { key: "barbell", label: "Barbell" },
  { key: "resistance_band", label: "Resistance band" },
  { key: "pullup_bar", label: "Pull-up bar" },
  { key: "kettlebell", label: "Kettlebell" },
  { key: "jump_rope", label: "Jump rope" },
];

type PlanBlock = {
  name: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_sec: number;
  cues: string[];
};
type PlanDay = { id?: string; day_label: string; focus: string; blocks: PlanBlock[] };
type Plan = { id: string; objective: string; level: string; weeks: number; days: PlanDay[] };

const field =
  "w-full rounded-md border bg-background px-3 py-2 text-foreground";

export default function WorkoutPage() {
  const [objective, setObjective] = useState<Objective>("general_health");
  const [level, setLevel] = useState<Level>("beginner");
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState("25");
  const [weightLbs, setWeightLbs] = useState("170");
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("10");
  const [weeks, setWeeks] = useState("8");
  const [equipment, setEquipment] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  function toggleEquipment(key: string) {
    setEquipment((prev) => {
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
    const w = Number(weightLbs);
    const ft = Number(feet);
    const inch = Number(inches);
    const wk = Number(weeks);
    if (![a, w, ft, inch, wk].every(Number.isFinite) || a <= 0 || w <= 0 || ft <= 0) {
      setError("Please enter valid numbers.");
      return;
    }
    if (a < 18) {
      setError("BodyOS plans are for adults 18 and older.");
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
          gender,
          age: a,
          weightLbs: w,
          heightIn: ft * 12 + inch,
          weeks: wk,
          equipment: Array.from(equipment),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Something went wrong generating your plan.");
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
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Workout Plan Generator</h1>

      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="text-sm">Objective</span>
          <select className={field} value={objective} onChange={(e) => setObjective(e.target.value as Objective)}>
            <option value="general_health">General health</option>
            <option value="fat_loss">Fat loss</option>
            <option value="muscle_gain">Muscle gain</option>
            <option value="strength">Strength</option>
            <option value="endurance">Endurance</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm">Level</span>
          <select className={field} value={level} onChange={(e) => setLevel(e.target.value as Level)}>
            <option value="ground_zero">Ground zero (just starting out)</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm">Gender</span>
          <select className={field} value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm">Age</span>
          <input className={field} value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" />
        </label>
        <label className="space-y-1">
          <span className="text-sm">Weight (lbs)</span>
          <input className={field} value={weightLbs} onChange={(e) => setWeightLbs(e.target.value)} inputMode="decimal" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-sm">Feet</span>
            <input className={field} value={feet} onChange={(e) => setFeet(e.target.value)} inputMode="numeric" />
          </label>
          <label className="space-y-1">
            <span className="text-sm">Inches</span>
            <input className={field} value={inches} onChange={(e) => setInches(e.target.value)} inputMode="decimal" />
          </label>
        </div>
        <label className="space-y-1">
          <span className="text-sm">Plan length (weeks)</span>
          <input className={field} value={weeks} onChange={(e) => setWeeks(e.target.value)} inputMode="numeric" />
        </label>
      </div>

      <div className="space-y-2">
        <span className="text-sm">Equipment you have (bodyweight is always included)</span>
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={equipment.has(opt.key)}
                onChange={() => toggleEquipment(opt.key)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {loading ? "Generating... this can take up to a minute" : "Generate plan"}
      </button>

      {error && <p className="text-red-500">{error}</p>}

      {plan && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {plan.weeks}-week plan &middot; {plan.objective.replace("_", " ")} &middot; {plan.level.replace("_", " ")}
          </p>
          {plan.days.map((day) => (
            <div key={day.day_label} className="rounded-md border p-4 space-y-3">
              <h2 className="text-lg font-semibold">
                Day {day.day_label}: {day.focus}
              </h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-1">Exercise</th>
                    <th>Sets</th>
                    <th>Reps</th>
                    <th>Rest</th>
                    <th>Cues</th>
                  </tr>
                </thead>
                <tbody>
                  {day.blocks.map((b, i) => (
                    <tr key={i} className="border-b align-top">
                      <td className="py-2 font-medium">{b.name}</td>
                      <td>{b.sets}</td>
                      <td>{b.reps_min}-{b.reps_max}</td>
                      <td>{b.rest_sec}s</td>
                      <td className="text-muted-foreground">{b.cues.join("; ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Estimates only, not medical advice. Stop if any exercise causes pain.
      </p>
    </div>
  );
}