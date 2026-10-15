// Pure nutrition math shared by the server route and the meals page.
// No API keys or network calls here, so it is safe to import in client code.

export type Per100g = { kcal: number; protein: number; carbs: number; fat: number };

// Scales per-100 g values to a portion. Rounded for display.
export function scale(per100g: Per100g, grams: number): Per100g {
  const f = grams / 100;
  return {
    kcal: Math.round(per100g.kcal * f),
    protein: Math.round(per100g.protein * f * 10) / 10,
    carbs: Math.round(per100g.carbs * f * 10) / 10,
    fat: Math.round(per100g.fat * f * 10) / 10,
  };
}

// Adds up a list of portions.
export function sum(rows: Per100g[]): Per100g {
  const t = rows.reduce(
    (acc, r) => ({
      kcal: acc.kcal + r.kcal,
      protein: acc.protein + r.protein,
      carbs: acc.carbs + r.carbs,
      fat: acc.fat + r.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return {
    kcal: Math.round(t.kcal),
    protein: Math.round(t.protein * 10) / 10,
    carbs: Math.round(t.carbs * 10) / 10,
    fat: Math.round(t.fat * 10) / 10,
  };
}
