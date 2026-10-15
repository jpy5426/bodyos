import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  {
    href: "/protected/workout",
    title: "AI Mobility & Prehab Routines",
    desc: "Short routines built by AI for desk workers, injury prevention and better mobility.",
  },
  {
    href: "/protected/library",
    title: "Mobility & Prehab Library",
    desc: "Desk breaks, injury-prevention and mobility exercises with how-to steps and doses.",
  },
  {
    href: "/protected/macros",
    title: "Macro & Calorie Calculator",
    desc: "Daily calorie target and protein / fat / carb grams from your stats and goal.",
  },
  {
    href: "/protected/meals",
    title: "Meal Photo Estimator",
    desc: "Snap your plate. AI names the foods; USDA data gives the calories and macros.",
  },
];

async function Greeting() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const email = (data.claims.email as string) ?? "";
  return (
    <p className="text-muted-foreground">
      Sit less, move better, stay injury-free.{email && ` Signed in as ${email}.`}
    </p>
  );
}

export default function ProtectedPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">BodyOS</h1>
        <Suspense fallback={<p className="text-muted-foreground">Sit less, move better, stay injury-free.</p>}>
          <Greeting />
        </Suspense>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="rounded-lg border p-5 transition hover:bg-accent"
          >
            <h2 className="font-semibold mb-1">{f.title}</h2>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        For prevention and general wellness. Not medical advice. If you have pain or an injury,
        follow a physical therapist&apos;s plan.
      </p>
    </div>
  );
}
