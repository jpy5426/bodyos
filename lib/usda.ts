// USDA FoodData Central lookups. All calorie and macro numbers in BodyOS's
// photo estimator come from here, never from the AI model.
// API docs: https://fdc.nal.usda.gov/api-guide

import type { Per100g } from "./nutrition";

export type { Per100g };

export type UsdaMatch = {
  fdcId: number;
  description: string;
  dataType: string;
  per100g: Per100g;
  energyEstimated: boolean; // true if kcal was computed from macros (4/4/9)
};

type FdcNutrient = {
  nutrientId?: number;
  nutrientNumber?: string;
  nutrientName?: string;
  unitName?: string;
  value?: number;
};

type FdcFood = {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients?: FdcNutrient[];
};

// Nutrient IDs used by FoodData Central.
const ENERGY_KCAL_IDS = [1008, 2047, 2048]; // Energy; Atwater General; Atwater Specific
const PROTEIN_ID = 1003;
const FAT_ID = 1004;
const CARBS_ID = 1005;

// Generic (non-branded) datasets. Values in these are per 100 g.
// Survey (FNDDS) covers prepared/cooked dishes; Foundation and SR Legacy cover ingredients.
const DATA_TYPES = ["Survey (FNDDS)", "Foundation", "SR Legacy"];

function find(nutrients: FdcNutrient[], id: number): number | undefined {
  const n = nutrients.find((x) => x.nutrientId === id);
  return typeof n?.value === "number" ? n.value : undefined;
}

// Pulls per-100 g calories and macros from one search result.
// Exported so it can be unit tested without calling the API.
export function parseFood(food: FdcFood): UsdaMatch | null {
  const nutrients = food.foodNutrients ?? [];
  const protein = find(nutrients, PROTEIN_ID);
  const fat = find(nutrients, FAT_ID);
  const carbs = find(nutrients, CARBS_ID);

  let kcal: number | undefined;
  for (const id of ENERGY_KCAL_IDS) {
    const n = nutrients.find((x) => x.nutrientId === id && x.unitName?.toUpperCase() === "KCAL");
    if (typeof n?.value === "number") {
      kcal = n.value;
      break;
    }
  }

  let energyEstimated = false;
  if (kcal === undefined) {
    if (protein === undefined && fat === undefined && carbs === undefined) return null;
    // Atwater general factors as a fallback.
    kcal = 4 * (protein ?? 0) + 4 * (carbs ?? 0) + 9 * (fat ?? 0);
    energyEstimated = true;
  }

  return {
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    per100g: { kcal, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 },
    energyEstimated,
  };
}

// ---- Picking the right search result ---------------------------------------
// USDA's own ranking is text relevance, so "salmon fillet" can rank
// "Emu, fan fillet" first. We re-score candidates ourselves.

// Words that don't identify a food.
const STOPWORDS = new Set(["and", "or", "the", "a", "an", "of", "in", "on", "to", "for", "as", "from", "nfs", "ns"]);
// Cooking/prep words: nice to match, but never required.
const METHODS = new Set([
  "raw", "cooked", "grilled", "baked", "broiled", "roasted", "steamed", "boiled", "fried",
  "sauteed", "poached", "scrambled", "fresh", "plain", "homemade", "toasted",
]);
// Portion/shape words that USDA descriptions rarely use.
const NOISE = new Set(["fillet", "fillets", "slice", "slices", "piece", "pieces", "bowl", "cup", "serving", "portion"]);

// Processed or different forms of a food. Heavily penalized unless the search asks for them
// (so "salmon" doesn't become "Salmon nuggets" and "blueberries" doesn't become "Blueberry juice").
const PROCESSED = new Set([
  "nugget", "nuggets", "breaded", "battered", "patty", "patties", "stick", "sticks", "fingers",
  "cake", "cakes", "pie", "soup", "sandwich", "casserole", "loaf", "croquette", "canned", "smoked",
  "dried", "dehydrated", "juice", "babyfood", "infant", "formula", "pudding", "muffin", "bread",
  "gravy", "frozen", "dessert", "candy", "flavored", "imitation", "substitute", "mix", "powder",
]);
// Category words USDA puts in front of names ("Fish, salmon, ..."). Not counted as extras.
const CATEGORY = new Set(["fish", "meat", "only", "whole", "nfs", "ns", "not", "further", "specified"]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// "berries" ~ "berry", "eggs" ~ "egg".
function same(a: string, b: string): boolean {
  const norm = (w: string) => w.replace(/(ies)$/, "y").replace(/(es|s)$/, "");
  return a === b || norm(a) === norm(b);
}

// Higher is better. Returns null if the candidate doesn't contain the food itself.
export function scoreCandidate(query: string, description: string, rank = 0): number | null {
  const q = tokens(query);
  const core = q.filter((w) => !METHODS.has(w) && !NOISE.has(w));
  const methods = q.filter((w) => METHODS.has(w));
  const d = tokens(description);
  if (core.length === 0) return null;

  const coreHits = core.filter((w) => d.some((x) => same(w, x))).length;
  if (coreHits === 0) return null; // e.g. "salmon" vs "Emu, fan fillet"

  const methodHits = methods.filter((w) => d.some((x) => same(w, x))).length;
  const unasked = d.filter((x) => !q.some((w) => same(w, x)));
  const extras = unasked.filter((x) => !CATEGORY.has(x)).length;
  const processed = unasked.filter((x) => PROCESSED.has(x)).length;
  const addsWith = d.includes("with") && !q.includes("with"); // "with sauce", "with fruit"

  return (
    (coreHits / core.length) * 10 +
    methodHits -
    extras * 0.3 -
    processed * 3 -
    (addsWith ? 2 : 0) -
    rank * 0.05
  );
}

// Searches FoodData Central and returns the best usable match, or null.
export async function searchFood(query: string): Promise<UsdaMatch | null> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) throw new Error("USDA_API_KEY is not set");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, dataType: DATA_TYPES, pageSize: 25 }),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      console.error("USDA search failed:", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    const foods: FdcFood[] = Array.isArray(data?.foods) ? data.foods : [];
    return pickBest(query, foods);
  } catch (err) {
    console.error("USDA search error:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Exported for unit tests.
export function pickBest(query: string, foods: FdcFood[]): UsdaMatch | null {
  let best: { match: UsdaMatch; score: number } | null = null;
  foods.forEach((food, rank) => {
    const score = scoreCandidate(query, food.description ?? "", rank);
    if (score === null) return;
    const match = parseFood(food);
    if (match && (!best || score > best.score)) best = { match, score };
  });
  return best ? (best as { match: UsdaMatch }).match : null;
}
