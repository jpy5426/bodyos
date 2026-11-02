"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FuelPerspective } from "@/components/fuel-perspective";
import { createClient } from "@/lib/supabase/client";
import { scale, sum, type Per100g } from "@/lib/nutrition";
import { GOAL_LABEL, targetFromProfile, type Goal, type Target } from "@/lib/macros";
import { isHeic, HEIC_HELP } from "@/lib/image";
import { readResponse } from "@/lib/client-fetch";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

type Item = {
  name: string;
  grams: number;
  ai_grams: number | null; // null when the user added the food by hand
  confidence: "high" | "medium" | "low";
  matched: boolean;
  fdc_id: number | null;
  usda_description: string | null;
  per100g: Per100g | null;
};

type SearchResult = {
  fdc_id: number;
  description: string;
  data_type: string;
  per100g: Per100g;
};

type SavedMeal = {
  id: string;
  meal_type: string;
  eaten_at: string;
  total_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

const field = "w-full min-h-11 rounded-xl border border-input bg-card px-3 py-2 text-foreground";
const ZERO: Per100g = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

// Shrinks the photo in the browser before upload (max 1024 px, JPEG).
// Keeps uploads small and fast, and well under the API image limit.
function resizeImage(file: File, maxSide = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Could not process the image."));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be read as an image."));
    };
    img.src = url;
  });
}

function portion(item: Item): Per100g {
  return item.per100g ? scale(item.per100g, item.grams) : ZERO;
}

function defaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 5) return "snack";
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export default function MealsPage() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [mealType, setMealType] = useState<MealType>("snack");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  // Daily target for the goal picked in the Macro Calculator.
  const [goal, setGoal] = useState<Goal | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [weightLbs, setWeightLbs] = useState<number | null>(null);
  const [today, setToday] = useState<SavedMeal[]>([]);
  // USDA search panel: which row it's fixing, or "new" to add a food.
  const [searchTarget, setSearchTarget] = useState<number | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  const loadToday = useCallback(async () => {
    const supabase = createClient();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data, error: loadError } = await supabase
      .from("meal_logs")
      .select("id,meal_type,eaten_at,total_kcal,protein_g,carbs_g,fat_g")
      .gte("eaten_at", start.toISOString())
      .order("eaten_at", { ascending: false });
    if (loadError) setError(`Could not load today's meals: ${loadError.message}`);
    else setToday((data ?? []) as SavedMeal[]);
  }, []);

  // Daily target comes from the saved macro profile and its chosen goal.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.from("macro_profiles").select("*").maybeSingle();
      const t = data ? targetFromProfile(data) : null;
      setGoal(t?.goal ?? null);
      setTarget(t?.target ?? null);
      setWeightLbs(data?.weight_lbs ? Number(data.weight_lbs) : null);
    })();
    loadToday();
    // Reads the clock, so it runs in the browser after load (Cache Components can't pre-render it).
    setMealType(defaultMealType());
  }, [loadToday]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    setStatus(null);
    setItems([]);
    if (!file) return;
    const heic = isHeic(file);
    // Windows often reports HEIC files with an empty type, so check the name too.
    if (!file.type.startsWith("image/") && !heic) {
      setError("Please choose a photo.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError("That file is over 30 MB. Please choose a smaller photo.");
      return;
    }
    try {
      // Safari can open HEIC, so try first and only explain if the browser can't.
      setPhoto(await resizeImage(file));
    } catch (err) {
      setError(heic ? HEIC_HELP : err instanceof Error ? err.message : "Could not read that photo.");
    }
  }

  async function analyze() {
    if (!photo) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/estimate-meal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: photo, mediaType: "image/jpeg" }),
      });
      const data = await readResponse(res);
      setItems(data.items as Item[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function setGrams(i: number, value: string) {
    const g = Number(value);
    setItems((prev) =>
      prev.map((it, j) => (j === i ? { ...it, grams: Number.isFinite(g) ? Math.min(1500, Math.max(0, g)) : 0 } : it)),
    );
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, j) => j !== i));
    setSearchTarget(null);
  }

  function openSearch(target: number | "new") {
    setSearchTarget(target);
    setQuery(target === "new" ? "" : items[target].name);
    setResults([]);
    setSearchMsg(null);
  }

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setSearchMsg("Type at least 2 letters.");
      return;
    }
    setSearching(true);
    setSearchMsg(null);
    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(q)}`);
      const data = await readResponse(res);
      setResults(data.results as SearchResult[]);
      if (data.results.length === 0) setSearchMsg("No USDA foods found. Try a simpler word, like \"salmon\".");
    } catch (err) {
      setSearchMsg(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  // Applies the chosen USDA food to a row, or adds it as a new row.
  function chooseResult(r: SearchResult) {
    const usda = { matched: true, fdc_id: r.fdc_id, usda_description: r.description, per100g: r.per100g };
    if (searchTarget === "new") {
      const name = query.trim() || r.description;
      setItems((prev) => [
        ...prev,
        { name: name.charAt(0).toUpperCase() + name.slice(1), grams: 100, ai_grams: null, confidence: "high", ...usda },
      ]);
    } else if (typeof searchTarget === "number") {
      setItems((prev) => prev.map((it, j) => (j === searchTarget ? { ...it, ...usda } : it)));
    }
    setSearchTarget(null);
    setResults([]);
  }

  async function saveMeal() {
    const counted = items.filter((it) => it.matched && it.grams > 0);
    if (counted.length === 0) {
      setError("There's nothing to save. Every item needs a USDA match and a weight above 0 g.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    const supabase = createClient();
    const t = sum(counted.map(portion));

    const { data: meal, error: mealError } = await supabase
      .from("meal_logs")
      .insert({
        meal_type: mealType,
        total_kcal: t.kcal,
        protein_g: t.protein,
        carbs_g: t.carbs,
        fat_g: t.fat,
      })
      .select()
      .single();
    if (mealError || !meal) {
      setBusy(false);
      setError(`Saving failed: ${mealError?.message ?? "unknown error"}`);
      return;
    }

    const rows = counted.map((it, i) => {
      const p = portion(it);
      return {
        meal_id: meal.id,
        name: it.name,
        grams: it.grams,
        ai_grams: it.ai_grams,
        confidence: it.confidence,
        fdc_id: it.fdc_id,
        usda_description: it.usda_description,
        kcal: p.kcal,
        protein_g: p.protein,
        carbs_g: p.carbs,
        fat_g: p.fat,
        item_order: i,
      };
    });
    const { error: itemsError } = await supabase.from("meal_items").insert(rows);
    if (itemsError) {
      // Don't leave a meal with no items behind.
      await supabase.from("meal_logs").delete().eq("id", meal.id);
      setBusy(false);
      setError(`Saving failed: ${itemsError.message}`);
      return;
    }

    setBusy(false);
    setStatus("Meal saved.");
    setItems([]);
    setPhoto(null);
    setSearchTarget(null);
    loadToday();
  }

  async function deleteMeal(id: string) {
    const supabase = createClient();
    const { error: delError } = await supabase.from("meal_logs").delete().eq("id", id);
    if (delError) setError(`Delete failed: ${delError.message}`);
    else loadToday();
  }

  const mealTotal = sum(items.filter((it) => it.matched).map(portion));
  const dayTotals = sum(
    today.map((m) => ({
      kcal: Number(m.total_kcal),
      protein: Number(m.protein_g),
      carbs: Number(m.carbs_g),
      fat: Number(m.fat_g),
    })),
  );
  const unmatched = items.filter((it) => !it.matched).length;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Meal Photo Estimator</h1>
        <p className="text-sm text-muted-foreground">
          AI names the foods and guesses the portion. Calories and macros come from USDA FoodData Central.
          Check the weights before saving.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
        <label className="block space-y-1">
          <span className="text-sm">Photo of your plate (top-down works best)</span>
          <input type="file" accept="image/*" capture="environment" onChange={handleFile} className={field} />
        </label>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Meal preview" className="max-h-72 rounded-xl border object-contain" />
        )}
        <button
          onClick={analyze}
          disabled={!photo || busy}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-brand px-7 font-bold text-brand-foreground hover:brightness-95 disabled:opacity-50"
        >
          {busy && items.length === 0 ? "Analyzing…" : "Estimate calories"}
        </button>
      </div>

      {error && <p className="text-red-500">{error}</p>}
      {status && <p className="text-green-600">{status}</p>}

      {photo === null && items.length === 0 && searchTarget === null && (
        <button onClick={() => openSearch("new")} className="text-sm underline">
          No photo? Add foods by hand
        </button>
      )}

      {(items.length > 0 || searchTarget === "new") && (
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          {items.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Food</th>
                <th className="w-24">Grams</th>
                <th>kcal</th>
                <th>P</th>
                <th>C</th>
                <th>F</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const p = portion(it);
                return (
                  <tr key={i} className="border-b align-top">
                    <td className="py-2 pr-2">
                      <div className="font-medium">
                        {it.name}
                        {it.confidence === "low" && (
                          <span className="ml-2 rounded bg-yellow-100 px-1 text-xs text-yellow-800">check this</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {it.matched ? `USDA: ${it.usda_description}` : "No USDA match, not counted"}
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className={field + " px-2 py-1"}
                        value={it.grams}
                        onChange={(e) => setGrams(i, e.target.value)}
                        inputMode="numeric"
                        aria-label={`Grams of ${it.name}`}
                      />
                    </td>
                    <td className="py-2">{it.matched ? p.kcal : "–"}</td>
                    <td className="py-2">{it.matched ? p.protein : "–"}</td>
                    <td className="py-2">{it.matched ? p.carbs : "–"}</td>
                    <td className="py-2">{it.matched ? p.fat : "–"}</td>
                    <td className="py-2 pl-3">
                      <div className="flex flex-col items-start gap-1">
                        <button onClick={() => openSearch(i)} className="text-xs underline" aria-label={`Change USDA match for ${it.name}`}>
                          {it.matched ? "Change" : "Find match"}
                        </button>
                        <button onClick={() => removeItem(i)} className="text-xs text-red-500" aria-label={`Remove ${it.name}`}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="font-semibold">
                <td className="py-2">Meal total</td>
                <td />
                <td className="py-2">{mealTotal.kcal}</td>
                <td className="py-2">{mealTotal.protein}</td>
                <td className="py-2">{mealTotal.carbs}</td>
                <td className="py-2">{mealTotal.fat}</td>
                <td />
              </tr>
            </tbody>
          </table>
          )}

          {unmatched > 0 && (
            <p className="text-sm text-muted-foreground">
              {unmatched} item{unmatched > 1 ? "s" : ""} had no USDA match and {unmatched > 1 ? "are" : "is"} not
              counted.
            </p>
          )}
          {searchTarget === null ? (
            <button onClick={() => openSearch("new")} className="text-sm underline">
              + Add a food the AI missed
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border bg-secondary/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {searchTarget === "new"
                    ? "Add a food"
                    : `Choose the right USDA food for "${items[searchTarget]?.name}"`}
                </p>
                <button onClick={() => setSearchTarget(null)} className="text-xs underline">
                  Cancel
                </button>
              </div>
              <form onSubmit={runSearch} className="flex gap-2">
                <input
                  className={field}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. greek yogurt plain"
                  autoFocus
                  aria-label="Search USDA foods"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {searching ? "…" : "Search"}
                </button>
              </form>
              {searchMsg && <p className="text-sm text-muted-foreground">{searchMsg}</p>}
              {results.length > 0 && (
                <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                  {results.map((r) => (
                    <li key={r.fdc_id}>
                      <button
                        onClick={() => chooseResult(r)}
                        className="flex w-full justify-between gap-3 p-2 text-left text-sm hover:bg-accent"
                      >
                        <span>{r.description}</span>
                        <span className="shrink-0 text-muted-foreground">{Math.round(r.per100g.kcal)} kcal/100 g</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {target && goal && items.length > 0 && (
            <p className="text-sm">
              This meal is about <b>{Math.round((mealTotal.kcal / target.calories) * 100)}%</b> of your{" "}
              {target.calories} kcal daily {GOAL_LABEL[goal]} target.
            </p>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
              <span className="text-sm">Meal</span>
              <select className={field} value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </label>
            <button
              onClick={saveMeal}
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Save meal
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Today</h2>
          <Link href="/protected/meals/history" className="text-sm underline">
            View history →
          </Link>
        </div>

        {target && goal ? (
          <div className="space-y-2 rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Goal: <span className="font-medium capitalize text-foreground">{GOAL_LABEL[goal]}</span> ·{" "}
              <Link href="/protected/macros" className="underline">
                change
              </Link>
            </p>
            {(
              [
                ["Calories", dayTotals.kcal, target.calories, "kcal"],
                ["Protein", dayTotals.protein, target.protein, "g"],
                ["Carbs", dayTotals.carbs, target.carbs, "g"],
                ["Fat", dayTotals.fat, target.fat, "g"],
              ] as const
            ).map(([label, eaten, goalValue, unit]) => {
              const pct = goalValue > 0 ? Math.round((eaten / goalValue) * 100) : 0;
              return (
                <div key={label} className="text-sm">
                  <div className="flex justify-between">
                    <span>{label}</span>
                    <span>
                      {Math.round(eaten)} / {goalValue} {unit} <span className="text-muted-foreground">({pct}%)</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${pct > 100 ? "bg-red-500" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <FuelPerspective eaten={dayTotals.kcal} target={target.calories} weightLbs={weightLbs} className="mt-3" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href="/protected/macros" className="underline">
              Save a profile in the Macro Calculator
            </Link>{" "}
            to compare your meals against a daily target.
          </p>
        )}

        {today.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meals saved today.</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {today.map((m) => (
              <li key={m.id} className="flex items-center justify-between p-3 text-sm">
                <span>
                  <span className="font-medium capitalize">{m.meal_type}</span>{" "}
                  <span className="text-muted-foreground">
                    {new Date(m.eaten_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </span>
                <span className="flex items-center gap-4">
                  <span>
                    {m.total_kcal} kcal · P {m.protein_g} · C {m.carbs_g} · F {m.fat_g}
                  </span>
                  <button onClick={() => deleteMeal(m.id)} className="text-xs text-red-500">
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Portion sizes from photos are estimates and can be off by 20–30%. For general wellness only, not medical or
        dietary advice.
      </p>
    </div>
  );
}
