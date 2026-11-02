// Server-side input validation for the routine builder.
// The browser form already limits what a user can pick, but anyone can send a
// request by hand, so the server re-checks everything against fixed lists.
// Nothing the user types as free text is ever placed into the AI prompt.

export type Goal = "desk_relief" | "injury_prevention" | "mobility";
export type Level = "ground_zero" | "beginner" | "intermediate";
export type Where = "seated" | "standing" | "floor";

export type Intake = {
  objective: Goal;
  level: Level;
  age: number;
  focusAreas: string[];
  where: Where;
  minutes: number;
  weeks: number;
  equipment: string[];
  hasPain: boolean;
};

export const GOALS: readonly Goal[] = ["desk_relief", "injury_prevention", "mobility"];
export const LEVELS: readonly Level[] = ["ground_zero", "beginner", "intermediate"];
export const WHERES: readonly Where[] = ["seated", "standing", "floor"];
// Must match FOCUS_AREAS and EQUIPMENT_OPTIONS in app/protected/workout/page.tsx.
export const FOCUS_AREAS = ["neck", "shoulders", "upper back", "lower back", "hips", "knees", "ankles", "wrists"] as const;
export const EQUIPMENT = ["resistance_band", "step", "strap", "towel"] as const;

export const AGE_MIN = 18;
export const AGE_MAX = 100;

type Ok = { ok: true; intake: Intake };
type Bad = { ok: false; status: number; error: string };

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);

// Keeps only allowed values, drops duplicates and anything else.
function pick(list: readonly string[], v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(new Set(v.filter((x): x is string => typeof x === "string" && list.includes(x))));
}

export function validateIntake(raw: unknown): Ok | Bad {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, status: 400, error: "Invalid request body." };
  }
  const r = raw as Record<string, unknown>;

  if (!isOneOf(GOALS, r.objective) || !isOneOf(LEVELS, r.level) || !isOneOf(WHERES, r.where)) {
    return { ok: false, status: 400, error: "Missing or invalid goal, level or position." };
  }
  const age = Number(r.age);
  if (!Number.isFinite(age)) return { ok: false, status: 400, error: "Please enter a valid age." };
  if (age < AGE_MIN) return { ok: false, status: 400, error: "BodyOS routines are for adults 18 and older." };
  if (age > AGE_MAX) return { ok: false, status: 400, error: `Please enter an age between ${AGE_MIN} and ${AGE_MAX}.` };

  // Oversized arrays are a sign of a hand-made request, not the form.
  if ((Array.isArray(r.focusAreas) && r.focusAreas.length > 20) || (Array.isArray(r.equipment) && r.equipment.length > 20)) {
    return { ok: false, status: 400, error: "Too many options selected." };
  }

  return {
    ok: true,
    intake: {
      objective: r.objective,
      level: r.level,
      where: r.where,
      age: Math.round(age),
      minutes: Math.min(30, Math.max(5, Number(r.minutes) || 15)),
      weeks: Math.min(12, Math.max(4, Math.round(Number(r.weeks)) || 4)),
      focusAreas: pick(FOCUS_AREAS, r.focusAreas),
      equipment: pick(EQUIPMENT, r.equipment),
      hasPain: r.hasPain === true || r.hasPain === "true",
    },
  };
}

// ---- AI output safety --------------------------------------------------------
// The prompt tells the model not to make medical claims; this enforces it in code.
const BANNED = /\b(treat|treats|treating|treatment|cure|cures|curing|heal|heals|rehab|rehabilitate|therapy|therapeutic|diagnose|diagnosis|prescribe)\b/i;
export const MAX_CUE_CHARS = 160;

export function cleanCues(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((c): c is string | number => typeof c === "string" || typeof c === "number")
    .map((c) => String(c).replace(/\s+/g, " ").trim())
    .filter((c) => c.length > 0 && !BANNED.test(c))
    .map((c) => (c.length > MAX_CUE_CHARS ? c.slice(0, MAX_CUE_CHARS - 1).trimEnd() + "…" : c))
    .slice(0, 3);
}

export function cleanFocus(v: unknown): string {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  if (BANNED.test(s)) return "";
  return s.slice(0, 60);
}
