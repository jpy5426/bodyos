import { ImageOff, PlayCircle } from "lucide-react";
import { exerciseImage, exerciseVideoUrl } from "@/lib/exercise-media";

// Two-panel illustration (1 = start, 2 = finish or hold). Falls back to a quiet placeholder.
export function ExerciseFigure({ name, className = "" }: { name: string; className?: string }) {
  const src = exerciseImage(name);
  if (!src) {
    return (
      <div
        className={`flex aspect-[488/200] items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/40 text-xs text-muted-foreground ${className}`}
      >
        <ImageOff aria-hidden="true" className="h-4 w-4" />
        No illustration yet
      </div>
    );
  }
  return (
    // Static SVGs from /public; next/image adds nothing for vector files.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`How to do ${name}: step 1 start position, step 2 finish position`}
      loading="lazy"
      className={`aspect-[488/200] w-full rounded-xl border bg-white object-contain ${className}`}
    />
  );
}

export function VideoLink({ name, className = "" }: { name: string; className?: string }) {
  return (
    <a
      href={exerciseVideoUrl(name)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm font-bold text-info underline-offset-2 hover:underline ${className}`}
    >
      <PlayCircle aria-hidden="true" className="h-4 w-4" />
      Watch a how-to video
      <span className="sr-only">(opens YouTube in a new tab)</span>
    </a>
  );
}
