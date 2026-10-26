import { Activity, Apple, Check } from "lucide-react";

// Decorative product preview for the landing page hero (sample numbers, not real data).
export function HeroPreview({ className = "" }: { className?: string }) {
  const moves: [string, string, boolean][] = [
    ["Chin Tuck", "10 reps, 3 sec hold", true],
    ["Seated Scapular Squeeze", "12 reps, 3 sec hold", true],
    ["Seated Thoracic Extension", "8–10 reps", false],
  ];
  const macros: [string, number, number][] = [
    ["Protein", 124, 133],
    ["Carbs", 70, 178],
    ["Fat", 52, 59],
  ];
  return (
    <div aria-hidden="true" className={`select-none ${className}`}>
      <div className="overflow-hidden rounded-xl bg-white text-[#18234A] shadow-[0_24px_60px_rgba(0,0,0,0.35)] ring-1 ring-black/5">
        <div className="flex items-center gap-2 border-b border-[#E2E7F0] bg-[#F4F6FA] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#CBD3E1]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#CBD3E1]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#CBD3E1]" />
          <span className="ml-2 text-[11px] font-semibold text-[#3A4462]">BodyOS · Today</span>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#18234A] text-white">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#3A4462]">Today&apos;s routine</p>
                <p className="text-sm font-semibold leading-tight">Routine B · Desk Posture Reset</p>
              </div>
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {moves.map(([name, dose, done]) => (
                <li key={name} className="flex items-center justify-between gap-3 rounded-md border border-[#E2E7F0] px-2.5 py-1.5 text-xs">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full ${
                        done ? "bg-[#16A34A] text-white" : "border border-[#CBD3E1]"
                      }`}
                    >
                      {done && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    {name}
                  </span>
                  <span className="shrink-0 text-[#3A4462]">{dose}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-[#E2E7F0] p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#3A4462]">Today&apos;s fuel</p>
              <span className="rounded bg-[#DCE2EE] px-1.5 py-0.5 text-[10px] font-semibold">Cutting</span>
            </div>
            <p className="mt-1">
              <span className="text-2xl font-bold tracking-tight">1,391</span>
              <span className="ml-1 text-xs text-[#3A4462]">/ 1,775 kcal</span>
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E2E7F0]">
              <div className="h-full w-[78%] rounded-full bg-[#F6A341]" />
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2.5">
              {macros.map(([label, eaten, goal]) => (
                <div key={label}>
                  <div className="flex justify-between text-[10px]">
                    <span className="font-semibold">{label}</span>
                    <span className="text-[#3A4462]">
                      {eaten}/{goal}g
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#E2E7F0]">
                    <div className="h-full rounded-full bg-[#18234A]" style={{ width: `${Math.round((eaten / goal) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#3A4462]">
              <Apple className="h-3.5 w-3.5 text-[#3B5BDB]" />
              384 kcal left, about 2 cups of cooked white rice
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
