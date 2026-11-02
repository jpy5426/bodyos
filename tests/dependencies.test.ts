// OUTSIDE-SERVICE FAILURE: the Claude API, USDA FoodData Central and Supabase go down or misbehave.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeSupabase, mockFetch, post, get, goodIntake, claudeOk, planJson, TINY_JPEG } from "./helpers";

const supa = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supa.current }));

import { POST as generatePlan } from "@/app/api/generate-plan/route";
import { POST as estimateMeal } from "@/app/api/estimate-meal/route";
import { GET as foodSearch } from "@/app/api/food-search/route";

const mealModel = () =>
  claudeOk('{"is_food":true,"items":[{"name":"Rice","usda_query":"rice white cooked","grams":150,"confidence":"high"}]}');

beforeEach(() => {
  vi.unstubAllGlobals();
  supa.current = fakeSupabase().client;
});

describe("D1-D4 Claude API failures", () => {
  it("D1 overloaded twice (429, 529), then OK -> the user still gets a routine", async () => {
    const f = mockFetch({
      claude: (n) =>
        n === 1 ? new Response("rate limited", { status: 429, headers: { "retry-after": "0" } })
        : n === 2 ? new Response("overloaded", { status: 529 })
        : claudeOk(planJson()),
    });
    const res = await generatePlan(post("/api/generate-plan", goodIntake));
    expect(res.status).toBe(200);
    expect(f.claudeCalls()).toBe(3);
  });
  it("D2 down for good (500 every time) -> friendly 502, bounded retries", async () => {
    const f = mockFetch({ claude: () => new Response("boom", { status: 500 }) });
    const res = await generatePlan(post("/api/generate-plan", goodIntake));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/unavailable/i);
    expect(f.claudeCalls()).toBeLessThanOrEqual(3);
  });
  it("D3 network dies mid-request -> friendly 502", async () => {
    mockFetch({ claude: () => { throw new TypeError("fetch failed: ECONNRESET"); } });
    expect((await generatePlan(post("/api/generate-plan", goodIntake))).status).toBe(502);
  });
  it("D4 wrong API key (401) -> no pointless retries", async () => {
    const f = mockFetch({ claude: () => new Response("invalid x-api-key", { status: 401 }) });
    expect((await generatePlan(post("/api/generate-plan", goodIntake))).status).toBe(502);
    expect(f.claudeCalls()).toBe(1);
  });
  it("D5 answer cut off at max_tokens -> friendly 502", async () => {
    mockFetch({
      claude: () => new Response(JSON.stringify({ content: [{ type: "text", text: '{"days":[' }], stop_reason: "max_tokens" }), { status: 200 }),
    });
    expect((await generatePlan(post("/api/generate-plan", goodIntake))).status).toBe(502);
  });
});

describe("D6-D9 USDA FoodData Central failures", () => {
  it("D6 USDA returns 500 -> meal still comes back, items flagged unmatched", async () => {
    mockFetch({ claude: mealModel, usda: () => new Response("err", { status: 500 }) });
    const res = await estimateMeal(post("/api/estimate-meal", { image: TINY_JPEG, mediaType: "image/jpeg" }));
    expect(res.status).toBe(200);
    expect((await res.json()).items[0].matched).toBe(false);
  });
  it("D7 USDA unreachable (network error) -> same graceful result", async () => {
    mockFetch({ claude: mealModel, usda: () => { throw new TypeError("fetch failed"); } });
    const res = await estimateMeal(post("/api/estimate-meal", { image: TINY_JPEG, mediaType: "image/jpeg" }));
    expect(res.status).toBe(200);
  });
  it("D8 USDA_API_KEY missing on the server -> no crash (no unhandled 500)", async () => {
    const saved = process.env.USDA_API_KEY;
    delete process.env.USDA_API_KEY;
    try {
      mockFetch({ claude: mealModel });
      let status = 0;
      try {
        status = (await estimateMeal(post("/api/estimate-meal", { image: TINY_JPEG, mediaType: "image/jpeg" }))).status;
      } catch {
        status = -1; // the route threw: Next.js would show a raw 500
      }
      expect(status).toBe(200);
      let s2 = 0;
      try {
        s2 = (await foodSearch(get("/api/food-search?q=rice"))).status;
      } catch {
        s2 = -1;
      }
      expect(s2).toBeGreaterThan(0);
    } finally {
      process.env.USDA_API_KEY = saved;
    }
  });
});

describe("D9-D10 Supabase failures", () => {
  it("D9 exercise table unreachable -> friendly 4xx, AI never called", async () => {
    supa.current = fakeSupabase({
      handler: (t) => (t === "exercises" ? { data: null, error: { message: "connection refused" } } : { data: null, error: null }),
    }).client;
    const f = mockFetch();
    const res = await generatePlan(post("/api/generate-plan", goodIntake));
    expect(res.status).toBe(422);
    expect(f.claudeCalls()).toBe(0);
  });
  it("D10 saving the plan fails -> friendly 500 with a message, no crash", async () => {
    supa.current = fakeSupabase({
      handler: (t, op) =>
        t === "exercises" ? { data: Array.from({ length: 12 }, (_, i) => ({ id: `ex-${i + 1}`, name: `E${i}`, focus: "mobility", body_region: "hips", position: "seated", dose: "10" })), error: null }
        : t === "workout_plans" && op === "insert" ? { data: null, error: { message: "disk full" } }
        : { data: null, error: null },
    }).client;
    mockFetch();
    const res = await generatePlan(post("/api/generate-plan", goodIntake));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
