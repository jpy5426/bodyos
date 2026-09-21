"use client";

import { useEffect, useState } from "react";
import { calculateMacros, lbsToKg, feetInchesToCm } from "@finegym/fitness-calc";
import { createClient } from "@/lib/supabase/client";

type Sex = "male" | "female";
type Activity =
  | "sedentary" | "light" | "moderate"
  | "active" | "very_active" | "extra_active";
type Preset = "balanced" | "low_carb" | "high_carb" | "high_protein";
type MacroResult = ReturnType<typeof calculateMacros>;

const goals = [
  ["Maintenance", "maintenance"],
  ["Cutting", "cutting"],
  ["Bulking", "bulking"],
] as const;

const field =
  "w-full rounded-md border bg-background px-3 py-2 text-foreground";

// Common minimum daily calories for unsupervised dieting.
const MIN_CALORIES: Record<Sex, number> = { female: 1200, male: 1500 };

function applyFloor(result: MacroResult, sex: Sex) {
  const min = MIN_CALORIES[sex];
  const cut = result.cutting;
  if (cut.calories >= min) return { result, raised: false };
  const f = min / cut.calories;
  return {
    result: {
      ...result,
      cutting: {
        ...cut,
        calories: min,
        protein: Math.round(cut.protein * f),
        carbs: Math.round(cut.carbs * f),
        fat: Math.round(cut.fat * f),
      },
    },
    raised: true,
  };
}

export default function MacrosPage() {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("25");
  const [weightLbs, setWeightLbs] = useState("170");
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("10");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [preset, setPreset] = useState<Preset>("balanced");
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
      const raw = calculateMacros(lbsToKg(w), feetInchesToCm(ft, inch), a, sex, activity, preset);
      const adjusted = applyFloor(raw, sex);
      setResult(adjusted.result);
      setRaised(adjusted.raised);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed.");
      setResult(null);
      return;
    }

    // Save the inputs for next time.
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
      updated_at: new Date().toISOString(),
    });
    if (saveError) setError(`Calculated, but saving failed: ${saveError.message}`);
    else setStatus("Profile saved.");
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Macro Calculator</h1>

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <button
        onClick={handleCalculate}
        className="rounded-md bg-foreground px-4 py-2 text-background"
      >
        Calculate
      </button>

      {error && <p className="text-red-500">{error}</p>}
      {status && <p className="text-green-600">{status}</p>}

      {result && (
        <>
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
              {goals.map(([label, key]) => (
                <tr key={key} className="border-b">
                  <td className="py-2">{label}</td>
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
        </>
      )}

      <p className="text-sm text-muted-foreground">
        Estimates only, not medical advice.
      </p>
    </div>
  );
}