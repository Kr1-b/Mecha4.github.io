"""Robotic fish add-on parts. Units: mm. Frame: X forward (head), Y left, Z up.

Parts
- dry_box:   sealed hull for Arduino Nano, 2 fin servos (SG90), N20 tail motor
- dry_box_lid: flat lid, face-sealed by an O-ring in the box flange, rudder shaft gland
- pectoral_fin_left / right: NACA 0012 fins on a 3 mm D-shaft, pitch up/down
- rudder:    dorsal rudder on a vertical 3 mm D-shaft, steers left/right
"""
import math, os, sys
import cadquery as cq

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUT, exist_ok=True)

# ---------------- parameters ----------------
L, W, H = 150.0, 80.0, 70.0       # dry box outside (no flange)
WALL = 3.5
FLANGE = 12.0                     # flange width beyond the wall
FLANGE_T = 6.0
CORNER = 12.0
ORING_CS = 2.0                    # O-ring cord diameter
GROOVE_W, GROOVE_D = 2.6, 1.5     # face-seal groove (≈ 25% squeeze)
SHAFT = 3.0                       # fin / rudder shaft
BORE = SHAFT + 0.2
SEAL_GROOVE_D = 5.5               # radial seal groove dia for 3 x 1.5 O-ring (~17% squeeze)
TAIL_SHAFT_BORE = 4.2             # tail crank shaft (match your crank wire)
FIN_AXIS_X, FIN_AXIS_Z = 30.0, 35.0
RUDDER_AXIS_X = -20.0
TAIL_AXIS_Z = 35.0
SCREW_PILOT = 4.0                 # for M3 heat-set inserts
SCREW_CLEAR = 3.4
LID_T = 5.0


def naca0012(chord, n=40, t=0.12):
    """Closed NACA 00xx outline as (x, z) with x from 0 (LE) to chord (TE)."""
    pts = []
    for i in range(n + 1):
        b = math.pi * i / n
        x = (1 - math.cos(b)) / 2
        yt = 5 * t * (0.2969 * math.sqrt(x) - 0.1260 * x - 0.3516 * x**2
                      + 0.2843 * x**3 - 0.1036 * x**4)   # closed trailing edge
        pts.append((x, yt))
    upper = [(x * chord, z * chord) for x, z in pts]
    lower = [(x * chord, -z * chord) for x, z in reversed(pts[1:-1])]
    return upper + lower


def foil_wire(chord, le_x, along, axis):
    """Airfoil section at distance `along` on the span axis ('y' or 'z').
    Chord runs along -X (LE forward at le_x, TE toward the back)."""
    vs = []
    for cx, th in naca0012(chord):
        x = le_x - cx
        if axis == "y":
            vs.append(cq.Vector(x, along, th))
        else:
            vs.append(cq.Vector(x, th, along))
    return cq.Wire.assembleEdges([cq.Edge.makeSpline(vs, periodic=True)])


def d_shaft_hub(axis, length, start, od=12.0):
    """Hub on the pivot axis with a D-shaped 3 mm bore and an M3 set-screw hole."""
    if axis == "y":
        hub = cq.Workplane("XZ", origin=(0, start, 0)).circle(od / 2).extrude(-length)
        bore = (cq.Workplane("XZ", origin=(0, start - 1, 0))
                .circle(BORE / 2).extrude(-(length + 2)))
        flat = cq.Workplane("XY").box(BORE, BORE, length + 2).translate((0, start + length / 2, BORE / 2 + (SHAFT / 2 - 0.5)))
        screw = cq.Workplane("XY", origin=(0, start + length / 2, 0)).circle(1.25).extrude(od)
    else:
        hub = cq.Workplane("XY", origin=(0, 0, start)).circle(od / 2).extrude(length)
        bore = cq.Workplane("XY", origin=(0, 0, start - 1)).circle(BORE / 2).extrude(length + 2)
        flat = cq.Workplane("XY").box(BORE, BORE, length + 2).translate((0, BORE / 2 + (SHAFT / 2 - 0.5), start + length / 2))
        screw = cq.Workplane("XZ", origin=(0, 0, start + length / 2)).circle(1.25).extrude(-od)
    # D bore = round bore minus the material kept by the flat
    d_bore = bore.cut(flat)
    return hub.cut(d_bore).cut(screw)


def fin(root_chord, tip_chord, span, sweep, axis, hub_len, pivot_frac=0.3):
    """Tapered, swept NACA 0012 fin. Pivot axis passes through pivot_frac of the root chord."""
    root_le = root_chord * pivot_frac
    tip_le = root_le - sweep
    root = foil_wire(root_chord, root_le, hub_len * 0.5, axis)
    tip = foil_wire(tip_chord, tip_le, span, axis)
    blade = cq.Workplane("XY").add(cq.Solid.makeLoft([root, tip], ruled=False))
    hub = d_shaft_hub(axis, hub_len, 0.0)
    part = blade.union(hub)
    # round the tip a little
    try:
        part = part.edges(">Y" if axis == "y" else ">Z").fillet(1.0)
    except Exception:
        pass
    return part


# ---------------- pectoral fins ----------------
fin_left = fin(root_chord=55, tip_chord=28, span=75, sweep=18, axis="y", hub_len=12)
fin_right = fin_left.mirror("XZ")

# ---------------- rudder ----------------
rudder = fin(root_chord=60, tip_chord=30, span=60, sweep=22, axis="z", hub_len=10, pivot_frac=0.25)


# ---------------- dry box ----------------
def radial_gland(axis_pt, direction, boss_len, boss_od, bore, grooves=2):
    """Boss + bore + internal O-ring grooves. direction: unit tuple pointing outward."""
    dx, dy, dz = direction
    if abs(dy) > 0.5:
        plane = cq.Plane(origin=axis_pt, xDir=(1, 0, 0), normal=direction)
    elif abs(dx) > 0.5:
        plane = cq.Plane(origin=axis_pt, xDir=(0, 1, 0), normal=direction)
    else:
        plane = cq.Plane(origin=axis_pt, xDir=(1, 0, 0), normal=direction)
    boss = cq.Workplane(plane).circle(boss_od / 2).extrude(boss_len)
    hole = cq.Workplane(plane).workplane(offset=-WALL - 2).circle(bore / 2).extrude(boss_len + WALL + 4)
    cuts = hole
    for k in range(grooves):
        g = (cq.Workplane(plane).workplane(offset=boss_len * (0.3 + 0.4 * k) - 1.0)
             .circle(SEAL_GROOVE_D / 2 + (bore - BORE) / 2).extrude(2.0))
        cuts = cuts.union(g)
    return boss, cuts


box = (cq.Workplane("XY").box(L, W, H, centered=(True, True, False))
       .edges("|Z").fillet(CORNER).edges("<Z").fillet(8))
inner = (cq.Workplane("XY", origin=(0, 0, WALL))
         .box(L - 2 * WALL, W - 2 * WALL, H, centered=(True, True, False))
         .edges("|Z").fillet(CORNER - WALL).edges("<Z").fillet(5))
flange = (cq.Workplane("XY", origin=(0, 0, H - FLANGE_T))
          .rect(L + 2 * FLANGE, W + 2 * FLANGE).extrude(FLANGE_T)
          .edges("|Z").fillet(CORNER + FLANGE))
dry_box = box.union(flange).cut(inner)

# face-seal O-ring groove: a closed rounded-rectangle track centred on the flange
G_OFF = 2.5   # groove centreline, mm outside the outer wall
groove_outer = (cq.Workplane("XY", origin=(0, 0, H - GROOVE_D))
                .rect(L + 2 * G_OFF + GROOVE_W, W + 2 * G_OFF + GROOVE_W).extrude(GROOVE_D + 1)
                .edges("|Z").fillet(CORNER + G_OFF + GROOVE_W / 2))
groove_inner = (cq.Workplane("XY", origin=(0, 0, H - GROOVE_D - 1))
                .rect(L + 2 * G_OFF - GROOVE_W, W + 2 * G_OFF - GROOVE_W).extrude(GROOVE_D + 3)
                .edges("|Z").fillet(CORNER + G_OFF - GROOVE_W / 2))
dry_box = dry_box.cut(groove_outer.cut(groove_inner))

# lid screws on the outer part of the flange, outside the groove
sx, sy = L / 2 + 8.0, W / 2 + 8.0
c = 20.0 / math.sqrt(2)            # corner screws on a 20 mm radius about the flange fillet centre
cx, cy = L / 2 - CORNER + c, W / 2 - CORNER + c
screw_pts = [(-cx, -cy), (cx, -cy), (cx, cy), (-cx, cy), (sx, 0), (-sx, 0)] + \
    [(x, s * sy) for x in (-L / 4, 0, L / 4) for s in (1, -1)]
pilot = (cq.Workplane("XY", origin=(0, 0, H - FLANGE_T + 0.5)).pushPoints(screw_pts)
         .circle(SCREW_PILOT / 2).extrude(FLANGE_T))
dry_box = dry_box.cut(pilot)

# shaft glands: left/right fins, rear tail shaft
for side in (1, -1):
    boss, cuts = radial_gland((FIN_AXIS_X, side * W / 2 - side * 0.5, FIN_AXIS_Z), (0, side, 0), 10.0, 16.0, BORE)
    dry_box = dry_box.union(boss).cut(cuts)
boss, cuts = radial_gland((-L / 2 + 0.5, 0, TAIL_AXIS_Z), (-1, 0, 0), 10.0, 18.0, TAIL_SHAFT_BORE)
dry_box = dry_box.union(boss).cut(cuts)

# Arduino Nano standoffs (holes 43.2 x 15.2 mm)
nano_cx = -12.0
nano_pts = [(nano_cx + dx, dy) for dx in (-21.6, 21.6) for dy in (-7.6, 7.6)]
stand = (cq.Workplane("XY", origin=(0, 0, WALL - 0.5)).pushPoints(nano_pts).circle(3.0).extrude(6.5))
stand_h = (cq.Workplane("XY", origin=(0, 0, WALL + 1)).pushPoints(nano_pts).circle(1.1).extrude(6))
dry_box = dry_box.union(stand).cut(stand_h)

# SG90 servo brackets: output shaft coaxial with each fin shaft
SG = dict(body_l=22.8, body_w=12.6, hole_sp=27.5, shaft_off=5.4)
for side in (1, -1):
    y_plate = side * (W / 2 - WALL - 18.0)
    plate = (cq.Workplane("XY").box(42, 3.0, FIN_AXIS_Z + 12 - WALL, centered=(True, True, False))
             .translate((FIN_AXIS_X - SG["shaft_off"], y_plate, WALL - 0.5)))
    cut = (cq.Workplane("XY").box(SG["body_l"], 6, SG["body_w"])
           .translate((FIN_AXIS_X - SG["shaft_off"], y_plate, FIN_AXIS_Z)))
    holes = (cq.Workplane("XZ", origin=(0, y_plate + 3, 0))
             .pushPoints([(FIN_AXIS_X - SG["shaft_off"] - SG["hole_sp"] / 2, FIN_AXIS_Z),
                          (FIN_AXIS_X - SG["shaft_off"] + SG["hole_sp"] / 2, FIN_AXIS_Z)])
             .circle(0.9).extrude(6))
    dry_box = dry_box.union(plate.cut(cut)).cut(holes)

# N20 gear-motor saddle for the tail crank, on the tail shaft axis
saddle = (cq.Workplane("XY").box(16, 18, TAIL_AXIS_Z + 1 - WALL + 0.5, centered=(True, True, False))
          .translate((-L / 2 + WALL + 22, 0, WALL - 0.5)))
slot = cq.Workplane("XY").box(20, 12.3, 12).translate((-L / 2 + WALL + 22, 0, TAIL_AXIS_Z))
tie = cq.Workplane("XY").box(4, 30, 3).translate((-L / 2 + WALL + 22, 0, TAIL_AXIS_Z - 8))
dry_box = dry_box.union(saddle).cut(slot).cut(tie)

# ---------------- lid ----------------
lid = (cq.Workplane("XY", origin=(0, 0, H)).rect(L + 2 * FLANGE, W + 2 * FLANGE).extrude(LID_T)
       .edges("|Z").fillet(CORNER + FLANGE).faces(">Z").edges().fillet(1.5))
lid = lid.cut(cq.Workplane("XY", origin=(0, 0, H - 1)).pushPoints(screw_pts)
              .circle(SCREW_CLEAR / 2).extrude(LID_T + 2))
lid = lid.cut(cq.Workplane("XY", origin=(0, 0, H + LID_T - 2.0)).pushPoints(screw_pts)
              .circle(3.1).extrude(3))                     # counterbore for M3 heads
boss, cuts = radial_gland((RUDDER_AXIS_X, 0, H + LID_T - 0.5), (0, 0, 1), 12.0, 16.0, BORE)
lid = lid.union(boss).cut(cuts)
# rudder servo mounting bosses under the lid
lid = lid.union(cq.Workplane("XY", origin=(0, 0, H - 8))
                .pushPoints([(RUDDER_AXIS_X - SG["shaft_off"] - SG["hole_sp"] / 2, 0),
                             (RUDDER_AXIS_X - SG["shaft_off"] + SG["hole_sp"] / 2, 0)])
                .circle(3).extrude(8.5))
lid = lid.cut(cq.Workplane("XY", origin=(0, 0, H - 9))
              .pushPoints([(RUDDER_AXIS_X - SG["shaft_off"] - SG["hole_sp"] / 2, 0),
                           (RUDDER_AXIS_X - SG["shaft_off"] + SG["hole_sp"] / 2, 0)])
              .circle(0.9).extrude(8))

# ---------------- export ----------------
parts = {
    "dry_box": dry_box,
    "dry_box_lid": lid,
    "pectoral_fin_left": fin_left,
    "pectoral_fin_right": fin_right,
    "rudder": rudder,
}
for name, p in parts.items():
    cq.exporters.export(p, f"{OUT}/{name}.step")
    fine = name != "dry_box" and name != "dry_box_lid"
    cq.exporters.export(p, f"{OUT}/{name}.stl", tolerance=0.01 if fine else 0.05, angularTolerance=0.05 if fine else 0.15)
    bb = p.val().BoundingBox()
    print(f"{name:20s} {bb.xlen:6.1f} x {bb.ylen:6.1f} x {bb.zlen:6.1f} mm  vol {p.val().Volume()/1000:7.1f} cm3  valid={p.val().isValid()}")

# placed copies for the assembly preview
gap = 10.0 + 6
assy = cq.Assembly()
assy.add(dry_box, name="dry_box", color=cq.Color(0.85, 0.85, 0.82))
assy.add(lid, name="lid", color=cq.Color(0.85, 0.85, 0.82))
assy.add(fin_left, name="fin_L", loc=cq.Location((FIN_AXIS_X, W / 2 + gap, FIN_AXIS_Z)), color=cq.Color(0.95, 0.6, 0.1))
assy.add(fin_right, name="fin_R", loc=cq.Location((FIN_AXIS_X, -W / 2 - gap, FIN_AXIS_Z)), color=cq.Color(0.95, 0.6, 0.1))
assy.add(rudder, name="rudder", loc=cq.Location((RUDDER_AXIS_X, 0, H + LID_T + 12 + 2)), color=cq.Color(0.95, 0.6, 0.1))
assy.save(f"{OUT}/fish_addons_assembly.step")
cq.exporters.export(assy.toCompound(), f"{OUT}/fish_addons_assembly.stl", tolerance=0.05, angularTolerance=0.15)
print("assembly saved")

# section views for the renders (not delivered)
os.makedirs(f"{OUT}/_render", exist_ok=True)
half_box = dry_box.cut(cq.Workplane("XY").box(400, 400, 400).translate((FIN_AXIS_X + 200, 0, 0)))
half_lid = lid.cut(cq.Workplane("XY").box(400, 400, 400).translate((0, -200, 0)))
cq.exporters.export(half_box, f"{OUT}/_render/dry_box_section.stl", tolerance=0.03, angularTolerance=0.1)
cq.exporters.export(half_lid, f"{OUT}/_render/lid_section.stl", tolerance=0.03, angularTolerance=0.1)
print("sections saved")
