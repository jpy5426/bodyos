// BAD INPUT: impossible, malformed and hostile values typed into forms or sent by hand.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeSupabase, mockFetch, post, goodIntake, claudeOk, planJson, TINY_JPEG } from "./helpers";
import { computeMacros } from "@/lib/macros";

const supa = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supa.current }));

import { POST as generatePlan } from "@/app/api/generate-plan/route";
import { POST as estimateMeal } from "@/app/api/estimate-meal/route";

beforeEach(() => {
  vi.unstubAllGlobals();
  supa.current = fakeSupabase().client;
});

async function send(body: unknown) {
  return generatePlan(post("/api/generate-plan", body));
}

describe("R1-R8 Routine builder: malformed requests", () => {
  it("R1 an unknown goal ('hack') is rejected before the paid AI call", async () => {
    const f = mockFetch();
    const res = await send({ ...goodIntake, objective: "hack" });
    expect(res.status).toBe(400);
    expect(f.claudeCalls()).toBe(0);
  });
  it("R2 age 999 is rejected", async () => {
    const f = mockFetch();
    expect((await send({ ...goodIntake, age: 999 })).status).toBe(400);
    expect(f.claudeCalls()).toBe(0);
  });
  it("R3 age 'abc' is rejected", async () => {
    mockFetch();
    expect((await send({ ...goodIntake, age: "abc" })).status).toBe(400);
  });
  it("R4 junk equipment names never reach the database query", async () => {
    const { client, calls } = fakeSupabase();
    supa.current = client;
    mockFetch();
    await send({ ...goodIntake, equipment: ["resistance_band", "'; drop table exercises;--", "x".repeat(500)] });
    const eq = calls.find((c) => c.method === "in" && c.args[0] === "equipment");
    expect(eq).toBeDefined();
    const values = eq!.args[1] as string[];
    expect(values.every((v) => ["bodyweight", "chair", "wall", "resistance_band", "step", "strap", "towel"].includes(v))).toBe(true);
  });
  it("R5 minutes = 1,000,000,000 is clamped, not passed through", async () => {
    mockFetch();
    const res = await send({ ...goodIntake, minutes: 1e9 });
    expect(res.status).toBe(200);
    expect((await res.json()).plan.minutes).toBeLessThanOrEqual(30);
  });
  it("R6 a body that is not JSON returns 400", async () => {
    mockFetch();
    expect((await send("this is {not json")).status).toBe(400);
  });
  it("R7 a JSON null body returns 400", async () => {
    mockFetch();
    expect((await send("null")).status).toBe(400);
  });
  it("R8 a JSON array body returns 400", async () => {
    mockFetch();
    expect((await send("[1,2,3]")).status).toBe(400);
  });
  it("R9 the pain/injury safety stop still blocks routines", async () => {
    const f = mockFetch();
    expect((await send({ ...goodIntake, hasPain: true })).status).toBe(400);
    expect(f.claudeCalls()).toBe(0);
  });
});

describe("R10-R12 Macro calculator: impossible body measurements", () => {
  it("R10 1 lb / 12 in / age 90 must not produce negative calories", () => {
    let result: ReturnType<typeof computeMacros> | null = null;
    try {
      result = computeMacros(1, 12, 90, "male", "sedentary", "balanced");
    } catch {
      return; // rejecting the input is the correct behavior
    }
    for (const g of ["maintenance", "cutting", "bulking"] as const) {
      expect(result!.result[g].calories).toBeGreaterThan(0);
      expect(result!.result[g].protein).toBeGreaterThanOrEqual(0);
    }
  });
  it("R11 100,000 lb is rejected as out of range", () => {
    expect(() => computeMacros(100000, 70, 35, "male", "sedentary", "balanced")).toThrow();
  });
  it("R12 a normal adult still gets sensible targets (regression check)", () => {
    const { result } = computeMacros(180, 70, 35, "male", "moderate", "balanced");
    expect(result.maintenance.calories).toBeGreaterThan(2000);
    expect(result.maintenance.calories).toBeLessThan(3500);
  });
});

describe("R13-R17 AI returns garbage", () => {
  it("R13 plain prose instead of JSON -> friendly 502, no crash", async () => {
    mockFetch({ claude: () => claudeOk("Sure! Here is a great routine for you...") });
    const res = await send(goodIntake);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/try again/i);
  });
  it("R14 JSON wrapped in chatter is still parsed", async () => {
    mockFetch({ claude: () => claudeOk(`Here you go: ${planJson()} Hope this helps!`) });
    expect((await send(goodIntake)).status).toBe(200);
  });
  it("R15 invented exercise numbers (999, -1, 'abc') are dropped", async () => {
    const bad = JSON.stringify({
      days: ["A", "B", "C"].map((d) => ({ day: d, focus: "x", blocks: [{ ref: 999 }, { ref: -1 }, { ref: "abc" }, { ref: 1 }, { ref: 1 }] })),
    });
    mockFetch({ claude: () => claudeOk(bad) });
    const res = await send(goodIntake);
    const body = await res.json();
    expect(res.status).toBe(200);
    for (const day of body.plan.days) expect(day.blocks.map((b: any) => b.exercise_id)).toEqual(["ex-1"]);
  });
  it("R16 every exercise invented -> 502, nothing saved", async () => {
    const { client, calls } = fakeSupabase();
    supa.current = client;
    mockFetch({ claude: () => claudeOk(JSON.stringify({ days: [{ day: "A", blocks: [{ ref: 500 }] }] })) });
    expect((await send(goodIntake)).status).toBe(502);
    expect(calls.some((c) => c.op === "insert")).toBe(false);
  });
  it("R17 meal photo: model says -50 g and 99,999 g -> clamped to 1..1500 g", async () => {
    mockFetch({
      claude: () =>
        claudeOk(JSON.stringify({ is_food: true, items: [
          { name: "Rice", usda_query: "rice", grams: -50, confidence: "high" },
          { name: "Rice 2", usda_query: "rice", grams: 99999, confidence: "high" },
        ] })),
    });
    const res = await estimateMeal(post("/api/estimate-meal", { image: TINY_JPEG, mediaType: "image/jpeg" }));
    const body = await res.json();
    expect(body.items.map((i: any) => i.grams)).toEqual([1, 1500]);
  });
  it("R18 meal photo: a picture with no food -> friendly 422", async () => {
    mockFetch({ claude: () => claudeOk('{"is_food": false, "items": []}') });
    const res = await estimateMeal(post("/api/estimate-meal", { image: TINY_JPEG, mediaType: "image/jpeg" }));
    expect(res.status).toBe(422);
  });
});
