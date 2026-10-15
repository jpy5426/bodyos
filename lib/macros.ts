// Shared macro-target math for the Macro Calculator and the Meal Photo Estimator.
// Deterministic: Mifflin-St Jeor via @finegym/fitness-calc, then the calorie floor.
import { calculateMacros, lbsToKg } from "@finegym/fitness-calc";

export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active" | "extra_active";
export type Preset = "balanced" | "low_carb" | "high_carb" | "high_protein";
export type Goal = "maintenance" | "cutting" | "bulking";
export type MacroResult = ReturnType<typeof calculateMacros>;
export type Target = { calories: number; protein: number; carbs: number; fat: number };

export const GOALS: [string, Goal][] = [
  ["Maintenance", "maintenance"],
  ["Cutting", "cutting"],
  ["Bulking", "bulking"],
];

export const GOAL_LABEL: Record<Goal, string> = {
  maintenance: "maintenance",
  cutting: "cutting",
  bulking: "bulking",
};

// Common minimum daily calories for unsupervised dieting.
export const MIN_CALORIES: Record<Sex, number> = { female: 1200, male: 1500 };

export function applyFloor(result: MacroResult, sex: Sex) {
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

export function isGoal(v: unknown): v is Goal {
  return v === "maintenance" || v === "cutting" || v === "bulking";
}

// All three goals for a person, with the floor applied.
export function computeMacros(
  weightLbs: number,
  heightIn: number,
  age: number,
  sex: Sex,
  activity: Activity,
  preset: Preset,
) {
  const raw = calculateMacros(lbsToKg(weightLbs), heightIn * 2.54, age, sex, activity, preset);
  return applyFloor(raw, sex);
}

type ProfileRow = {
  sex: string;
  age: number | string;
  weight_lbs: number | string;
  height_in: number | string;
  activity: string;
  preset: string;
  goal?: string | null;
};

// The daily target for the goal the user picked in the Macro Calculator.
export function targetFromProfile(row: ProfileRow): { goal: Goal; target: Target } | null {
  try {
    const { result } = computeMacros(
      Number(row.weight_lbs),
      Number(row.height_in),
      Number(row.age),
      row.sex as Sex,
      row.activity as Activity,
      row.preset as Preset,
    );
    const goal: Goal = isGoal(row.goal) ? row.goal : "maintenance";
    const t = result[goal];
    return { goal, target: { calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat } };
  } catch {
    return null;
  }
}
