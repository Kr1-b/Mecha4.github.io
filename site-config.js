/* =========================================================
   SITE CONFIG — edit this file to change the site's content.
   ========================================================= */

window.SITE = {
  name: "Mecha4",
  tagline: "A 3D-printed robotic fish. A crank flaps the tail, two fins pitch it up and down, and a rudder on top steers.",
  course: "MEC 482 Mechatronics",
  school: "Abu Dhabi University",
  term: "Fall 2026",
  instructor: "Dr. Claudio Vignola",
  repo: "https://github.com/Kr1-b/Mecha4.guthub.io",

  team: [
    { name: "Basil Ahmed", role: "Mechanical design and waterproofing" },
    { name: "Teammate name", role: "Electronics and Arduino code" },
    { name: "Teammate name", role: "Simulation and testing" }
  ],

  /* Parts shown on the Design page. Images live in . */
  parts: [
    {
      id: "assembly",
      title: "Full assembly",
      image: "assembly-exploded.png",
      alt: "Exploded view of the dry box, lid, two pectoral fins and the rudder",
      text: "The dry box sits inside the fish body and holds every electrical part. The fins and rudder sit outside on 3 mm shafts that pass through sealed glands.",
      specs: [["Box outside", "150 × 80 × 70 mm"], ["Flange", "12 mm, 10 × M3 screws"], ["Shafts", "3 mm steel, D-flat"]],
      file: "fish_addons_assembly.step"
    },
    {
      id: "fin",
      title: "Pectoral fin",
      image: "pectoral-fin.png",
      alt: "Tapered pectoral fin with a NACA 0012 airfoil section and a shaft hub",
      text: "One on each side. Both servos tilt the fins together: leading edge up and the fish rises, leading edge down and it dives. Tilting them opposite ways rolls the fish.",
      specs: [["Section", "NACA 0012"], ["Root / tip chord", "55 / 28 mm"], ["Span", "75 mm, 18 mm sweep"], ["Pivot", "30% of root chord"], ["Hub", "3 mm D-bore, M3 set screw"]],
      file: "pectoral_fin_left.step"
    },
    {
      id: "rudder",
      title: "Rudder",
      image: "rudder.png",
      alt: "Vertical swept rudder fin with a hub at its base",
      text: "Mounted on top of the fish on a vertical shaft. Turning it left or right yaws the fish while the tail pushes it forward.",
      specs: [["Section", "NACA 0012"], ["Root / tip chord", "60 / 30 mm"], ["Height", "60 mm, 22 mm sweep"], ["Pivot", "25% of root chord"], ["Hub", "3 mm D-bore, M3 set screw"]],
      file: "rudder.step"
    },
    {
      id: "box",
      title: "Dry box",
      image: "dry-box.png",
      alt: "Open dry box showing the O-ring groove on the flange and internal servo brackets",
      text: "Holds the Arduino Nano, two SG90 fin servos and the N20 tail motor. A groove in the flange takes a 2 mm O-ring cord that seals against the lid.",
      specs: [["Wall", "3.5 mm"], ["O-ring groove", "2.6 wide × 1.5 deep"], ["Inside", "Nano standoffs, 2 SG90 brackets, N20 saddle"], ["Glands", "Left, right, rear"]],
      file: "dry_box.step"
    },
    {
      id: "lid",
      title: "Lid",
      image: "lid.png",
      alt: "Flat lid with counterbored screw holes and the rudder shaft gland",
      text: "Flat 5 mm lid with counterbored M3 holes. The rudder shaft gland is on top and the rudder servo hangs from two bosses underneath.",
      specs: [["Thickness", "5 mm"], ["Screws", "10 × M3 into heat-set inserts"], ["Rudder gland", "2 internal O-rings"]],
      file: "dry_box_lid.step"
    }
  ],

  /* Electronics chain on the Design page. */
  system: [
    { id: "battery", title: "Battery", part: "2S LiPo, 7.4 V", text: "Powers everything. A 5 V buck converter feeds the servos so they don't brown out the Arduino." },
    { id: "arduino", title: "Arduino Nano", part: "Sealed in the dry box", text: "Runs the swim pattern: sets tail motor speed through the driver and sends PWM to the three servos." },
    { id: "fins", title: "Fin servos", part: "2 × SG90", text: "One per pectoral fin, on shafts through the side glands. Same angle on both to pitch, opposite angles to roll." },
    { id: "rudder", title: "Rudder servo", part: "SG90 under the lid", text: "Turns the rudder shaft through the top gland to steer left or right." },
    { id: "tail", title: "Tail drive", part: "N20 motor + crank", text: "A motor driver (e.g. DRV8833) spins the N20, which turns your crank and flaps the tail. Faster crank, faster fish." }
  ],

  /* Project files. Put files in /files and add a line here.
     type: "cad", "print", "code", "report", "data", "media" */
  files: [
    { name: "Full add-on assembly", file: "fish_addons_assembly.step", type: "cad", size: "1.4 MB", note: "All parts placed, exploded" },
    { name: "Dry box", file: "dry_box.step", type: "cad", size: "490 KB", note: "Sealed electronics hull" },
    { name: "Dry box lid", file: "dry_box_lid.step", type: "cad", size: "330 KB", note: "With rudder gland" },
    { name: "Pectoral fin, left", file: "pectoral_fin_left.step", type: "cad", size: "180 KB" },
    { name: "Pectoral fin, right", file: "pectoral_fin_right.step", type: "cad", size: "180 KB" },
    { name: "Rudder", file: "rudder.step", type: "cad", size: "210 KB" },
    { name: "Dry box (print)", file: "dry_box.stl", type: "print", size: "1.1 MB" },
    { name: "Dry box lid (print)", file: "dry_box_lid.stl", type: "print", size: "940 KB" },
    { name: "Pectoral fin, left (print)", file: "pectoral_fin_left.stl", type: "print", size: "6.5 MB" },
    { name: "Pectoral fin, right (print)", file: "pectoral_fin_right.stl", type: "print", size: "6.5 MB" },
    { name: "Rudder (print)", file: "rudder.stl", type: "print", size: "5.5 MB" },
    { name: "Parametric part source (CadQuery)", file: "fish_parts.py", type: "code", size: "13 KB", note: "Change any dimension and regenerate the STEP files" }
  ]
};
