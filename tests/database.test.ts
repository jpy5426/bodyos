// DATABASE SECURITY: runs the real supabase/*.sql files in an embedded Postgres
// (PGlite) and attacks the Row-Level Security policies directly, the same way a
// user with the public Supabase key could from their browser console.
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(__dirname, "../supabase");
const FILES = [
  "01_workout_and_catalog.sql",
  "02_mobility_library.sql",
  "03_macro_profiles.sql",
  "04_routine_dose.sql",
  "05_fill_original_exercises.sql",
  "05_meal_logs.sql",
  "06_macro_goal.sql",
  ...(process.env.SKIP_HARDENING ? [] : ["07_hardening.sql"]),
];
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

let db: PGlite;

// Minimal stand-in for Supabase's auth schema and roles.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;
// Supabase grants table access to these roles by default; RLS is what protects rows.
const SUPABASE_GRANTS = `
  grant usage on schema public to anon, authenticated;
  grant all on all tables in schema public to anon, authenticated;
  grant all on all sequences in schema public to anon, authenticated;
`;

// Run SQL as a given user (or anon), like a request with that user's login token.
async function as<T = Record<string, unknown>>(who: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${who ?? ""}', false);`);
  await db.exec(`set role ${who ? "authenticated" : "anon"};`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}

async function fails(who: string | null, sql: string) {
  try {
    await as(who, sql);
    return false;
  } catch {
    return true;
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const f of FILES) await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  await db.exec(SUPABASE_GRANTS);
  await db.exec(`insert into auth.users values ('${A}'), ('${B}');`);
  // User A's private data
  await as(A, `insert into public.macro_profiles (user_id, sex, age, weight_lbs, height_in, activity, preset)
               values ('${A}', 'male', 35, 180, 70, 'moderate', 'balanced')`);
  await as(A, `insert into public.meal_logs (user_id, total_kcal, protein_g) values ('${A}', 650, 40)`);
}, 60000);

describe("B1 All setup scripts run cleanly on a fresh database", () => {
  it("exercise library loaded", async () => {
    const rows = await db.query<{ n: number }>("select count(*)::int as n from public.exercises where focus <> 'strength'");
    expect(rows.rows[0].n).toBeGreaterThanOrEqual(50);
  });
});

describe("B2-B6 User B attacks User A's private data", () => {
  it("B2 B cannot read A's meals", async () => {
    expect(await as(B, "select * from public.meal_logs")).toHaveLength(0);
  });
  it("B3 B cannot read A's body measurements", async () => {
    expect(await as(B, "select * from public.macro_profiles")).toHaveLength(0);
  });
  it("B4 B cannot delete or edit A's data", async () => {
    await as(B, "delete from public.meal_logs");
    await as(B, "update public.macro_profiles set weight_lbs = 999");
    expect(await as(A, "select * from public.meal_logs")).toHaveLength(1);
    expect(Number((await as<{ weight_lbs: string }>(A, "select weight_lbs from public.macro_profiles"))[0].weight_lbs)).toBe(180);
  });
  it("B5 B cannot plant a meal in A's account", async () => {
    expect(await fails(B, `insert into public.meal_logs (user_id, total_kcal) values ('${A}', 5000)`)).toBe(true);
  });
  it("B6 B cannot attach food items to A's meal", async () => {
    const [meal] = await as<{ id: string }>(A, "select id from public.meal_logs");
    expect(await fails(B, `insert into public.meal_items (meal_id, user_id, name, grams) values ('${meal.id}', '${B}', 'x', 10)`)).toBe(true);
  });
});

describe("B7-B8 Logged-out visitors and shared tables", () => {
  it("B7 an anonymous visitor sees no one's meals or profiles", async () => {
    expect(await as(null, "select * from public.meal_logs")).toHaveLength(0);
    expect(await as(null, "select * from public.macro_profiles")).toHaveLength(0);
  });
  it("B8 a user cannot edit the shared exercise library", async () => {
    await as(A, "update public.exercises set dose = 'hacked'").catch(() => null);
    const changed = await db.query("select 1 from public.exercises where dose = 'hacked'");
    expect(changed.rows).toHaveLength(0);
    expect(await fails(A, "insert into public.exercises (name, category) values ('Evil', 'core')")).toBe(true);
  });
});

describe("B9-B11 Database refuses impossible numbers (even bypassing the app)", () => {
  it("B9 a 999,999 kcal meal is refused", async () => {
    expect(await fails(A, `insert into public.meal_logs (user_id, total_kcal) values ('${A}', 999999)`)).toBe(true);
  });
  it("B10 a 5 lb / 500-year-old profile is refused", async () => {
    expect(await fails(A, "update public.macro_profiles set weight_lbs = 5")).toBe(true);
    expect(await fails(A, "update public.macro_profiles set age = 500")).toBe(true);
  });
  it("B11 a normal meal is still accepted (regression check)", async () => {
    expect(await fails(A, `insert into public.meal_logs (user_id, total_kcal, protein_g) values ('${A}', 800, 45)`)).toBe(false);
  });
});

describe("B12-B14 Shared rate limiter (supabase/07_hardening.sql)", () => {
  it("B12 allows 5 routine requests in 10 minutes, then blocks", async () => {
    const out: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const [r] = await as<{ ok: boolean }>(B, "select public.hit_rate_limit('generate-plan', 5, 600) as ok");
      out.push(r.ok);
    }
    expect(out).toEqual([true, true, true, true, true, false, false]);
  });
  it("B13 limits are per user (A is not affected by B's usage)", async () => {
    const [r] = await as<{ ok: boolean }>(A, "select public.hit_rate_limit('generate-plan', 5, 600) as ok");
    expect(r.ok).toBe(true);
  });
  it("B14 users can't read or wipe their usage counter to reset the limit", async () => {
    expect(await as(B, "select * from public.api_usage")).toHaveLength(0);
    await as(B, "delete from public.api_usage").catch(() => null);
    const left = await db.query<{ n: number }>(`select count(*)::int as n from public.api_usage where user_id = '${B}'`);
    expect(left.rows[0].n).toBe(5);
    expect(await fails(null, "select public.hit_rate_limit('generate-plan', 5, 600)")).toBe(true);
  });
});
