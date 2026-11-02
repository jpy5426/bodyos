import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchFoods } from "@/lib/usda";
import { allowRequest, tooMany, LIMITS } from "@/lib/rate-limit";

// GET /api/food-search?q=salmon baked
// Lets the user fix a wrong match or add a food the AI missed.
// Runs on the server so the USDA key never reaches the browser.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 80) {
    return NextResponse.json({ error: "Type 2 to 80 characters to search." }, { status: 400 });
  }

  if (!(await allowRequest(supabase, userData.user.id, LIMITS.foodSearch))) {
    return NextResponse.json(tooMany(LIMITS.foodSearch), { status: 429, headers: { "retry-after": "30" } });
  }

  const matches = await searchFoods(q);
  return NextResponse.json({
    results: matches.map((m) => ({
      fdc_id: m.fdcId,
      description: m.description,
      data_type: m.dataType,
      per100g: m.per100g,
    })),
  });
}
