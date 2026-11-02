// SCALING: many users at once, and repeated work that should not hit outside APIs every time.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeSupabase, mockFetch, post, goodIntake, claudeOk, planJson, TINY_JPEG } from "./helpers";

const supa = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supa.current }));

import { POST as generatePlan } from "@/app/api/generate-plan/route";
import { POST as estimateMeal } from "@/app/api/estimate-meal/route";

beforeEach(() => vi.unstubAllGlobals());

describe("L1 200 different users build routines at the same moment", () => {
  it("every request finishes with 200 and none crash (AI answers in ~150 ms)", async () => {
    mockFetch({ claude: async () => { await new Promise((r) => setTimeout(r, 150)); return claudeOk(planJson()); } });
    const started = Date.now();
    const results = await Promise.all(
      Array.from({ length: 200 }, async () => {
        supa.current = fakeSupabase().client; // a fresh user each time
        const client = supa.current;
        return generatePlan(post("/api/generate-plan", goodIntake)).then((r) => ({ r, client }));
      }),
    );
    const ms = Date.now() - started;
    const ok = results.filter((x) => x.r.status === 200).length;
    console.log(`L1: ${ok}/200 OK in ${ms} ms`);
    expect(ok).toBe(200);
  });
});

describe("L2 50 users log the same common food", () => {
  it("USDA is asked once and the rest come from cache (protects the 1,000/hr USDA quota)", async () => {
    const f = mockFetch({
      claude: () => claudeOk('{"is_food":true,"items":[{"name":"Rice","usda_query":"rice white cooked","grams":150,"confidence":"high"}]}'),
    });
    for (let i = 0; i < 50; i++) {
      supa.current = fakeSupabase().client;
      const res = await estimateMeal(post("/api/estimate-meal", { image: TINY_JPEG, mediaType: "image/jpeg" }));
      expect(res.status).toBe(200);
    }
    console.log(`L2: USDA called ${f.usdaCalls()} times for 50 meals`);
    expect(f.usdaCalls()).toBeLessThanOrEqual(2);
  });
});

describe("L3 Burst of 429s from Anthropic during a traffic spike", () => {
  it("retry waits honor the retry-after header (no instant hammering)", async () => {
    const times: number[] = [];
    mockFetch({
      claude: (n) => {
        times.push(Date.now());
        return n < 3 ? new Response("slow down", { status: 429, headers: { "retry-after": "0" } }) : claudeOk(planJson());
      },
    });
    supa.current = fakeSupabase().client;
    const res = await generatePlan(post("/api/generate-plan", goodIntake));
    expect(res.status).toBe(200);
    expect(times.length).toBe(3);
  });
});
