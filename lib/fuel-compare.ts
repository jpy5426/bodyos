// "Today's fuel" comparisons: turn a calorie number into something easy to picture.
// Deterministic math only, no AI.
//
// Activity minutes: kcal per minute = MET × 3.5 × body weight (kg) / 200   (standard ACSM equation)
//   MET values from the 2024 Adult Compendium of Physical Activities (pacompendium.com):
//   17352  treadmill walking, 2.5–2.9 mph, 0% grade  = 3.5 MET
//   17358  treadmill walking, 3.5–3.9 mph, 0% grade  = 4.8 MET
// Food equivalents: USDA FoodData Central (SR Legacy) energy per 100 g × a standard portion.
//
// Wording stays neutral ("about the energy in ..."), never "burn it off" or "earn it back".

export const ACTIVITIES = [
  { key: "easy_walk", label: "easy walking", detail: "treadmill, 2.5–2.9 mph", met: 3.5 },
  { key: "brisk_walk", label: "brisk walking", detail: "treadmill, 3.5–3.9 mph", met: 4.8 },
] as const;

type Food = {
  key: string;
  kcalPer100g: number;
  portionGrams: number;
  say: (n: number) => string; // phrase for n portions
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// kcal per portion = kcalPer100g × portionGrams / 100
export const FOODS: Food[] = [
  { key: "banana", kcalPer100g: 89, portionGrams: 118, say: (n) => plural(n, "medium banana", "medium bananas") },
  { key: "apple", kcalPer100g: 52, portionGrams: 182, say: (n) => plural(n, "medium apple", "medium apples") },
  { key: "egg", kcalPer100g: 155, portionGrams: 50, say: (n) => plural(n, "large hard-boiled egg", "large hard-boiled eggs") },
  { key: "rice", kcalPer100g: 130, portionGrams: 158, say: (n) => plural(n, "cup of cooked white rice", "cups of cooked white rice") },
  { key: "almonds", kcalPer100g: 579, portionGrams: 28.35, say: (n) => `${n} oz of almonds (about ${n * 23})` },
  { key: "peanut_butter", kcalPer100g: 588, portionGrams: 16, say: (n) => plural(n, "tablespoon of peanut butter", "tablespoons of peanut butter") },
  { key: "chicken", kcalPer100g: 165, portionGrams: 85, say: (n) => `${n * 3} oz of roasted chicken breast` },
];

// For bigger amounts: one plate = 6 oz roasted chicken breast (170 g) + 1 cup cooked white rice (158 g).
export const PLATE_KCAL = (165 * 170) / 100 + (130 * 158) / 100; // ≈ 486 kcal

export function portionKcal(f: Food): number {
  return (f.kcalPer100g * f.portionGrams) / 100;
}

export function lbsToKg(lbs: number): number {
  return lbs * 0.45359237;
}

// Minutes of an activity that use about `kcal` for a person of this weight.
export function activityMinutes(kcal: number, weightKg: number, met: number): number {
  if (kcal <= 0 || weightKg <= 0 || met <= 0) return 0;
  const perMinute = (met * 3.5 * weightKg) / 200;
  return kcal / perMinute;
}

export function formatMinutes(min: number): string {
  const m = Math.max(1, Math.round(min / 5) * 5); // nearest 5 minutes reads as an estimate
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

// Picks the food whose count is closest to a whole number (1–3 portions), so the phrase is easy to picture.
export function foodEquivalent(kcal: number): { count: number; phrase: string } | null {
  if (kcal < 40) return null;
  let best: { food: Food; count: number; err: number } | null = null;
  for (const f of FOODS) {
    const ratio = kcal / portionKcal(f);
    const count = Math.round(ratio);
    if (count < 1 || count > 3) continue;
    const err = Math.abs(ratio - count) / ratio;
    if (!best || err < best.err - 1e-9 || (Math.abs(err - best.err) < 1e-9 && count < best.count)) best = { food: f, count, err };
  }
  if (!best) {
    const count = Math.max(0.5, Math.round((kcal / PLATE_KCAL) * 2) / 2);
    return { count, phrase: `${count} ${count === 1 ? "plate" : "plates"} of chicken and rice (6 oz chicken + 1 cup rice each)` };
  }
  return { count: best.count, phrase: best.food.say(best.count) };
}

export type FuelComparison = {
  state: "under" | "over" | "on_target";
  remaining: number; // kcal left (negative when over)
  lines: { label: string; text: string }[];
};

// Builds the one or two short comparison lines shown under "Today's fuel" (for calories left or over).
export function compareFuel(eaten: number, target: number, weightLbs: number | null): FuelComparison {
  const remaining = Math.round(target - eaten);
  const kg = weightLbs && weightLbs > 0 ? lbsToKg(weightLbs) : 0;
  const lines: { label: string; text: string }[] = [];
  const state: FuelComparison["state"] = Math.abs(remaining) <= target * 0.03 ? "on_target" : remaining > 0 ? "under" : "over";

  const amount = Math.abs(remaining);
  if (state === "on_target") {
    lines.push({ label: "On target", text: "You're within 3% of today's calorie target." });
    return { state, remaining, lines };
  }
  const food = foodEquivalent(amount);
  const head = state === "under" ? `${amount.toLocaleString()} kcal left` : `${amount.toLocaleString()} kcal over your target`;
  lines.push({ label: state === "under" ? "Left today" : "Over target", text: food ? `${head}, about ${food.phrase}` : head });
  if (kg) {
    const easy = activityMinutes(amount, kg, ACTIVITIES[0].met);
    const brisk = activityMinutes(amount, kg, ACTIVITIES[1].met);
    lines.push({
      label: "In activity",
      text: `about the energy of ${formatMinutes(easy)} of easy walking or ${formatMinutes(brisk)} of brisk walking at your weight`,
    });
  }
  return { state, remaining, lines };
}
