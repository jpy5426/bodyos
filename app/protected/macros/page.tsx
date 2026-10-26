"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  computeMacros,
  GOALS,
  isGoal,
  MIN_CALORIES,
  type Activity,
  type Goal,
  type MacroResult,
  type Preset,
  type Sex,
} from "@/lib/macros";

const field =
  "w-full min-h-11 rounded-xl border border-input bg-card px-3 py-2 text-foreground";

export default function MacrosPage() {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("25");
  const [weightLbs, setWeightLbs] = useState("170");
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("10");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [preset, setPreset] = useState<Preset>("balanced");
  const [goal, setGoal] = useState<Goal>("maintenance");
  const [result, setResult] = useState<MacroResult | null>(null);
  const [raised, setRaised] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Load the saved profile (row-level security returns only this user's row).
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data, error: loadError } = await supabase
        .from("macro_profiles")
        .select("*")
        .maybeSingle();
      if (loadError) {
        setError(`Could not load your saved profile: ${loadError.message}`);
        return;
      }
      if (data) {
        setSex(data.sex as Sex);
        setAge(String(data.age));
        setWeightLbs(String(data.weight_lbs));
        setFeet(String(Math.floor(data.height_in / 12)));
        setInches(String(Math.round((data.height_in % 12) * 10) / 10));
        setActivity(data.activity as Activity);
        setPreset(data.preset as Preset);
        if (isGoal(data.goal)) setGoal(data.goal);
      }
    })();
  }, []);

  async function handleCalculate() {
    setError(null);
    setStatus(null);
    const a = Number(age);
    const w = Number(weightLbs);
    const ft = Number(feet);
    const inch = Number(inches);
    if (![a, w, ft, inch].every(Number.isFinite) || a <= 0 || w <= 0 || ft <= 0) {
      setError("Please enter valid numbers.");
      setResult(null);
      return;
    }
    if (a < 18) {
      setError("BodyOS targets are for adults 18 and older.");
      setResult(null);
      return;
    }

    try {
      const adjusted = computeMacros(w, ft * 12 + inch, a, sex, activity, preset);
      setResult(adjusted.result);
      setRaised(adjusted.raised);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed.");
      setResult(null);
      return;
    }

    // Save the inputs (and the chosen goal) for next time.
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Please log in again to save your profile.");
      return;
    }
    const { error: saveError } = await supabase.from("macro_profiles").upsert({
      user_id: userData.user.id,
      sex,
      age: a,
      weight_lbs: w,
      height_in: ft * 12 + inch,
      activity,
      preset,
      goal,
      updated_at: new Date().toISOString(),
    });
    if (saveError) setError(`Calculated, but saving failed: ${saveError.message}`);
    else setStatus("Profile saved. Your meal log now uses this goal.");
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Macro Calculator</h1>
        <p className="text-muted-foreground">
          Your daily calorie and protein, carb and fat targets. The goal you pick here is what your meal log tracks.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-5 shadow-sm">
        <label className="space-y-1">
          <span className="text-sm">Sex</span>
          <select className={field} value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
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
          <span className="text-sm">Activity</span>
          <select className={field} value={activity} onChange={(e) => setActivity(e.target.value as Activity)}>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very_active">Very active</option>
            <option value="extra_active">Extra active</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm">Macro split</span>
          <select className={field} value={preset} onChange={(e) => setPreset(e.target.value as Preset)}>
            <option value="balanced">Balanced</option>
            <option value="high_protein">High protein</option>
            <option value="low_carb">Low carb</option>
            <option value="high_carb">High carb</option>
          </select>
        </label>
        <label className="col-span-2 space-y-1">
          <span className="text-sm">Goal</span>
          <select className={field} value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            <option value="maintenance">Maintain weight</option>
            <option value="cutting">Lose weight (cut, −20%)</option>
            <option value="bulking">Gain weight (bulk, +15%)</option>
          </select>
        </label>
      </div>

      <button
        onClick={handleCalculate}
        className="inline-flex min-h-12 items-center justify-center rounded-lg bg-brand px-7 font-bold text-brand-foreground hover:brightness-95"
      >
        Calculate
      </button>

      {error && <p className="text-red-500">{error}</p>}
      {status && <p className="text-green-600">{status}</p>}

      {result && (
        <div className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Goal</th>
                <th>Calories</th>
                <th>Protein (g)</th>
                <th>Carbs (g)</th>
                <th>Fat (g)</th>
              </tr>
            </thead>
            <tbody>
              {GOALS.map(([label, key]) => (
                <tr key={key} className={`border-b ${key === goal ? "bg-brand/20 font-bold" : "text-muted-foreground"}`}>
                  <td className="py-2 pl-2">
                    {label}
                    {key === goal && <span className="ml-2 text-xs font-normal">your target</span>}
                  </td>
                  <td>{result[key].calories}</td>
                  <td>{result[key].protein}</td>
                  <td>{result[key].carbs}</td>
                  <td>{result[key].fat}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {raised && (
            <p className="text-sm">
              Cutting target raised to a {MIN_CALORIES[sex]}-calorie minimum.
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Estimates only, not medical advice.
      </p>
    </div>
  );
}
