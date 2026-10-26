"""Pose specs for all 54 BodyOS library exercises. Each entry -> two-panel SVG (1 = start, 2 = finish/hold)."""
from figure import *

def P(base, **kw):
    d = dict(base); d.update(kw); return d

# ---- base poses (figure faces right) ----
STAND = dict(hip=(110, 102), t=0, legs=[(0, 0, 90), (0, 0, 90)], arms=[(4, 4), (4, 4)])
SEAT = dict(hip=(88, 144), t=0, legs=[(90, 0, 90), (90, 0, 90)], arms=[(8, 70), (8, 70)])
CH = chair(110)                                        # chair that SEAT sits on
SEAT_F = dict(hip=(120, 144), t=0, view="front", legs=[(-30, -3, -90, 0.32, 1), (30, 3, 90, 0.32, 1)], arms=[(-12, -4), (12, 4)])
CHF = chair_front(120)
STAND_F = dict(hip=(120, 102), t=0, view="front", legs=[(-5, -5, -90), (5, 5, 90)], arms=[(-10, -6), (10, 6)])
SUP = dict(hip=(95, 180), t=90, h=90, legs=[(-90, -90, 180), (-90, -90, 180)], arms=[(-88, -90), (-88, -90)])
QUAD = dict(hip=(85, 144), t=72, h=110, legs=[(0, -90, None), (0, -90, None)], arms=[(0, 0), (0, 0)])
HALFK = dict(hip=(100, 144), t=0, legs=[(-11, -90, None), {"to": (150, 185), "bend": 1}], arms=[(10, 40), (10, 40)])

def head_arrow(dx0, dx1, dy=-2):
    return lambda pt: straight_arrow((pt["head"][0] + dx0, pt["head"][1] + dy), (pt["head"][0] + dx1, pt["head"][1] + dy))

EX = {}

# ================= DESK & SEDENTARY =================
EX["Chin Tuck"] = [
    (P(SEAT, h=20), CH),
    (P(SEAT, h=-4), CH, "", head_arrow(26, 8))]

EX["Upper Trap Stretch"] = [
    (P(SEAT_F, arms=[{"to": (93, 150)}, (14, 4)]), CHF),
    (P(SEAT_F, h=30, arms=[{"to": (93, 152)}, (14, 4)]), CHF, "", lambda pt: arc_arrow(pt["sh"][0], pt["sh"][1], 38, 100, 55))]

EX["Seated Shoulder Rolls"] = [
    (SEAT_F, CHF, "", lambda pt: circle_arrow(pt["shoulders"][0][0] - 6, pt["shoulders"][0][1] - 6, 8) + circle_arrow(pt["shoulders"][1][0] + 6, pt["shoulders"][1][1] - 6, 8)),
    (P(SEAT_F, shrug=8, neck=-4), CHF)]

EX["Seated Scapular Squeeze"] = [
    (P(SEAT, arms=[(20, 90), (20, 90)]), CH),
    (P(SEAT, t=-3, arms=[(-28, 60), (-28, 60)]), CH, "", lambda pt: straight_arrow((pt["sh"][0] - 6, pt["sh"][1] + 26), (pt["sh"][0] - 26, pt["sh"][1] + 26)))]

EX["Seated Thoracic Extension"] = [
    (P(SEAT, arms=[{"to": (82, 64), "bend": -1}, {"to": (82, 64), "bend": -1}]), CH),
    (P(SEAT, t=-22, h=-34, arms=[{"to": (56, 72), "bend": -1}, {"to": (56, 72), "bend": -1}]), CH, "",
     lambda pt: arc_arrow(88, 144, 70, 70, 100))]

EX["Seated Spinal Twist"] = [
    (P(SEAT_F, arms=[{"to": (126, 100), "bend": -1}, {"to": (114, 100), "bend": 1}]), CHF),
    (P(SEAT_F, turn=60, h=8, arms=[{"to": (128, 102), "bend": -1}, {"to": (118, 100), "bend": 1}]), CHF, "",
     lambda pt: arc_arrow(120, 66, 26, 160, 20))]

EX["Seated Figure-4 Stretch"] = [
    (P(SEAT, legs=[(90, 0, 90), {"to": (130, 140), "bend": 1, "s": 0.72, "foot": 60}], arms=[(14, 75), (14, 75)]), CH),
    (P(SEAT, t=28, legs=[(90, 0, 90), {"to": (130, 140), "bend": 1, "s": 0.72, "foot": 60}], arms=[(40, 80), (40, 80)]), CH, "",
     lambda pt: arc_arrow(88, 144, 66, 92, 64))]

EX["Seated Hamstring Stretch"] = [
    (P(SEAT, hip=(100, 144), legs=[(90, 0, 90), {"to": (180, 183), "foot": 165}], arms=[(14, 70), (14, 70)]), chair(122)),
    (P(SEAT, hip=(100, 144), t=38, legs=[(90, 0, 90), {"to": (180, 183), "foot": 165}], arms=[(55, 70), (55, 70)]), chair(122), "",
     lambda pt: arc_arrow(100, 144, 64, 88, 55))]

EX["Seated Leg Extension"] = [
    (SEAT, CH),
    (P(SEAT, legs=[(90, 0, 90), (90, 90, 180)]), CH, "", lambda pt: arc_arrow(130, 144, 44, -85, -10))]

EX["Seated Heel-Toe Raises"] = [
    (P(SEAT, legs=[(90, 0, 90), {"to": (128, 176), "bend": 1, "foot": 55}]), CH, "", lambda pt: straight_arrow((118, 186), (118, 170))),
    (P(SEAT, legs=[(90, 0, 90), {"to": (128, 184), "bend": 1, "foot": 125}]), CH, "", lambda pt: straight_arrow((150, 184), (150, 168)))]

EX["Sit-to-Stand"] = [
    (P(SEAT, t=24, arms=[{"to": (110, 96), "bend": -1}, {"to": (112, 96), "bend": -1}]), CH),
    (P(STAND, hip=(118, 102), arms=[{"to": (134, 52), "bend": -1}, {"to": (136, 52), "bend": -1}]), chair(100), "",
     lambda pt: straight_arrow((165, 150), (165, 108)))]

EX["Doorway Pec Stretch"] = [
    (P(STAND, hip=(112, 102), arms=[(4, 4), (-90, 180)]), doorframe(76)),
    (P(STAND, hip=(132, 102), t=8, legs=[(-12, -12, 90), (18, 4, 90)], arms=[(4, 4), {"to": (82, 30), "bend": -1}]), doorframe(76), "",
     lambda pt: straight_arrow((150, 160), (178, 160)))]

EX["Standing Back Extension"] = [
    (P(STAND, arms=[{"to": (98, 106), "bend": -1}, {"to": (98, 106), "bend": -1}]), floor()),
    (P(STAND, t=-16, h=-30, arms=[{"to": (100, 108), "bend": -1}, {"to": (100, 108), "bend": -1}]), floor(), "",
     lambda pt: arc_arrow(110, 102, 64, 92, 112))]

EX["Wrist Flexor Stretch"] = [
    (P(STAND, arms=[(4, 4), (90, 90, 90)]), floor()),
    (P(STAND, arms=[{"to": (170, 60), "bend": -1}, (90, 90, 175)]), floor(), "", lambda pt: arc_arrow(pt["arm1"][2][0], pt["arm1"][2][1], 16, 30, 95))]

EX["Wrist Extensor Stretch"] = [
    (P(STAND, arms=[(4, 4), (90, 90, 90)]), floor()),
    (P(STAND, arms=[{"to": (172, 62), "bend": -1}, (90, 90, 5)]), floor(), "", lambda pt: arc_arrow(pt["arm1"][2][0], pt["arm1"][2][1], 16, -30, -95))]

EX["Walk Around the Block"] = [
    (P(STAND, hip=(100, 104), legs=[(-20, -20, 90), (20, 12, 90)], arms=[(25, 40), (-25, -10)]), floor(), "", lambda pt: straight_arrow((150, 30), (190, 30))),
    (P(STAND, hip=(130, 104), legs=[(20, 12, 90), (-20, -20, 90)], arms=[(-25, -10), (25, 40)]), floor())]

EX["Marching in Place"] = [
    (P(STAND, legs=[(0, 0, 90), (80, 0, 90)], arms=[(25, 70), (-20, 10)]), floor(), "", lambda pt: straight_arrow((165, 150), (165, 122))),
    (P(STAND, legs=[(80, 0, 90), (0, 0, 90)], arms=[(-20, 10), (25, 70)]), floor())]

EX["Seated Marching"] = [
    (P(SEAT, legs=[(90, 0, 90), (118, 18, 90)]), CH, "", lambda pt: straight_arrow((150, 168), (150, 140))),
    (P(SEAT, legs=[(118, 18, 90), (90, 0, 90)]), CH)]

def lean(theta, ankle=(108, 185)):
    hip = (ankle[0] + 83 * math.sin(math.radians(theta)), ankle[1] - 83 * math.cos(math.radians(theta)))
    return hip, -theta
h1, l1 = lean(14); h2, l2 = lean(26)
EX["Wall Push-up"] = [
    (P(STAND, hip=h1, t=14, legs=[(l1, l1, 90), (l1, l1, 90)], arms=[{"to": (194, 60), "bend": -1}, {"to": (194, 62), "bend": -1}]), wall(200)),
    (P(STAND, hip=h2, t=26, legs=[(l2, l2, 90), (l2, l2, 90)], arms=[{"to": (194, 62), "bend": -1}, {"to": (194, 64), "bend": -1}]), wall(200), "",
     lambda pt: straight_arrow((150, 30), (176, 30)))]

EX["Chair-assisted Squat"] = [
    (P(STAND, hip=(112, 102), arms=[(4, 4), (4, 4)]), chair(96)),
    (P(STAND, hip=(98, 140), t=32, legs=[{"to": (128, 185), "bend": 1}, {"to": (130, 185), "bend": 1}], arms=[(90, 90), (90, 90)]), chair(96), "",
     lambda pt: straight_arrow((170, 110), (170, 145)))]

EX["Standing Calf Raise"] = [
    (P(STAND, hip=(100, 102), arms=[{"to": (150, 112)}, {"to": (152, 112)}]), counter(156)),
    (P(STAND, hip=(100, 92), legs=[(0, 0, 40), (0, 0, 40)], arms=[{"to": (150, 112)}, {"to": (152, 112)}]), counter(156), "",
     lambda pt: straight_arrow((76, 182), (76, 160)))]

# ================= PREHAB =================
EX["Band External Rotation"] = [
    (P(STAND_F, arms=[(-8, -4), {"to": (110, 132), "bend": 1}]), floor() + anchor((22, 132)), "", lambda pt: band(pt["arm1"][2], (22, 132))),
    (P(STAND_F, arms=[(-8, -4), {"to": (160, 132), "bend": -1}]), floor() + anchor((22, 132)), "", lambda pt: band(pt["arm1"][2], (22, 132)) + arc_arrow(135, 132, 24, 200, 330))]

EX["Band Pull-Apart"] = [
    (P(STAND_F, arms=[{"to": (104, 62), "s": 0.5, "bend": -1}, {"to": (136, 62), "s": 0.5, "bend": 1}]), floor(), "", lambda pt: band(pt["arm0"][2], pt["arm1"][2])),
    (P(STAND_F, arms=[(-90, -90), (90, 90)]), floor(), "", lambda pt: band(pt["arm0"][2], pt["arm1"][2]) + straight_arrow((150, 30), (176, 30)) + straight_arrow((90, 30), (64, 30)))]

EX["Scapular Wall Slide"] = [
    (P(STAND_F, arms=[(-90, 180), (90, 180)]), backdrop(60, 12, 120, 178) + floor()),
    (P(STAND_F, arms=[(-155, -170), (155, 170)]), backdrop(60, 12, 120, 178) + floor(), "", lambda pt: straight_arrow((190, 70), (190, 40)))]

EX["Prone Y-T-W Raise"] = [
    (P(STAND_F, hip=(120, 112), arms=[(-138, -138), (138, 138)], legs=[(-4, -4, None), (4, 4, None)]), backdrop(30, 14, 180, 176), "", label(24, 60, "Y", 20)),
    (P(STAND_F, hip=(120, 112), arms=[(-90, -90), (90, 90)], legs=[(-4, -4, None), (4, 4, None)]), backdrop(30, 14, 180, 176), "", label(24, 60, "T", 20))]

SIDEL = dict(hip=(104, 177), t=90, h=96, view="side", arms=[(90, 90), (-97, -93)])
EX["Side-lying Clamshell"] = [
    (P(SIDEL, legs=[{"pts": [(82, 188), (58, 174)]}, {"pts": [(84, 181), (60, 168)]}]), mat()),
    (P(SIDEL, legs=[{"pts": [(82, 188), (58, 174)]}, {"pts": [(86, 146), (60, 168)]}]), mat(), "",
     lambda pt: arc_arrow(104, 177, 34, 200, 128))]

EX["Side-lying Hip Abduction"] = [
    (P(SIDEL, legs=[{"to": (50, 184), "bend": -1, "foot": 180}, (-90, -90, 180)]), mat()),
    (P(SIDEL, legs=[{"to": (50, 184), "bend": -1, "foot": 180}, (-122, -122, 150)]), mat(), "", lambda pt: arc_arrow(108, 176, 70, 186, 150))]

EX["Straight Leg Raise"] = [
    (P(SUP, legs=[{"to": (52, 184), "bend": -1, "foot": -90}, (-90, -90, 180)]), mat()),
    (P(SUP, legs=[{"to": (52, 184), "bend": -1, "foot": -90}, (-130, -130, 140)]), mat(), "", lambda pt: arc_arrow(95, 180, 72, 182, 140))]

EX["Terminal Knee Extension"] = [
    (P(STAND, hip=(100, 108), legs=[{"to": (100, 185), "bend": 1}, {"to": (108, 185), "bend": 1}]), floor() + anchor((210, 150)), "", lambda pt: band(pt["leg1"][1], (210, 150))),
    (P(STAND, hip=(104, 102)), floor() + anchor((210, 150)), "", lambda pt: band(pt["leg1"][1], (210, 150)) + straight_arrow((112, 165), (96, 165)))]

STEP = step(70, 70, 26)
EX["Slow Step-Down"] = [
    (P(STAND, hip=(104, 76), legs=[(0, 0, 90), (0, 0, 90)]), STEP),
    (P(STAND, hip=(100, 98), t=14, legs=[{"to": (100, 159), "bend": 1}, {"to": (156, 185), "bend": -1, "foot": 90}], arms=[(60, 70), (60, 70)]), STEP, "",
     lambda pt: straight_arrow((180, 150), (180, 178)))]

EX["Single-leg Balance"] = [
    (P(STAND, hip=(100, 102)), counter(160, 112, 36)),
    (P(STAND, hip=(100, 102), legs=[(0, 0, 90), (0, -70, 20)], arms=[(10, 10), {"to": (152, 108), "bend": -1}]), counter(160, 112, 36))]

EX["Ankle Alphabet"] = [
    (P(SEAT, legs=[(90, 0, 90), (95, 40, 100)]), CH, "", lambda pt: circle_arrow(pt["leg1"][3][0] + 4, pt["leg1"][3][1] - 4, 11)),
    (P(SEAT, legs=[(90, 0, 90), (95, 40, 150)]), CH, "", lambda pt: label(pt["leg1"][3][0] + 22, pt["leg1"][3][1] - 14, "A–Z", 12))]

STEPC = step(58, 72, 26)
EX["Eccentric Calf Raise"] = [
    (P(STAND, hip=(102, 66), legs=[(0, 0, 50), (0, 0, 50)], arms=[(14, 30), (14, 30)]), STEPC),
    (P(STAND, hip=(102, 84), legs=[(-10, -70, -10), (0, 0, 120)], arms=[(14, 30), (14, 30)]), STEPC, "",
     lambda pt: (straight_arrow((150, 150), (150, 176))))]

EX["Towel Toe Scrunch"] = [
    (SEAT, CH + towel(122, 190, 62)),
    (P(SEAT, legs=[(90, 0, 90), (90, 0, 70)]), CH + towel(122, 190, 34), "", lambda pt: straight_arrow((178, 176), (160, 176)))]

EX["McGill Curl-up"] = [
    (P(SUP, legs=[{"to": (52, 184), "bend": -1, "foot": -90}, (-90, -90, 180)], arms=[{"to": (92, 186), "bend": 1}, {"to": (98, 186), "bend": 1}]), mat()),
    (P(SUP, t=78, h=74, legs=[{"to": (52, 184), "bend": -1, "foot": -90}, (-90, -90, 180)], arms=[{"to": (92, 186), "bend": 1}, {"to": (98, 186), "bend": 1}]), mat(), "",
     lambda pt: straight_arrow((165, 168), (165, 150)))]

EX["Pallof Press"] = [
    (P(STAND, arms=[{"to": (124, 66), "bend": -1}, {"to": (126, 66), "bend": -1}]), floor() + anchor((36, 66)), "", lambda pt: band(pt["arm1"][2], (36, 66))),
    (P(STAND, arms=[(90, 90), (90, 90)]), floor() + anchor((36, 66)), "", lambda pt: band(pt["arm1"][2], (36, 66)) + straight_arrow((150, 84), (178, 84)))]

EX["Bodyweight Single-leg RDL"] = [
    (P(STAND, hip=(110, 102), legs=[(0, 0, 90), (6, 6, 90)]), floor()),
    (P(STAND, hip=(104, 104), t=80, h=84, legs=[(4, 0, 90), (-92, -92, 0)], arms=[(6, 6), (2, 2)]), floor(), "",
     lambda pt: arc_arrow(104, 104, 60, 80, 15))]

# ================= MOBILITY =================
SIT_F = dict(hip=(120, 170), t=0, view="front", arms=[{"to": (88, 186), "bend": 1}, {"to": (152, 186), "bend": -1}])
EX["90/90 Hip Switch"] = [
    (P(SIT_F, legs=[{"to": (180, 186), "s": 0.8, "bend": 1, "foot": None}, {"to": (200, 168), "s": 0.8, "bend": 1, "foot": None}]), mat(), "",
     lambda pt: arc_arrow(120, 178, 46, 30, 150)),
    (P(SIT_F, legs=[{"to": (40, 168), "s": 0.8, "bend": -1, "foot": None}, {"to": (60, 186), "s": 0.8, "bend": -1, "foot": None}]), mat())]

LUNGE = dict(hip=(100, 138), t=55, h=70, legs=[{"to": (40, 182), "bend": 1, "foot": 170}, {"to": (156, 185), "bend": 1}])
EX["World's Greatest Stretch"] = [
    (P(LUNGE, arms=[(4, 4), {"to": (138, 186), "bend": 1}]), mat()),
    (P(LUNGE, t=50, h=20, arms=[(170, 175), {"to": (138, 186), "bend": 1}]), mat(), "", lambda pt: arc_arrow(pt["sh"][0], pt["sh"][1], 34, 30, 95))]

EX["Child's Pose"] = [
    (P(STAND, hip=(100, 144), legs=[(0, -90, None), (0, -90, None)], arms=[(160, 175), (160, 175)]), mat()),
    (P(STAND, hip=(76, 168), t=96, h=99, legs=[(71, -90, None), (71, -90, None)], arms=[(91, 90), (91, 90)]), mat(), "",
     lambda pt: straight_arrow((70, 132), (66, 152)))]

EX["Half-kneeling Ankle Rock"] = [
    (HALFK, mat()),
    (P(HALFK, hip=(110, 146), legs=[(-18, -90, None), {"to": (152, 185), "bend": 1}]), mat(), "", lambda pt: straight_arrow((140, 112), (166, 112)))]

EX["Couch Stretch"] = [
    (P(HALFK, hip=(96, 140), t=30, legs=[{"to": (82, 186), "bend": 1, "foot": None}, {"to": (150, 185), "bend": 1}], arms=[(60, 80), (60, 80)]), wall(40) + mat(), "",
     lambda pt: line((82, 186), (46, 140), INK, 10)),
    (P(HALFK, hip=(98, 140), t=-2, legs=[{"to": (82, 186), "bend": 1, "foot": None}, {"to": (150, 185), "bend": 1}], arms=[(10, 30), (10, 30)]), wall(40) + mat(), "",
     lambda pt: line((82, 186), (46, 140), INK, 10) + arc_arrow(98, 140, 62, 62, 92))]

EX["Supine Hamstring Floss"] = [
    (P(SUP, legs=[(-90, -90, 180), (180, -120, 150)], arms=[{"to": (88, 120), "bend": -1}, {"to": (90, 118), "bend": -1}]), mat(), "",
     lambda pt: strap(pt["arm1"][2], pt["leg1"][2])),
    (P(SUP, legs=[(-90, -90, 180), (-165, -165, 110)], arms=[{"to": (80, 128), "bend": -1}, {"to": (82, 126), "bend": -1}]), mat(), "",
     lambda pt: strap(pt["arm1"][2], pt["leg1"][2]) + arc_arrow(95, 180, 70, 135, 100))]

EX["Supported Deep Squat Hold"] = [
    (P(STAND, hip=(100, 102), arms=[{"to": (170, 82), "bend": -1}, {"to": (170, 84), "bend": -1}]), doorframe(178)),
    (P(STAND, hip=(100, 160), t=22, legs=[{"to": (118, 185), "bend": 1}, {"to": (120, 185), "bend": 1}], arms=[{"to": (170, 110), "bend": -1}, {"to": (170, 112), "bend": -1}]), doorframe(178), "",
     lambda pt: straight_arrow((60, 110), (60, 150)))]

EX["Thread the Needle"] = [
    (P(QUAD, h=90, arms=[(0, 0), (180, 180)]), mat(), "", lambda pt: arc_arrow(pt["sh"][0], pt["sh"][1], 30, 110, 60)),
    (P(QUAD, t=82, h=130, near_first=True, arms=[(0, 0), (-60, -80)]), mat(), "", lambda pt: straight_arrow((150, 160), (110, 172)))]

EX["Shoulder CARs"] = [
    (P(STAND, arms=[(4, 4), (160, 168)]), floor(), "", lambda pt: arc_arrow(pt["sh"][0], pt["sh"][1], 46, 60, 150)),
    (P(STAND, arms=[(4, 4), (-120, -130)]), floor())]

EX["Hip CARs"] = [
    (P(STAND, hip=(100, 102), legs=[(0, 0, 90), (90, 0, 90)], arms=[(4, 4), {"to": (150, 104), "bend": -1}]), counter(156, 104, 34)),
    (P(STAND, hip=(100, 102), legs=[(0, 0, 90), (-30, -110, -40)], arms=[(4, 4), {"to": (150, 104), "bend": -1}]), counter(156, 104, 34), "",
     lambda pt: circle_arrow(100, 118, 30))]

EX["Cat-Cow Stretch"] = [
    (P(QUAD, arch=-12, h=160), mat(), "", lambda pt: straight_arrow((110, 104), (110, 88))),
    (P(QUAD, arch=10, h=50), mat(), "", lambda pt: straight_arrow((110, 132), (110, 148)))]

EX["Hip Flexor Stretch"] = [
    (P(HALFK, arms=[{"to": (100, 112), "bend": -1}, {"to": (102, 112), "bend": -1}]), mat()),
    (P(HALFK, hip=(112, 146), legs=[(-24, -90, None), {"to": (152, 185), "bend": 1}], arms=[{"to": (112, 114), "bend": -1}, {"to": (114, 114), "bend": -1}]), mat(), "",
     lambda pt: straight_arrow((96, 132), (120, 132)))]

EX["Thoracic Rotation"] = [
    (P(QUAD, arms=[(0, 0), {"to": (124, 150), "bend": 1}]), mat(), "", lambda pt: arc_arrow(pt["sh"][0], pt["sh"][1], 34, -60, 80)),
    (P(QUAD, h=60, arms=[(0, 0), {"to": (150, 72), "bend": -1}]), mat())]

EX["Arm Circles"] = [
    (P(STAND_F, arms=[(-90, -90), (90, 90)]), floor(), "",
     lambda pt: circle_arrow(pt["arm1"][2][0] + 4, pt["arm1"][2][1], 9) + circle_arrow(pt["arm0"][2][0] - 4, pt["arm0"][2][1], 9)),
    (P(STAND_F, arms=[(-100, -100), (100, 100)]), floor(), "",
     lambda pt: circle_arrow(pt["arm1"][2][0] + 4, pt["arm1"][2][1], 15) + circle_arrow(pt["arm0"][2][0] - 4, pt["arm0"][2][1], 15))]

EX["Ankle Circles"] = [
    (P(STAND, hip=(96, 102), legs=[(0, 0, 90), (24, 10, 120)], arms=[(4, 4), {"to": (150, 106), "bend": -1}]), counter(156, 106, 34), "",
     lambda pt: circle_arrow(pt["leg1"][3][0], pt["leg1"][3][1] - 4, 11)),
    (P(STAND, hip=(96, 102), legs=[(0, 0, 90), (24, 10, 60)], arms=[(4, 4), {"to": (150, 106), "bend": -1}]), counter(156, 106, 34))]

EX["Neck Rolls"] = [
    (P(STAND_F, h=28), floor(), "", lambda pt: arc_arrow(pt["sh"][0], pt["sh"][1] - 14, 22, -20, -160)),
    (P(STAND_F, h=-28), floor())]

EX["Standing Side Bend"] = [
    (P(STAND_F, arms=[(-10, -6), (170, 178)]), floor()),
    (P(STAND_F, t=-18, h=-22, arms=[{"to": (84, 128)}, (-150, -140)]), floor(), "", lambda pt: arc_arrow(120, 102, 74, 70, 112))]


SCALE = {"Slow Step-Down": 0.86, "Eccentric Calf Raise": 0.86, "Standing Side Bend": 0.93, "Shoulder CARs": 0.95}

def render_all():
    out = {}
    for name, frames in EX.items():
        fr = []
        for f in frames:
            f = list(f) + [""] * (4 - len(f))
            fr.append((f[0], f[1], f[2], f[3] or None))
        out[name] = svg(fr, name, SCALE.get(name, 1.0))
    return out
