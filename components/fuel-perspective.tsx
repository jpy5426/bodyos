import { Apple, CircleCheck, Footprints } from "lucide-react";
import { compareFuel } from "@/lib/fuel-compare";

// Puts today's calories left (or over) into everyday terms: a food amount and minutes of walking.
export function FuelPerspective({
  eaten,
  target,
  weightLbs,
  className = "",
}: {
  eaten: number;
  target: number;
  weightLbs: number | null;
  className?: string;
}) {
  const { state, lines } = compareFuel(eaten, target, weightLbs);
  const icon = (label: string) =>
    label === "In activity" ? (
      <Footprints aria-hidden="true" className="h-4 w-4" />
    ) : state === "on_target" ? (
      <CircleCheck aria-hidden="true" className="h-4 w-4" />
    ) : (
      <Apple aria-hidden="true" className="h-4 w-4" />
    );
  return (
    <div className={`rounded-xl border bg-muted/40 p-3.5 ${className}`}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">In perspective</p>
      <ul className="space-y-2">
        {lines.map((l) => (
          <li key={l.label} className="flex gap-2.5 text-sm">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                state === "over" && l.label !== "In activity" ? "bg-destructive/10 text-destructive" : "bg-card text-info"
              }`}
            >
              {icon(l.label)}
            </span>
            <span>
              <span className="font-bold">{l.label}: </span>
              {l.text}.
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
        Estimates. Foods from USDA FoodData Central; walking from the 2024 Adult Compendium of Physical Activities
        (treadmill, 2.5–2.9 mph and 3.5–3.9 mph).
      </p>
    </div>
  );
}
