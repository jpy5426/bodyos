"""Regenerates public/exercises/<slug>.svg from the pose specs in specs.py.
Run from the repo root:  python scripts/exercise-figures/build.py
Each SVG has two panels: 1 = start position, 2 = finish or hold position (orange arrows show the motion)."""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from specs import render_all

def slug(name):  # must match exerciseSlug() in lib/exercise-media.ts
    return re.sub(r"[^a-z0-9]+", "-", name.lower().replace("'", "")).strip("-")

out = os.path.join("public", "exercises")
os.makedirs(out, exist_ok=True)
svgs = render_all()
for name, svg in svgs.items():
    with open(os.path.join(out, slug(name) + ".svg"), "w", encoding="utf-8") as f:
        f.write(svg)
print(f"wrote {len(svgs)} illustrations to {out}/")
