"""Tiny 2D figure renderer for BodyOS exercise illustrations.

Angles are absolute, in screen space, in degrees:
  limbs  : 0 = pointing straight down, 90 = pointing right (+x), -90 = left, 180 = up
  torso/head : 0 = pointing straight up from the hip, 90 = right, -90 = left
A pose dict:
  hip: (x, y)           pelvis centre
  t: torso angle        h: head angle (default = t)
  view: "side" | "front"
  arms: [(upper, fore), (upper, fore)]       first = far/left, second = near/right
  legs: [(thigh, shin, foot), (...)]         first = far/left, second = near/right
"""
import math

INK = "#1B2A55"      # near limbs, torso, head
FAR = "#8E9BC4"      # far limbs
PROP = "#C7CEDF"     # furniture
PROP_D = "#9AA5C2"
ACC = "#F08A24"      # motion arrows, bands
FLOOR = "#DCE2EE"

TORSO, NECK, HEAD_R = 55, 7, 12.5
UPPER, FORE = 30, 28
THIGH, SHIN, FOOT = 42, 41, 13
SH_HALF, HIP_HALF = 15, 8      # front view offsets

def up(a):   r = math.radians(a); return (math.sin(r), -math.cos(r))
def down(a): r = math.radians(a); return (math.sin(r), math.cos(r))
def add(p, v, k): return (p[0] + v[0] * k, p[1] + v[1] * k)

def line(p, q, color, w, op=1):
    return f'<line x1="{p[0]:.1f}" y1="{p[1]:.1f}" x2="{q[0]:.1f}" y2="{q[1]:.1f}" stroke="{color}" stroke-width="{w}" stroke-linecap="round" opacity="{op}"/>'

def figure(p):
    hip = p["hip"]; t = p.get("t", 0); h = p.get("h", t); view = p.get("view", "side")
    sh = add(hip, up(t), TORSO)
    perp = (math.cos(math.radians(t)), math.sin(math.radians(t)))  # unit vector across the body
    if view == "front":
        half = SH_HALF * math.cos(math.radians(p.get("turn", 0)))
        shrug = p.get("shrug", 0)
        shoulders = [add(add(sh, perp, -half), up(t), shrug), add(add(sh, perp, half), up(t), shrug)]
        hips = [add(hip, perp, -HIP_HALF), add(hip, perp, HIP_HALF)]
    else:
        shoulders = [sh, sh]; hips = [hip, hip]
    neck_top = add(sh, up(h), NECK + p.get("neck", 0))
    head = add(neck_top, up(h), HEAD_R)
    out = {"far": [], "body": [], "near": [], "pts": {}}
    def ik(start, target, a, b, bend):
        dx, dy = target[0] - start[0], target[1] - start[1]
        d = max(1e-6, math.hypot(dx, dy)); dd = min(d, a + b - 0.01)
        base = math.degrees(math.atan2(dx, dy))
        cosA = max(-1, min(1, (a * a + dd * dd - b * b) / (2 * a * dd)))
        A = math.degrees(math.acos(cosA))
        a1 = base + bend * A
        e = add(start, down(a1), a)
        a2 = math.degrees(math.atan2(target[0] - e[0], target[1] - e[1])) if d <= a + b else base
        return a1, a2
    def limb(start, segs, color, ws, bucket, key):
        pts = [start]; cur = start
        for ang, ln in segs:
            cur = add(cur, down(ang), ln); pts.append(cur)
        for (a, b), w in zip(zip(pts, pts[1:]), ws):
            bucket.append(line(a, b, color, w))
        out["pts"][key] = pts
        return pts
    def norm_arm(spec, start):
        sc = 1; hand = None
        if isinstance(spec, dict):
            sc = spec.get("s", 1); hand = spec.get("hand")
            a1, a2 = ik(start, spec["to"], UPPER * sc, FORE * sc, spec.get("bend", 1))
        else:
            a1, a2 = spec[0], spec[1]; hand = spec[2] if len(spec) > 2 else None
        segs = [(a1, UPPER * sc), (a2, FORE * sc)] + ([(hand, 10)] if hand is not None else [])
        return segs, [8.5, 8.5, 6.5]
    def norm_leg(spec, start):
        sc = 1
        if isinstance(spec, dict) and "pts" in spec:
            segs, cur = [], start
            for q in spec["pts"]:
                segs.append((math.degrees(math.atan2(q[0] - cur[0], q[1] - cur[1])), math.hypot(q[0] - cur[0], q[1] - cur[1]))); cur = q
            if spec.get("foot") is not None: segs.append((spec["foot"], FOOT))
            return segs, [10, 10, 8]
        if isinstance(spec, dict):
            sc = spec.get("s", 1)
            a1, a2 = ik(start, spec["to"], THIGH * sc, SHIN * sc, spec.get("bend", -1)); foot = spec.get("foot", 90)
        else:
            a1, a2, foot = spec[:3]
            s1, s2 = (spec[3], spec[4]) if len(spec) >= 5 else (1, 1)
            return [(a1, THIGH * s1), (a2, SHIN * s2)] + ([(foot, FOOT)] if foot is not None else []), [10, 10, 8]
        segs = [(a1, THIGH * sc), (a2, SHIN * sc)] + ([(foot, FOOT)] if foot is not None else [])
        return segs, [10, 10, 8]
    arms = list(p.get("arms", [(10, 10), (10, 10)]))
    legs = list(p.get("legs", [(0, 0, 90), (0, 0, 90)]))
    far_col = FAR if view == "side" else INK
    near_first = p.get("near_first", False)   # draw the near arm behind the torso (e.g. threaded under)
    segs, ws = norm_leg(legs[0], hips[0]); limb(hips[0], segs, far_col, ws, out["far"], "leg0")
    segs, ws = norm_arm(arms[0], shoulders[0]); limb(shoulders[0], segs, far_col, ws, out["far"], "arm0")
    if view == "front":
        out["body"].append(f'<polygon points="{shoulders[0][0]:.1f},{shoulders[0][1]:.1f} {shoulders[1][0]:.1f},{shoulders[1][1]:.1f} '
                           f'{hips[1][0]:.1f},{hips[1][1]:.1f} {hips[0][0]:.1f},{hips[0][1]:.1f}" fill="{INK}" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>')
    else:
        arch = p.get("arch", 0)
        if arch:
            mid = ((hip[0] + sh[0]) / 2 + perp[0] * arch, (hip[1] + sh[1]) / 2 + perp[1] * arch)
            out["body"].append(f'<path d="M{hip[0]:.1f},{hip[1]:.1f} Q{mid[0]:.1f},{mid[1]:.1f} {sh[0]:.1f},{sh[1]:.1f}" fill="none" stroke="{INK}" stroke-width="17" stroke-linecap="round"/>')
        else:
            out["body"].append(line(hip, sh, INK, 17))
    out["body"].append(line(sh, neck_top, INK, 8))
    out["body"].append(f'<circle cx="{head[0]:.1f}" cy="{head[1]:.1f}" r="{HEAD_R}" fill="{INK}"/>')
    segs, ws = norm_leg(legs[1], hips[1]); limb(hips[1], segs, INK, ws, out["near"], "leg1")
    segs, ws = norm_arm(arms[1], shoulders[1])
    limb(shoulders[1], segs, INK if not near_first else FAR, ws, out["far"] if near_first else out["near"], "arm1")
    out["pts"].update(head=head, sh=sh, hip=hip, shoulders=shoulders, hips=hips)
    return out

# ---------------- props ----------------
def floor(y=190, x0=8, x1=232):
    return f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{FLOOR}" stroke-width="4" stroke-linecap="round"/>'

def mat(y=190, x0=30, x1=215):
    return f'<rect x="{x0}" y="{y-5}" width="{x1-x0}" height="6" rx="3" fill="#E4E8F5"/>'

def chair(x, y_seat=152, facing=1, back=True):
    """Side-view chair; x = front edge of seat when facing right (+1)."""
    d = -facing
    s = [f'<line x1="{x}" y1="{y_seat}" x2="{x + d*42}" y2="{y_seat}" stroke="{PROP_D}" stroke-width="6" stroke-linecap="round"/>',
         f'<line x1="{x - d*2}" y1="{y_seat}" x2="{x - d*2}" y2="190" stroke="{PROP}" stroke-width="5" stroke-linecap="round"/>',
         f'<line x1="{x + d*40}" y1="{y_seat}" x2="{x + d*40}" y2="190" stroke="{PROP}" stroke-width="5" stroke-linecap="round"/>']
    if back:
        s.append(f'<line x1="{x + d*42}" y1="{y_seat}" x2="{x + d*46}" y2="{y_seat-52}" stroke="{PROP_D}" stroke-width="6" stroke-linecap="round"/>')
    return "".join(s)

def chair_front(cx, y_seat=152, w=54):
    return (f'<line x1="{cx-w/2}" y1="{y_seat}" x2="{cx+w/2}" y2="{y_seat}" stroke="{PROP_D}" stroke-width="6" stroke-linecap="round"/>'
            f'<line x1="{cx-w/2+3}" y1="{y_seat}" x2="{cx-w/2+3}" y2="190" stroke="{PROP}" stroke-width="5" stroke-linecap="round"/>'
            f'<line x1="{cx+w/2-3}" y1="{y_seat}" x2="{cx+w/2-3}" y2="190" stroke="{PROP}" stroke-width="5" stroke-linecap="round"/>')

def wall(x, y0=20, y1=190):
    hatch = "".join(f'<line x1="{x}" y1="{y}" x2="{x+8}" y2="{y-8}" stroke="{PROP}" stroke-width="1.5"/>' for y in range(y0 + 12, y1, 14))
    return f'<line x1="{x}" y1="{y0}" x2="{x}" y2="{y1}" stroke="{PROP_D}" stroke-width="5" stroke-linecap="round"/>' + hatch

def counter(x, top=110, w=40):
    return (f'<rect x="{x}" y="{top}" width="{w}" height="80" rx="3" fill="#E9EDF6" stroke="{PROP}" stroke-width="2"/>'
            f'<line x1="{x-4}" y1="{top}" x2="{x+w+4}" y2="{top}" stroke="{PROP_D}" stroke-width="6" stroke-linecap="round"/>')

def step(x, w=60, hgt=22):
    return f'<rect x="{x}" y="{190-hgt}" width="{w}" height="{hgt}" rx="3" fill="#E4E8F5" stroke="{PROP_D}" stroke-width="2.5"/>'

def doorframe(x, y0=20):
    return (f'<rect x="{x-5}" y="{y0}" width="10" height="{190-y0}" rx="2" fill="#E4E8F5" stroke="{PROP_D}" stroke-width="2.5"/>')

def band(p, q, color=ACC):
    return f'<line x1="{p[0]:.1f}" y1="{p[1]:.1f}" x2="{q[0]:.1f}" y2="{q[1]:.1f}" stroke="{color}" stroke-width="3" stroke-linecap="round"/>'

def anchor(p):
    return f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="4" fill="{PROP_D}"/>'

def towel(x, y=190, w=46):
    return f'<rect x="{x}" y="{y-5}" width="{w}" height="5" rx="2" fill="#BFE3D0"/>'

def arc_arrow(cx, cy, r, a0, a1, color=ACC):
    """Arc from angle a0 to a1 (degrees, 0 = right, counter-clockwise positive in math sense; screen y flipped)."""
    def pt(a): return (cx + r * math.cos(math.radians(a)), cy - r * math.sin(math.radians(a)))
    p0, p1 = pt(a0), pt(a1)
    large = 1 if abs(a1 - a0) > 180 else 0
    sweep = 0 if a1 > a0 else 1
    return (f'<path d="M{p0[0]:.1f},{p0[1]:.1f} A{r},{r} 0 {large} {sweep} {p1[0]:.1f},{p1[1]:.1f}" fill="none" stroke="{color}" '
            f'stroke-width="2.5" stroke-linecap="round" marker-end="url(#ah)"/>')

def straight_arrow(p, q, color=ACC):
    return (f'<line x1="{p[0]:.1f}" y1="{p[1]:.1f}" x2="{q[0]:.1f}" y2="{q[1]:.1f}" stroke="{color}" stroke-width="2.5" '
            f'stroke-linecap="round" marker-end="url(#ah)"/>')

def circle_arrow(cx, cy, r, color=ACC):
    return arc_arrow(cx, cy, r, 100, 420, color)

DEFS = (f'<defs><marker id="ah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">'
        f'<path d="M0,0 L10,5 L0,10 z" fill="{ACC}"/></marker></defs>')

def panel(pose, props_back="", props_front="", extras=None, label="1"):
    f = figure(pose)
    if callable(props_front): props_front = props_front(f["pts"])
    if callable(props_back): props_back = props_back(f["pts"])
    extra = extras(f["pts"]) if callable(extras) else (extras or "")
    num = (f'<circle cx="18" cy="18" r="11" fill="#EEF1FA"/>'
           f'<text x="18" y="22.5" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700" fill="{INK}">{label}</text>')
    return props_back + "".join(f["far"] + f["body"]) + props_front + "".join(f["near"]) + extra + num

def svg(frames, title, scale=1.0):
    """frames: list of (pose, props_back, props_front, extras). Two panels side by side."""
    w = 240
    body = ""
    for i, fr in enumerate(frames):
        pose, pb, pf, ex = (list(fr) + [None, None, None])[:4]
        inner = panel(pose, pb or "", pf or "", ex, str(i + 1))
        if scale != 1.0:
            inner = f'<g transform="translate(120,192) scale({scale}) translate(-120,-192)">' + inner + "</g>"
        body += f'<g transform="translate({i*w + (8 if i else 0)},0)">' + inner + "</g>"
    sep = (f'<line x1="{w+4}" y1="30" x2="{w+4}" y2="180" stroke="#E6EAF3" stroke-width="2" stroke-dasharray="4 5"/>' if len(frames) > 1 else "")
    W = w * len(frames) + (8 if len(frames) > 1 else 0)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} 200" role="img" aria-label="{title}">'
            f'<title>{title}</title>{DEFS}<rect width="{W}" height="200" fill="#FFFFFF"/>{sep}{body}</svg>')

def label(x, y, s, size=13, color=ACC):
    return f'<text x="{x}" y="{y}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="{size}" font-weight="800" fill="{color}">{s}</text>'

def backdrop(x, y, w, h):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="#F1F4FA"/>'

def strap(p, q):
    return f'<line x1="{p[0]:.1f}" y1="{p[1]:.1f}" x2="{q[0]:.1f}" y2="{q[1]:.1f}" stroke="#4BA37A" stroke-width="2.5" stroke-linecap="round"/>'
