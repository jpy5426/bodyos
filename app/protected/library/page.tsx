"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Exercise = {
  id: string; name: string; category: string; equipment: string;
  primary_muscles: string; difficulty: number;
  focus: "sedentary" | "prehab" | "mobility";
  body_region: string; position: string; how_to: string; dose: string;
};

const FOCUS_TABS = [
  { value: "all", label: "All" },
  { value: "sedentary", label: "Desk & Sedentary" },
  { value: "prehab", label: "Prehab" },
  { value: "mobility", label: "Mobility" },
] as const;

const FOCUS_STYLE: Record<string, string> = {
  sedentary: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  prehab: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  mobility: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
};

const LEVEL = ["", "Easy", "Moderate", "Advanced"];

export default function LibraryPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [position, setPosition] = useState<string>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("exercises")
      .select("id, name, category, equipment, primary_muscles, difficulty, focus, body_region, position, how_to, dose")
      .in("focus", ["sedentary", "prehab", "mobility"])
      .order("name")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setExercises((data ?? []) as Exercise[]);
        setLoading(false);
      });
  }, []);

  const regions = useMemo(() => Array.from(new Set(exercises.map((e) => e.body_region))).sort(), [exercises]);
  const positions = useMemo(() => Array.from(new Set(exercises.map((e) => e.position))).sort(), [exercises]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter(
      (e) =>
        (focus === "all" || e.focus === focus) &&
        (region === "all" || e.body_region === region) &&
        (position === "all" || e.position === position) &&
        (!q || e.name.toLowerCase().includes(q) ||
          e.primary_muscles.toLowerCase().includes(q) ||
          e.body_region.toLowerCase().includes(q)),
    );
  }, [exercises, focus, region, position, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: exercises.length };
    for (const e of exercises) c[e.focus] = (c[e.focus] ?? 0) + 1;
    return c;
  }, [exercises]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Mobility &amp; Prehab Library</h1>
        <p className="text-sm text-muted-foreground">
          Low-impact movements for desk breaks, injury prevention and joint mobility.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FOCUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setFocus(t.value)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              focus === t.value ? "border-foreground bg-foreground text-background" : "hover:bg-accent"
            }`}
          >
            {t.label}
            <span className="ml-1.5 opacity-60">{counts[t.value] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or muscle…"
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
        <select value={region} onChange={(e) => setRegion(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm capitalize">
          <option value="all">All body regions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={position} onChange={(e) => setPosition(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm capitalize">
          <option value="all">Any position</option>
          {positions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading exercises…</p>}
      {error && <p className="text-sm text-red-600">Couldn&apos;t load the library: {error}</p>}
      {!loading && !error && (
        <p className="text-sm text-muted-foreground">Showing {filtered.length} of {exercises.length} exercises</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((e) => (
          <div key={e.id} className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{e.name}</h2>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs capitalize ${FOCUS_STYLE[e.focus]}`}>
                {e.focus}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground capitalize">
              <span>{e.body_region}</span>
              <span>· {e.position}</span>
              <span>· {e.equipment.replace("_", " ")}</span>
              <span>· {LEVEL[e.difficulty] ?? ""}</span>
            </div>
            {e.how_to && <p className="text-sm">{e.how_to}</p>}
            {e.dose && <p className="text-sm"><span className="font-medium">Dose:</span> {e.dose}</p>}
            <p className="text-xs text-muted-foreground">Targets: {e.primary_muscles}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        General education, not medical advice. Move within a pain-free range and stop if something hurts.
        For an existing injury, follow a physical therapist&apos;s plan.
      </p>
    </div>
  );
}