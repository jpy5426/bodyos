// Exercise illustrations and how-to video links for the library and the routine builder.
// Illustrations: public/exercises/<slug>.svg, drawn for BodyOS (two panels: 1 = start, 2 = finish or hold).
// Videos: a YouTube search for physical-therapist demos of the exercise, so every exercise has a working link.

const ILLUSTRATED = new Set<string>([
  "90-90-hip-switch",
  "ankle-alphabet",
  "ankle-circles",
  "arm-circles",
  "band-external-rotation",
  "band-pull-apart",
  "bodyweight-single-leg-rdl",
  "cat-cow-stretch",
  "chair-assisted-squat",
  "childs-pose",
  "chin-tuck",
  "couch-stretch",
  "doorway-pec-stretch",
  "eccentric-calf-raise",
  "half-kneeling-ankle-rock",
  "hip-cars",
  "hip-flexor-stretch",
  "marching-in-place",
  "mcgill-curl-up",
  "neck-rolls",
  "pallof-press",
  "prone-y-t-w-raise",
  "scapular-wall-slide",
  "seated-figure-4-stretch",
  "seated-hamstring-stretch",
  "seated-heel-toe-raises",
  "seated-leg-extension",
  "seated-marching",
  "seated-scapular-squeeze",
  "seated-shoulder-rolls",
  "seated-spinal-twist",
  "seated-thoracic-extension",
  "shoulder-cars",
  "side-lying-clamshell",
  "side-lying-hip-abduction",
  "single-leg-balance",
  "sit-to-stand",
  "slow-step-down",
  "standing-back-extension",
  "standing-calf-raise",
  "standing-side-bend",
  "straight-leg-raise",
  "supine-hamstring-floss",
  "supported-deep-squat-hold",
  "terminal-knee-extension",
  "thoracic-rotation",
  "thread-the-needle",
  "towel-toe-scrunch",
  "upper-trap-stretch",
  "walk-around-the-block",
  "wall-push-up",
  "worlds-greatest-stretch",
  "wrist-extensor-stretch",
  "wrist-flexor-stretch",
]);

// Same rules as the script that generated the files: lowercase, drop apostrophes, other symbols become "-".
export function exerciseSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Path to the illustration, or null if this exercise doesn't have one.
export function exerciseImage(name: string): string | null {
  const slug = exerciseSlug(name);
  return ILLUSTRATED.has(slug) ? `/exercises/${slug}.svg` : null;
}

// YouTube search for a how-to demo. Opens in a new tab; nothing is embedded or tracked.
export function exerciseVideoUrl(name: string): string {
  const q = `${name} exercise how to physical therapist`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
