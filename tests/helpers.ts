// Test doubles for BodyOS. No real Supabase, Anthropic or USDA calls are made:
// every external service is replaced with a fake that the test controls, so we
// can simulate attackers, outages and traffic spikes on demand.
import { vi } from "vitest";
import { NextRequest } from "next/server";

// ---- Fake Supabase ----------------------------------------------------------

export type Call = { table: string; op: string; method: string; args: unknown[] };
type Result = { data?: unknown; error?: unknown };
type Handler = (table: string, op: string, calls: Call[]) => Result;

export function exercisesFixture(n = 12) {
  return Array.from({ length: n }, (_, i) => ({
    id: `ex-${i + 1}`,
    name: `Exercise ${i + 1}`,
    category: "mobility",
    primary_muscles: "hips",
    difficulty: 1,
    focus: "mobility",
    body_region: "hips",
    position: "seated",
    dose: "10 reps",
  }));
}

export const defaultHandler: Handler = (table, op) => {
  if (table === "exercises") return { data: exercisesFixture(), error: null };
  if (table === "workout_plans" && op === "insert")
    return { data: { id: "plan-1", objective: "mobility", level: "beginner", weeks: 4 }, error: null };
  if (table === "plan_days" && op === "insert") return { data: { id: `day-${Math.random()}` }, error: null };
  return { data: null, error: null };
};

let userCounter = 0;

export function fakeSupabase(opts: {
  userId?: string | null;
  handler?: Handler;
  rpc?: (fn: string, args: unknown) => Result;
  verifyOtpError?: unknown;
} = {}) {
  const calls: Call[] = [];
  const handler = opts.handler ?? defaultHandler;
  // A fresh user per fake client, so per-user rate limits don't leak between tests.
  const userId = opts.userId === undefined ? `user-${++userCounter}` : opts.userId;

  function builder(table: string) {
    let op = "select";
    const mine: Call[] = [];
    const b: Record<string, unknown> = {};
    const chain = (method: string) =>
      (...args: unknown[]) => {
        if (method === "insert" || method === "upsert" || method === "delete" || method === "update") op = method;
        const c = { table, op, method, args };
        calls.push(c);
        mine.push(c);
        return b;
      };
    for (const m of ["select", "in", "lte", "gte", "eq", "order", "insert", "upsert", "delete", "update", "single", "maybeSingle", "limit"]) {
      b[m] = chain(m);
    }
    b.then = (resolve: (r: Result) => void, reject: (e: unknown) => void) => {
      try {
        resolve(handler(table, op, mine));
      } catch (e) {
        reject(e);
      }
    };
    return b;
  }

  const client = {
    auth: {
      getUser: async () =>
        userId ? { data: { user: { id: userId } }, error: null } : { data: { user: null }, error: { message: "no session" } },
      verifyOtp: async () => ({ error: opts.verifyOtpError ?? null }),
    },
    from: (table: string) => builder(table),
    // Default: the rate-limit SQL function is not installed, so the app must fall back safely.
    rpc: async (fn: string, args: unknown) =>
      opts.rpc ? opts.rpc(fn, args) : { data: null, error: { message: `function ${fn} does not exist` } },
  };
  return { client, calls };
}

// ---- Fake Anthropic + USDA (global fetch) ----------------------------------

export type FetchLog = { url: string; body: string };

export function planJson(perDay = 6) {
  const day = (d: string) => ({
    day: d,
    focus: `Theme ${d}`,
    blocks: Array.from({ length: perDay }, (_, i) => ({ ref: i + 1, cues: ["Move slowly", "Breathe out"] })),
  });
  return JSON.stringify({ days: [day("A"), day("B"), day("C")] });
}

export function claudeOk(text: string) {
  return new Response(
    JSON.stringify({ content: [{ type: "text", text }], stop_reason: "end_turn" }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

export function usdaOk(description = "Rice, white, cooked") {
  return new Response(
    JSON.stringify({
      foods: [
        {
          fdcId: 1,
          description,
          dataType: "SR Legacy",
          foodNutrients: [
            { nutrientId: 1008, unitName: "KCAL", value: 130 },
            { nutrientId: 1003, value: 2.7 },
            { nutrientId: 1004, value: 0.3 },
            { nutrientId: 1005, value: 28 },
          ],
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

export function mockFetch(opts: {
  claude?: (n: number, body: string) => Response | Promise<Response>;
  usda?: (n: number, body: string) => Response | Promise<Response>;
} = {}) {
  const log: FetchLog[] = [];
  let claudeN = 0;
  let usdaN = 0;
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? init.body : "";
    log.push({ url, body });
    if (url.includes("api.anthropic.com")) {
      claudeN++;
      return opts.claude ? opts.claude(claudeN, body) : claudeOk(planJson());
    }
    if (url.includes("api.nal.usda.gov")) {
      usdaN++;
      return opts.usda ? opts.usda(usdaN, body) : usdaOk();
    }
    throw new Error(`Unexpected fetch to ${url}`);
  });
  vi.stubGlobal("fetch", fn);
  return {
    log,
    claudeCalls: () => log.filter((l) => l.url.includes("anthropic")).length,
    usdaCalls: () => log.filter((l) => l.url.includes("nal.usda.gov")).length,
  };
}

// ---- Requests ---------------------------------------------------------------

export const goodIntake = {
  objective: "mobility",
  level: "beginner",
  age: 35,
  where: "seated",
  minutes: 15,
  weeks: 4,
  focusAreas: ["hips"],
  equipment: [],
  hasPain: false,
};

export function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    body: text,
    headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(text)), ...headers },
  });
}

export function get(path: string) {
  return new NextRequest(`http://localhost:3000${path}`);
}

// A tiny real JPEG (1x1 px) as base64.
export const TINY_JPEG =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

// Next.js redirect() throws an error whose digest holds the target URL.
export function redirectTarget(err: unknown): string | null {
  const digest = (err as { digest?: string })?.digest;
  if (!digest?.startsWith("NEXT_REDIRECT")) return null;
  return digest.split(";")[2] ?? null;
}
