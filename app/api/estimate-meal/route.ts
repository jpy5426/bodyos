import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, extractJson } from "@/lib/claude";
import { searchFood } from "@/lib/usda";
import { scale, sum, type Per100g } from "@/lib/nutrition";

// Hybrid design:
//   1) Claude (vision) ONLY names the foods and estimates grams.
//   2) USDA FoodData Central supplies the calories and macros per 100 g.
//   3) The math (grams x per-100 g) is deterministic code.
// The model never outputs a calorie number.

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type MediaType = (typeof ALLOWED_TYPES)[number];

const MAX_BASE64_CHARS = 5_000_000; // ~3.7 MB image; the page resizes to ~200 KB first
const MAX_ITEMS = 8;
const MIN_GRAMS = 1;
const MAX_GRAMS = 1500;

type Confidence = "high" | "medium" | "low";

type ModelItem = {
  name: string;
  usda_query: string;
  grams: number;
  confidence: Confidence;
};

const SYSTEM_PROMPT = `You look at a photo of a meal and list the foods in it with estimated portion weights.

You MUST respond ONLY with valid JSON. No prose, no markdown fences.

RESPONSE FORMAT (follow EXACTLY):
{
  "is_food": true,
  "items": [
    {
      "name": "<short plain name a user would recognize, e.g. Grilled chicken breast>",
      "usda_query": "<2-4 word USDA FoodData Central search: generic food name first, then cooking method. No brands and no portion words like fillet, slice, piece or bowl. e.g. chicken breast grilled, salmon baked, cottage cheese, rice white cooked>",
      "grams": <estimated edible weight in grams, a whole number>,
      "confidence": "high" | "medium" | "low"
    }
  ]
}

CRITICAL RULES:
1. Do NOT output calories, protein, carbs, fat or any nutrition numbers. Only names and grams.
2. List each distinct food separately (e.g. rice and chicken are two items). Combine identical pieces into one item.
3. Include visible sauces, dressings, oils and drinks as their own items when they are clearly present.
4. Estimate grams from visual cues: plate size (a dinner plate is about 26 cm), utensils, hands, and typical serving sizes.
5. Use "low" confidence when the food is partly hidden, mixed, or hard to identify.
6. At most ${MAX_ITEMS} items. Skip garnishes under 5 g and plain water.
7. If the photo does not show food or drink, return {"is_food": false, "items": []}.`;

function asConfidence(v: unknown): Confidence {
  return v === "high" || v === "medium" || v === "low" ? v : "low";
}

// Validates the model output instead of trusting it.
function cleanItems(raw: unknown): { isFood: boolean; items: ModelItem[] } {
  const obj = (raw ?? {}) as { is_food?: unknown; items?: unknown };
  const list = Array.isArray(obj.items) ? obj.items : [];
  const items: ModelItem[] = [];
  for (const it of list.slice(0, MAX_ITEMS)) {
    const name = typeof it?.name === "string" ? it.name.trim().slice(0, 80) : "";
    const query = typeof it?.usda_query === "string" ? it.usda_query.trim().slice(0, 80) : name;
    const grams = Math.round(Number(it?.grams));
    if (!name || !Number.isFinite(grams)) continue;
    if (/^(plain |tap |still |a glass of )?water$/i.test(name)) continue; // zero calories, just clutter
    items.push({
      name,
      usda_query: query || name,
      grams: Math.min(MAX_GRAMS, Math.max(MIN_GRAMS, grams)),
      confidence: asConfidence(it?.confidence),
    });
  }
  return { isFood: obj.is_food !== false && items.length > 0, items };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  let body: { image?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const image = typeof body.image === "string" ? body.image.replace(/^data:[^,]+,/, "") : "";
  const mediaType = body.mediaType as MediaType;
  if (!image || !ALLOWED_TYPES.includes(mediaType)) {
    return NextResponse.json({ error: "Please upload a JPEG, PNG or WebP photo." }, { status: 400 });
  }
  if (image.length > MAX_BASE64_CHARS) {
    return NextResponse.json({ error: "That photo is too large. Try a smaller one." }, { status: 413 });
  }

  // 1) Vision model: foods + grams only.
  let responseText: string;
  try {
    responseText = await callClaude(SYSTEM_PROMPT, [
      { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
      { type: "text", text: "List the foods in this meal with estimated grams. JSON only." },
    ]);
  } catch (err) {
    console.error("Vision call failed:", err);
    return NextResponse.json(
      { error: "The AI service is unavailable right now. Please try again in a moment." },
      { status: 502 },
    );
  }

  let parsed: unknown;
  try {
    parsed = extractJson(responseText);
  } catch {
    console.error("Model returned non-JSON:", responseText.slice(0, 500));
    return NextResponse.json({ error: "The AI returned an unusable response. Please try again." }, { status: 502 });
  }

  const { isFood, items } = cleanItems(parsed);
  if (!isFood) {
    return NextResponse.json(
      { error: "No food was found in that photo. Try a clearer, top-down photo of your plate." },
      { status: 422 },
    );
  }

  // 2) USDA lookups, in parallel.
  const matches = await Promise.all(items.map((it) => searchFood(it.usda_query)));

  // 3) Deterministic math.
  const results = items.map((it, i) => {
    const m = matches[i];
    const per100g: Per100g | null = m ? m.per100g : null;
    return {
      name: it.name,
      grams: it.grams,
      ai_grams: it.grams,
      confidence: it.confidence,
      matched: !!m,
      fdc_id: m?.fdcId ?? null,
      usda_description: m?.description ?? null,
      usda_data_type: m?.dataType ?? null,
      energy_estimated: m?.energyEstimated ?? false,
      per100g,
      ...(per100g ? scale(per100g, it.grams) : { kcal: 0, protein: 0, carbs: 0, fat: 0 }),
    };
  });

  const totals = sum(results);

  return NextResponse.json({
    items: results,
    totals,
    meta: { found: items.length, matched: results.filter((r) => r.matched).length },
  });
}
