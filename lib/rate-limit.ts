// Per-user rate limiting for the routes that cost money (Claude API) or use a
// shared quota (USDA FoodData Central).
//
// Primary: a Postgres function in Supabase (supabase/07_hardening.sql). It works
// across every server instance, so it still holds when the app is scaled out.
// Fallback: an in-memory counter, used if that function hasn't been installed
// or the database can't be reached. The app never fails open to "unlimited".

export type Limit = { route: string; max: number; windowSec: number };

export const LIMITS = {
  generatePlan: { route: "generate-plan", max: 5, windowSec: 600 }, // 5 routines / 10 min
  estimateMeal: { route: "estimate-meal", max: 15, windowSec: 600 }, // 15 photos / 10 min
  foodSearch: { route: "food-search", max: 60, windowSec: 60 }, // 60 searches / min
} satisfies Record<string, Limit>;

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

const memory = new Map<string, number[]>();
let warned = false;

function memoryHit(key: string, { max, windowSec }: Limit): boolean {
  const now = Date.now();
  const since = now - windowSec * 1000;
  const hits = (memory.get(key) ?? []).filter((t) => t > since);
  if (hits.length >= max) {
    memory.set(key, hits);
    return false;
  }
  hits.push(now);
  memory.set(key, hits);
  // Keep the map from growing without bound under heavy traffic.
  if (memory.size > 10_000) {
    for (const [k, v] of memory) if (v.every((t) => t <= since)) memory.delete(k);
  }
  return true;
}

// Returns true if the request is allowed.
export async function allowRequest(supabase: RpcClient, userId: string, limit: Limit): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("hit_rate_limit", {
      p_route: limit.route,
      p_max: limit.max,
      p_window_seconds: limit.windowSec,
    });
    if (!error && typeof data === "boolean") return data;
    if (!warned) {
      warned = true;
      console.warn("hit_rate_limit() unavailable; using in-memory rate limit. Run supabase/07_hardening.sql.");
    }
  } catch {
    // fall through to memory
  }
  return memoryHit(`${limit.route}:${userId}`, limit);
}

export function tooMany(limit: Limit) {
  const mins = Math.max(1, Math.round(limit.windowSec / 60));
  return {
    error: `You've reached the limit of ${limit.max} requests in ${mins} minute${mins === 1 ? "" : "s"}. Please wait a few minutes and try again.`,
  };
}
