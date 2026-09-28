import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---- Request shape from the intake form -----------------------------------
type Intake = {
  objective: "fat_loss" | "muscle_gain" | "strength" | "endurance" | "general_health";
  level: "ground_zero" | "beginner" | "intermediate" | "advanced";
  gender: "male" | "female" | "other";
  age: number;
  weightLbs: number;
  heightIn: number;
  weeks: number;
  equipment: string[]; // subset of: dumbbells, barbell, resistance_band, pullup_bar, kettlebell, jump_rope
};

type DbExercise = {
  id: string;
  name: string;
  category: string;
  primary_muscles: string;
  difficulty: number;
};

// Ground zero only pulls from difficulty 1. Everyone else gets 1 and 2;
// intermediate/advanced also unlock 3. Level differences beyond that come
// from the rep/set/rest ranges below, not from which exercises are offered.
function maxDifficultyFor(level: Intake["level"]): number {
  if (level === "ground_zero") return 1;
  if (level === "beginner") return 2;
  return 3;
}

function daysFor(level: Intake["level"]): number {
  return level === "ground_zero" ? 3 : 4;
}

// Rep/set/rest ranges by level. Deliberately not AI-generated -- these are
// the same kind of deterministic guardrail as the macro calculator.
const RPN: Record<Intake["level"], { sets: string; reps: string; rest: string }> = {
  ground_zero: { sets: "1-2", reps: "5-10 (or a time, e.g. 20-30 sec)", rest: "60-90 sec" },
  beginner: { sets: "2-3", reps: "8-12", rest: "60-90 sec" },
  intermediate: { sets: "3-4", reps: "8-12", rest: "45-75 sec" },
  advanced: { sets: "3-5", reps: "6-12", rest: "45-90 sec" },
};

function buildSystemPrompt(intake: Intake, exercises: DbExercise[]): string {
  const list = exercises
    .map((e, i) => `${i + 1}. ${e.name} (${e.category}; ${e.primary_muscles})`)
    .join("\n");

  const rpn = RPN[intake.level];
  const days = daysFor(intake.level);

  return `You are an expert personal fitness trainer. Create a personalized training plan.

You MUST respond ONLY with valid JSON. No prose, no markdown fences -- just the JSON object.

AVAILABLE EXERCISES (you MUST ONLY use exercises from this list, referenced by their number):
${list}

TARGET RANGES for this user's level (${intake.level}):
- Sets per exercise: ${rpn.sets}
- Reps per set: ${rpn.reps}
- Rest between sets: ${rpn.rest}

RESPONSE FORMAT (follow EXACTLY):
{
  "days": [
    {
      "day": "A",
      "focus": "<short focus, e.g. Upper Body>",
      "blocks": [
        { "ref": <exercise number from the list above>, "sets": <number>, "reps": [<min>, <max>], "rest_sec": <number>, "cues": ["<cue1>", "<cue2>"] }
      ]
    }
  ]
}

CRITICAL RULES:
1. Every "ref" MUST be a number that exists in the AVAILABLE EXERCISES list. Never invent exercises or names.
2. Produce exactly ${days} days, labelled "A"${days > 3 ? ', "B", "C", "D"' : ', "B", "C"'}, each with a distinct focus and 4-6 blocks.
3. Stay within the target ranges above; vary within them to fit each exercise.
4. Provide 2-3 concise, encouraging form cues per block.
5. Do not repeat the same exercise within a day.
6. If the user's level is "ground_zero", keep the tone especially encouraging -- this may be their first structured routine in a long time.`;
}

function buildUserPrompt(intake: Intake): string {
  return `Create a ${intake.weeks}-week training plan for:
- Objective: ${intake.objective}
- Fitness level: ${intake.level}
- Gender: ${intake.gender}
- Age: ${intake.age}
- Weight: ${intake.weightLbs} lbs
- Height: ${intake.heightIn} inches

Return ONE week's schedule as a JSON object with a top-level "days" array. The user repeats it each week. Do NOT nest days inside weeks.
Reference exercises ONLY by their number from the AVAILABLE EXERCISES list.`;
}

// Calls the Claude API (Anthropic Messages API). One retry on 429/5xx/529.
async function callModel(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const body = JSON.stringify({
    model,
    max_tokens: 4096,
    temperature: 0.4,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body,
        signal: controller.signal,
      });

      if (res.ok) {
        const message = await res.json();
        const text = (message.content || [])
          .filter((block: any) => block.type === "text")
          .map((block: any) => block.text)
          .join("");
        if (!text) throw new Error("Empty response from the model");
        if (message.stop_reason === "max_tokens") {
          throw new Error("Response was cut off (max_tokens reached)");
        }
        return text;
      }

      lastError = `${res.status} ${await res.text()}`;
      if (res.status !== 429 && res.status < 500) break; // 4xx other than 429: no point retrying
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Claude API request failed: ${lastError}`);
}

// Some models wrap JSON in ```json fences even when told not to.
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

// Resolves numeric refs back to real exercises; drops anything invalid
// instead of trusting the model's output directly.
function resolvePlan(raw: any, exercises: DbExercise[]) {
  const source = raw?.days ?? raw?.plan?.days ?? raw?.weeks?.[0]?.days ?? raw?.plan?.weeks?.[0]?.days;
  const days = Array.isArray(source) ? source : [];
  let total = 0;
  let matched = 0;

  const resolvedDays = days.map((day: any) => {
        const blocks = Array.isArray(day?.blocks) ? day.blocks : Array.isArray(day?.exercises) ? day.exercises : [];
    const seen = new Set<string>();
    const resolvedBlocks = blocks
      .map((block: any) => {
        total++;
        const ref = Number(block?.ref);
        const exercise =
          Number.isFinite(ref) && ref >= 1 && ref <= exercises.length
            ? exercises[ref - 1]
            : undefined;
        if (!exercise || seen.has(exercise.id)) return null;
        seen.add(exercise.id);
        matched++;
        const reps = Array.isArray(block?.reps) ? block.reps : [];
        return {
          exercise_id: exercise.id,
          name: exercise.name,
          sets: Number(block?.sets) || 3,
          reps_min: Number(reps[0]) || 8,
          reps_max: Number(reps[1]) || 12,
          rest_sec: Number(block?.rest_sec) || 60,
          cues: Array.isArray(block?.cues) ? block.cues.map(String).slice(0, 3) : [],
        };
      })
      .filter(Boolean);

    return {
      day_label: String(day?.day || "A"),
      focus: String(day?.focus || ""),
      blocks: resolvedBlocks,
    };
  });

  return { days: resolvedDays, matched, total };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }
  const userId = userData.user.id;

  let intake: Intake;
  try {
    intake = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!intake?.objective || !intake?.level || !Number.isFinite(intake.age)) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (intake.age < 18) {
    return NextResponse.json(
      { error: "BodyOS plans are for adults 18 and older." },
      { status: 400 }
    );
  }

  // 1) Pull exercises matching this user's equipment + level ceiling.
  const equipmentTerms = Array.from(new Set(["bodyweight", ...(intake.equipment || [])]));
  const maxDiff = maxDifficultyFor(intake.level);

  const { data: exercises, error: exError } = await supabase
    .from("exercises")
    .select("id,name,category,primary_muscles,difficulty")
    .in("equipment", equipmentTerms)
    .lte("difficulty", maxDiff);

  if (exError || !exercises || exercises.length === 0) {
    return NextResponse.json(
      { error: "No exercises matched your equipment and level. Try adding more equipment options." },
      { status: 422 }
    );
  }

  // 2) Call the model.
  const systemPrompt = buildSystemPrompt(intake, exercises);
  const userPrompt = buildUserPrompt(intake);

  let responseText: string;
  try {
    responseText = await callModel(systemPrompt, userPrompt);
  } catch (err) {
    console.error("Model call failed:", err);
    return NextResponse.json(
      { error: "The AI service is unavailable right now. Please try again in a moment." },
      { status: 502 }
    );
  }

  let parsed: unknown;
  try {
    parsed = extractJson(responseText);
  } catch {
    console.error("Model returned non-JSON:", responseText.slice(0, 500));
    return NextResponse.json({ error: "The AI returned an unusable response. Please try again." }, { status: 502 });
  }

  // 3) Resolve refs -> real exercises.
  const { days, matched, total } = resolvePlan(parsed, exercises);
  if (matched === 0 || days.length === 0) {
    console.error("Plan empty after resolving refs", { total, matched });
        console.error("Raw model output:", responseText.slice(0, 1500));
    return NextResponse.json({ error: "The AI did not produce a usable plan. Please try again." }, { status: 502 });
  }

  // 4) Save the plan.
  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .insert({ user_id: userId, objective: intake.objective, level: intake.level, weeks: intake.weeks })
    .select()
    .single();

  if (planError || !plan) {
    console.error("Failed to save plan:", planError);
    return NextResponse.json({ error: "Generated the plan but couldn't save it." }, { status: 500 });
  }

  const savedDays = [];
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const { data: savedDay, error: dayError } = await supabase
      .from("plan_days")
      .insert({ plan_id: plan.id, day_label: day.day_label, focus: day.focus, day_order: i })
      .select()
      .single();
    if (dayError || !savedDay) {
      console.error("Failed to save plan day:", dayError);
      continue;
    }

    const blockRows = day.blocks.map((b: any, j: number) => ({
      day_id: savedDay.id,
      exercise_id: b.exercise_id,
      sets: b.sets,
      reps_min: b.reps_min,
      reps_max: b.reps_max,
      rest_sec: b.rest_sec,
      cues: b.cues,
      exercise_order: j,
    }));
    const { error: blocksError } = await supabase.from("plan_exercises").insert(blockRows);
    if (blocksError) console.error("Failed to save plan exercises:", blocksError);

    savedDays.push({ ...day, id: savedDay.id });
  }

  return NextResponse.json({ plan: { ...plan, days: savedDays }, meta: { matched, total } });
}