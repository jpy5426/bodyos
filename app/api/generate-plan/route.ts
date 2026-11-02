import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, extractJson } from "@/lib/claude";
import { validateIntake, cleanCues, cleanFocus, type Goal, type Level, type Where, type Intake } from "@/lib/validation";
import { allowRequest, tooMany, LIMITS } from "@/lib/rate-limit";
import { readJson, BodyError } from "@/lib/http";

// The intake form sends well under 1 KB; anything near this size is not from the form.
const MAX_BODY_BYTES = 16 * 1024;

type DbExercise = {
  id: string;
  name: string;
  category: string;
  primary_muscles: string;
  difficulty: number;
  focus: string;
  body_region: string;
  position: string;
  dose: string;
};

const GOAL_LABEL: Record<Goal, string> = {
  desk_relief: "Desk relief: undo the effects of long sitting",
  injury_prevention: "Injury prevention (prehab)",
  mobility: "Improve mobility and range of motion",
};

// Deterministic guardrails -- not AI-generated.
// Which exercise difficulties each level can see.
function maxDifficultyFor(level: Level): number {
  return level === "ground_zero" ? 1 : 2;
}

// Which positions are allowed for the user's "where" answer.
function positionsFor(where: Where): string[] {
  if (where === "seated") return ["seated", "any"];
  if (where === "standing") return ["seated", "standing", "any"];
  return ["seated", "standing", "floor", "lying", "any"];
}

// About 2.5 minutes per exercise, between 4 and 10 per routine.
function blocksFor(minutes: number): number {
  return Math.min(10, Math.max(4, Math.round(minutes / 2.5)));
}

// How to use the written dose at each level.
const LEVEL_GUIDE: Record<Level, string> = {
  ground_zero:
    "Do each exercise once, at the easy end of the dose. Fewer reps or shorter holds are fine. Move slowly and stay pain-free.",
  beginner: "Follow each dose as written. Rest as long as you need between exercises.",
  intermediate:
    "Follow each dose as written. If you have extra time, go through the routine a second time.",
};

const DAY_LABELS = ["A", "B", "C"];

function buildSystemPrompt(intake: Intake, exercises: DbExercise[], perDay: number): string {
  const list = exercises
    .map(
      (e, i) =>
        `${i + 1}. ${e.name} (${e.focus}; ${e.body_region}; ${e.position}; targets ${e.primary_muscles})`,
    )
    .join("\n");

  return `You are a movement coach who builds short, low-impact routines for people who sit most of the day, want to prevent injuries, or want to move better. You are NOT a physical therapist: you never diagnose, treat or rehabilitate injuries.

You MUST respond ONLY with valid JSON. No prose, no markdown fences -- just the JSON object.

AVAILABLE EXERCISES (you MUST ONLY use exercises from this list, referenced by their number):
${list}

RESPONSE FORMAT (follow EXACTLY):
{
  "days": [
    {
      "day": "A",
      "focus": "<short theme, e.g. Neck & Upper Back Reset>",
      "blocks": [
        { "ref": <exercise number from the list above>, "cues": ["<cue1>", "<cue2>"] }
      ]
    }
  ]
}

CRITICAL RULES:
1. Every "ref" MUST be a number that exists in the AVAILABLE EXERCISES list. Never invent exercises or names.
2. Produce exactly 3 routines labelled "A", "B", "C", each with exactly ${perDay} blocks and a distinct theme.
3. Do not include sets, reps, holds or times. The app adds the dose for each exercise.
4. Order each routine from gentlest to most active: start with easy range-of-motion work.
5. Give 2 short, plain-language form cues per block, including one about staying pain-free or breathing when it fits.
6. Do not repeat an exercise within a routine.
7. Never use the words treat, cure, rehab, therapy or diagnose.`;
}

function buildUserPrompt(intake: Intake): string {
  const areas = intake.focusAreas.length ? intake.focusAreas.join(", ") : "whole body (no specific area)";
  return `Build 3 rotating routines (${intake.minutes} minutes each) for a ${intake.weeks}-week program:
- Goal: ${GOAL_LABEL[intake.objective]}
- Level: ${intake.level}
- Age: ${intake.age}
- Body areas to focus on: ${areas}
- Positions they can do: ${positionsFor(intake.where).join(", ")}

At least half of each routine should target the focus areas. ${
    intake.objective === "desk_relief"
      ? "Favor exercises that can be done at or next to a desk."
      : intake.objective === "injury_prevention"
        ? "Favor prehab exercises that strengthen the muscles that protect the focus areas."
        : "Favor mobility exercises that take joints through their full comfortable range."
  }${intake.level === "ground_zero" ? " Keep the tone especially encouraging: this may be their first routine in a long time." : ""}

Return a JSON object with a top-level "days" array. Reference exercises ONLY by their number from the AVAILABLE EXERCISES list.`;
}

// Resolves numeric refs back to real exercises; drops anything invalid
// instead of trusting the model's output directly. The dose always comes
// from the database, never from the model.
function resolvePlan(raw: any, exercises: DbExercise[], perDay: number) {
  const source = raw?.days ?? raw?.plan?.days;
  const days = Array.isArray(source) ? source.slice(0, 3) : [];
  let total = 0;
  let matched = 0;

  const resolvedDays = days.map((day: any, i: number) => {
    const blocks = Array.isArray(day?.blocks) ? day.blocks : Array.isArray(day?.exercises) ? day.exercises : [];
    const seen = new Set<string>();
    const resolvedBlocks = blocks
      .map((block: any) => {
        total++;
        const ref = Number(block?.ref);
        const exercise =
          Number.isFinite(ref) && ref >= 1 && ref <= exercises.length ? exercises[ref - 1] : undefined;
        if (!exercise || seen.has(exercise.id)) return null;
        seen.add(exercise.id);
        matched++;
        return {
          exercise_id: exercise.id,
          name: exercise.name,
          body_region: exercise.body_region,
          position: exercise.position,
          dose: exercise.dose,
          cues: cleanCues(block?.cues),
        };
      })
      .filter(Boolean)
      .slice(0, perDay);

    return {
      day_label: DAY_LABELS[i] ?? String(day?.day || "A"),
      focus: cleanFocus(day?.focus),
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

  // Size cap first, then strict validation against fixed lists.
  let raw: unknown;
  try {
    raw = await readJson(req, MAX_BODY_BYTES);
  } catch (err) {
    const status = err instanceof BodyError ? err.status : 400;
    return NextResponse.json({ error: err instanceof BodyError ? err.message : "Invalid request body." }, { status });
  }
  const checked = validateIntake(raw);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: checked.status });
  const intake: Intake = checked.intake;
  const { minutes, weeks, focusAreas } = intake;

  // Safety guardrail: BodyOS is for prevention, not for active injuries.
  if (intake.hasPain) {
    return NextResponse.json(
      {
        error:
          "Because you have current pain or an injury, please follow a plan from a physical therapist or doctor. BodyOS routines are for prevention only.",
      },
      { status: 400 },
    );
  }

  // Cost protection: each routine is a paid AI call.
  if (!(await allowRequest(supabase, userId, LIMITS.generatePlan))) {
    return NextResponse.json(tooMany(LIMITS.generatePlan), { status: 429, headers: { "retry-after": "60" } });
  }

  // 1) Pull only sedentary / prehab / mobility exercises the user can do.
  const equipmentTerms = Array.from(
    new Set(["bodyweight", "chair", "wall", ...intake.equipment]),
  );

  const { data: exercises, error: exError } = await supabase
    .from("exercises")
    .select("id,name,category,primary_muscles,difficulty,focus,body_region,position,dose")
    .in("focus", ["sedentary", "prehab", "mobility"])
    .in("equipment", equipmentTerms)
    .in("position", positionsFor(intake.where))
    .lte("difficulty", maxDifficultyFor(intake.level))
    .order("name");

  if (exError || !exercises || exercises.length < 4) {
    if (exError) console.error("Exercise query failed:", exError);
    return NextResponse.json(
      { error: "Not enough exercises match your answers. Try allowing more positions or equipment." },
      { status: 422 },
    );
  }

  const perDay = Math.min(blocksFor(minutes), exercises.length);

  // 2) Call the model.
  let responseText: string;
  try {
    responseText = await callClaude(buildSystemPrompt(intake, exercises, perDay), buildUserPrompt(intake), {
      maxTokens: 4096,
      temperature: 0.4,
    });
  } catch (err) {
    console.error("Model call failed:", err);
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

  // 3) Resolve refs -> real exercises.
  const { days, matched, total } = resolvePlan(parsed, exercises, perDay);
  if (matched === 0 || days.length === 0) {
    console.error("Plan empty after resolving refs", { total, matched });
    console.error("Raw model output:", responseText.slice(0, 1500));
    return NextResponse.json({ error: "The AI did not produce a usable routine. Please try again." }, { status: 502 });
  }

  // 4) Save the plan.
  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .insert({ user_id: userId, objective: intake.objective, level: intake.level, weeks })
    .select()
    .single();

  if (planError || !plan) {
    console.error("Failed to save plan:", planError);
    return NextResponse.json({ error: "Generated the routine but couldn't save it." }, { status: 500 });
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

    // sets/reps/rest are kept for schema compatibility; the dose column holds
    // the real prescription from the exercise library.
    const blockRows = day.blocks.map((b: any, j: number) => ({
      day_id: savedDay.id,
      exercise_id: b.exercise_id,
      sets: 1,
      reps_min: 0,
      reps_max: 0,
      rest_sec: 0,
      dose: b.dose,
      cues: b.cues,
      exercise_order: j,
    }));
    const { error: blocksError } = await supabase.from("plan_exercises").insert(blockRows);
    if (blocksError) console.error("Failed to save plan exercises:", blocksError);

    savedDays.push({ ...day, id: savedDay.id });
  }

  return NextResponse.json({
    plan: { ...plan, minutes, focusAreas, guide: LEVEL_GUIDE[intake.level], days: savedDays },
    meta: { matched, total },
  });
}