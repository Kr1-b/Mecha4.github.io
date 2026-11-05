/* Mecha4 site behaviour: config text, nav, swim simulator (home),
   part viewer + electronics chain (design), seal and buoyancy calculators
   (waterproofing), file list (files). Each block runs only if its page has it. */

(function () {
  const SITE = window.SITE || {};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const DEG = Math.PI / 180;

  /* ---------- config text + nav ---------- */
  document.querySelectorAll("[data-config]").forEach((el) => { const v = SITE[el.dataset.config]; if (v) el.textContent = v; });
  document.querySelectorAll("[data-config-href]").forEach((el) => { const v = SITE[el.dataset.configHref]; if (v) el.href = v; });
  if (SITE.name) document.title = document.title.replace("Mecha4", SITE.name);

  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => { if (a.getAttribute("href") === page) a.setAttribute("aria-current", "page"); });
  const toggle = document.querySelector(".nav-toggle"), links = document.querySelector(".nav-links");
  if (toggle && links) toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close" : "Menu";
  });

  function fit(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  /* =====================================================
     HOME: swim simulator
     ===================================================== */
  const tank = $("tank");
  if (tank) {
    const side = $("side");
    const ui = {
      rpm: $("in-rpm"), fin: $("in-fin"), rud: $("in-rud"),
      rpmOut: $("out-rpm"), finOut: $("out-fin"), rudOut: $("out-rud"),
      speed: $("r-speed"), heading: $("r-heading"), depth: $("r-depth"), beat: $("r-beat"),
      ballast: $("in-ballast")
    };
    const COL = { flare: "#f59a24", sea: "#6fd3e6", body: "#dfe8ea", ink: "#0b2230", grid: "rgba(140,200,220,0.09)", text: "rgba(190,220,228,0.75)" };
    const TANK_W = 4, TANK_H = 2.5, MAX_DEPTH = 1.2;     // metres
    const KT = 0.06, KD = 2.4, MASS = 0.6, TURN = 3.6;  // tuned for ~0.4 m/s at 150 rpm
    let s;
    function reset() {
      s = { x: 0.8, y: TANK_H / 2, th: 0, z: 0.5, v: 0, phase: 0, tail: 0, trail: [], trailT: 0 };
    }
    reset();
    if (reduceMotion) ui.rpm.value = 0;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const nudge = (el, d) => { el.value = clamp(+el.value + d, +el.min, +el.max); el.dispatchEvent(new Event("input")); };
    tank.addEventListener("keydown", (e) => {
      const map = { ArrowLeft: [ui.rud, -5], ArrowRight: [ui.rud, 5], ArrowUp: [ui.fin, 5], ArrowDown: [ui.fin, -5], w: [ui.rpm, 10], s: [ui.rpm, -10], W: [ui.rpm, 10], S: [ui.rpm, -10] };
      if (map[e.key]) { e.preventDefault(); nudge(...map[e.key]); }
      if (e.key === " ") { e.preventDefault(); ui.rpm.value = 0; ui.rpm.dispatchEvent(new Event("input")); }
      if (e.key === "0") { ui.rud.value = 0; ui.fin.value = 0; ui.rud.dispatchEvent(new Event("input")); }
    });
    $("btn-reset").addEventListener("click", () => { reset(); ui.fin.value = 0; ui.rud.value = 0; showInputs(); });
    $("btn-center").addEventListener("click", () => { ui.fin.value = 0; ui.rud.value = 0; showInputs(); });
    function showInputs() {
      ui.rpmOut.textContent = ui.rpm.value + " rpm";
      ui.finOut.textContent = (+ui.fin.value > 0 ? "+" : "") + ui.fin.value + "°";
      ui.rudOut.textContent = (+ui.rud.value > 0 ? "+" : "") + ui.rud.value + "°";
    }
    [ui.rpm, ui.fin, ui.rud].forEach((el) => el.addEventListener("input", showInputs));
    showInputs();

    function step(dt) {
      const f = +ui.rpm.value / 60;                    // tail beats per second = crank rev/s
      const fin = +ui.fin.value * DEG, rud = +ui.rud.value * DEG;
      const drag = KD * (1 + 0.5 * Math.abs(Math.sin(rud)) + 0.4 * Math.abs(Math.sin(fin)));
      s.v += ((KT * f * f - drag * s.v * Math.abs(s.v)) / MASS) * dt;
      s.v = Math.max(0, s.v);
      s.th += TURN * s.v * Math.sin(rud) * dt;
      const buoy = ui.ballast.checked ? 0 : 0.03;      // untrimmed fish drifts up
      s.z = clamp(s.z + (-s.v * Math.sin(fin) * 1.4 - buoy) * dt, 0, MAX_DEPTH);
      s.phase += 2 * Math.PI * f * dt;
      s.tail += ((f > 0.05 ? 1 : 0) - s.tail) * Math.min(1, dt * 3);
      s.x += s.v * Math.cos(s.th) * dt;
      s.y += s.v * Math.sin(s.th) * dt;
      const m = 0.18;
      if (s.x < m || s.x > TANK_W - m || s.y < m || s.y > TANK_H - m) {
        s.x = clamp(s.x, m, TANK_W - m); s.y = clamp(s.y, m, TANK_H - m); s.v *= 0.9;
      }
      s.trailT += dt;
      if (s.trailT > 0.08 && s.v > 0.02) { s.trailT = 0; s.trail.push([s.x, s.y, s.z]); if (s.trail.length > 140) s.trail.shift(); }
    }

    /* fish from above, local units in metres, +x = nose */
    function drawTop(ctx, sc, depth) {
      const fin = +ui.fin.value * DEG, rud = +ui.rud.value * DEG;
      const tailA = 0.45 * Math.sin(s.phase) * s.tail;
      const k = sc * 1.5 * (1.12 - depth * 0.18);       // drawn 1.5x for visibility; nearer the surface looks bigger
      ctx.save();
      ctx.scale(k, k);
      ctx.lineWidth = 1.5 / k;
      // tail: hinged behind the body, flapping side to side
      ctx.save();
      ctx.translate(-0.15, 0); ctx.rotate(tailA);
      ctx.beginPath(); ctx.moveTo(0, -0.012); ctx.lineTo(-0.10, -0.055); ctx.lineTo(-0.10, 0.055); ctx.lineTo(0, 0.012); ctx.closePath();
      ctx.fillStyle = "#c9d6da"; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.stroke();
      ctx.restore();
      // pectoral fins, foreshortened by their pitch angle
      const span = 0.075 * Math.max(0.25, Math.cos(fin));
      [1, -1].forEach((sd) => {
        ctx.beginPath();
        ctx.moveTo(0.085, sd * 0.05); ctx.lineTo(0.085 - 0.02, sd * (0.05 + span)); ctx.lineTo(0.085 - 0.045, sd * (0.05 + span * 0.9)); ctx.lineTo(0.03, sd * 0.05); ctx.closePath();
        ctx.fillStyle = COL.flare; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.stroke();
      });
      // body
      ctx.beginPath();
      ctx.moveTo(0.21, 0);
      ctx.bezierCurveTo(0.19, 0.05, 0.08, 0.068, 0.0, 0.062);
      ctx.bezierCurveTo(-0.08, 0.055, -0.13, 0.025, -0.15, 0.013);
      ctx.lineTo(-0.15, -0.013);
      ctx.bezierCurveTo(-0.13, -0.025, -0.08, -0.055, 0.0, -0.062);
      ctx.bezierCurveTo(0.08, -0.068, 0.19, -0.05, 0.21, 0);
      ctx.fillStyle = COL.body; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.stroke();
      // dry box outline seen through the shell
      ctx.strokeStyle = "rgba(11,34,48,0.35)"; ctx.setLineDash([0.008, 0.006]);
      ctx.strokeRect(-0.075, -0.04, 0.15, 0.08); ctx.setLineDash([]);
      // eye
      ctx.fillStyle = COL.ink; [1, -1].forEach((sd) => { ctx.beginPath(); ctx.arc(0.16, sd * 0.03, 0.007, 0, Math.PI * 2); ctx.fill(); });
      // rudder on top, rotated by its angle
      ctx.save(); ctx.translate(-0.02, 0); ctx.rotate(-rud);
      ctx.lineCap = "round"; ctx.lineWidth = 0.012; ctx.strokeStyle = COL.flare;
      ctx.beginPath(); ctx.moveTo(0.015, 0); ctx.lineTo(-0.045, 0); ctx.stroke();
      ctx.restore();
      ctx.restore();
    }

    function drawSide(ctx, w, h) {
      const padL = 34, padR = 10, top = 14, bot = 14;
      const sx = (w - padL - padR) / TANK_W, sz = (h - top - bot) / MAX_DEPTH;
      // water column
      const g = ctx.createLinearGradient(0, top, 0, h - bot);
      g.addColorStop(0, "#0f3a50"); g.addColorStop(1, "#05151d");
      ctx.fillStyle = g; ctx.fillRect(padL, top, w - padL - padR, h - top - bot);
      // depth ticks
      ctx.fillStyle = COL.text; ctx.font = "11px Archivo, system-ui, sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
      for (let d = 0; d <= MAX_DEPTH + 1e-6; d += 0.4) {
        const y = top + d * sz;
        ctx.fillText(d.toFixed(1) + " m", padL - 4, y);
        ctx.beginPath(); ctx.moveTo(padL, Math.round(y) + 0.5); ctx.lineTo(w - padR, Math.round(y) + 0.5); ctx.stroke();
      }
      // surface
      ctx.strokeStyle = COL.sea; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = padL; x <= w - padR; x += 4) {
        const y = top + Math.sin(x * 0.06 + performance.now() * 0.002 * (reduceMotion ? 0 : 1)) * 1.5;
        x === padL ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      // fish side profile
      const fin = +ui.fin.value * DEG;
      const pitch = fin * 0.6 * Math.min(1, s.v / 0.15);
      const facing = Math.cos(s.th) >= 0 ? 1 : -1;
      const k = Math.min(sx, sz * 2.2) * 0.9;
      ctx.save();
      ctx.translate(padL + s.x * sx, top + s.z * sz);
      ctx.scale(facing, 1); ctx.rotate(-pitch);
      ctx.scale(k, k); ctx.lineWidth = 1.4 / k; ctx.strokeStyle = COL.ink;
      // rudder (height shrinks as it turns away from view)
      const rud = +ui.rud.value * DEG;
      ctx.beginPath(); ctx.moveTo(0.01, -0.05); ctx.lineTo(-0.012, -0.05 - 0.06 * Math.max(0.3, Math.cos(rud))); ctx.lineTo(-0.04, -0.05 - 0.06 * Math.max(0.3, Math.cos(rud))); ctx.lineTo(-0.05, -0.05); ctx.closePath();
      ctx.fillStyle = COL.flare; ctx.fill(); ctx.stroke();
      // tail
      ctx.beginPath(); ctx.moveTo(-0.15, -0.012); ctx.lineTo(-0.25, -0.06); ctx.lineTo(-0.25, 0.06); ctx.lineTo(-0.15, 0.012); ctx.closePath();
      ctx.fillStyle = "#c9d6da"; ctx.fill(); ctx.stroke();
      // body
      ctx.beginPath(); ctx.moveTo(0.21, 0);
      ctx.bezierCurveTo(0.19, -0.045, 0.08, -0.058, 0, -0.055); ctx.bezierCurveTo(-0.08, -0.05, -0.13, -0.022, -0.15, -0.012);
      ctx.lineTo(-0.15, 0.012); ctx.bezierCurveTo(-0.13, 0.022, -0.08, 0.05, 0, 0.055); ctx.bezierCurveTo(0.08, 0.058, 0.19, 0.045, 0.21, 0);
      ctx.fillStyle = COL.body; ctx.fill(); ctx.stroke();
      // pectoral fin, tilted by its angle
      ctx.save(); ctx.translate(0.06, 0.012); ctx.rotate(-fin);
      ctx.lineWidth = 0.013; ctx.lineCap = "round"; ctx.strokeStyle = COL.flare;
      ctx.beginPath(); ctx.moveTo(0.017, 0); ctx.lineTo(-0.04, 0); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(0.16, -0.012, 0.007, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    let last = performance.now(), visible = true;
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) { last = performance.now(); requestAnimationFrame(frame); } }).observe(tank);

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      step(dt);
      // top view
      const { ctx, w, h } = fit(tank);
      const sc = Math.min(w / TANK_W, h / TANK_H);
      const ox = (w - TANK_W * sc) / 2, oy = (h - TANK_H * sc) / 2;
      const depthShade = ctx.createLinearGradient(0, 0, 0, h);
      depthShade.addColorStop(0, "#0d3446"); depthShade.addColorStop(1, "#082431");
      ctx.fillStyle = depthShade; ctx.fillRect(ox, oy, TANK_W * sc, TANK_H * sc);
      ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; ctx.beginPath();
      for (let gx = 0; gx <= TANK_W + 1e-6; gx += 0.5) { const x = Math.round(ox + gx * sc) + 0.5; ctx.moveTo(x, oy); ctx.lineTo(x, oy + TANK_H * sc); }
      for (let gy = 0; gy <= TANK_H + 1e-6; gy += 0.5) { const y = Math.round(oy + gy * sc) + 0.5; ctx.moveTo(ox, y); ctx.lineTo(ox + TANK_W * sc, y); }
      ctx.stroke();
      ctx.strokeStyle = "rgba(111,211,230,0.5)"; ctx.lineWidth = 2; ctx.strokeRect(ox + 1, oy + 1, TANK_W * sc - 2, TANK_H * sc - 2);
      ctx.fillStyle = COL.text; ctx.font = "11px Archivo, system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("4 m × 2.5 m test pool, 0.5 m grid", ox + 8, oy + 7);
      // wake
      s.trail.forEach(([tx, ty], i) => {
        const a = (i / s.trail.length) * 0.5;
        ctx.fillStyle = `rgba(111,211,230,${a})`;
        ctx.beginPath(); ctx.arc(ox + tx * sc, oy + ty * sc, 1.6 + (i / s.trail.length) * 1.4, 0, Math.PI * 2); ctx.fill();
      });
      const wobble = 0.05 * Math.sin(s.phase) * s.tail;
      // shadow on the pool floor, offset more when the fish is shallow
      ctx.save();
      ctx.translate(ox + s.x * sc + 6 + (MAX_DEPTH - s.z) * 10, oy + s.y * sc + 8 + (MAX_DEPTH - s.z) * 12);
      ctx.rotate(s.th + wobble); ctx.globalAlpha = 0.28; ctx.filter = "blur(3px)";
      ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(0, 0, 0.28 * sc, 0.09 * sc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(ox + s.x * sc, oy + s.y * sc); ctx.rotate(s.th + wobble);
      drawTop(ctx, sc, s.z);
      ctx.restore();

      const sv = fit(side);
      drawSide(sv.ctx, sv.w, sv.h);

      ui.speed.textContent = s.v.toFixed(2) + " m/s";
      let hd = ((-s.th / DEG) % 360 + 360) % 360;
      ui.heading.textContent = hd.toFixed(0) + "°";
      ui.depth.textContent = s.z.toFixed(2) + " m";
      ui.beat.textContent = (+ui.rpm.value / 60).toFixed(2) + " Hz";
      ui.depth.parentElement.classList.toggle("warn", s.z <= 0.001 || s.z >= MAX_DEPTH - 0.001);
      if (visible) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* =====================================================
     DESIGN: part viewer, electronics chain, team
     ===================================================== */
  const tabs = $("part-tabs");
  if (tabs && SITE.parts) {
    const img = $("part-img"), title = $("part-title"), text = $("part-text"), specs = $("part-specs"), dl = $("part-dl");
    SITE.parts.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.role = "tab"; b.textContent = p.title; b.id = "tab-" + p.id;
      b.setAttribute("aria-controls", "part-panel");
      b.addEventListener("click", () => show(i));
      b.addEventListener("keydown", (e) => {
        const n = SITE.parts.length;
        if (e.key === "ArrowRight") { e.preventDefault(); show((i + 1) % n, true); }
        if (e.key === "ArrowLeft") { e.preventDefault(); show((i - 1 + n) % n, true); }
      });
      tabs.appendChild(b);
      new Image().src = p.image;   // preload
    });
    function show(i, focus) {
      const p = SITE.parts[i];
      tabs.querySelectorAll("button").forEach((b, j) => { b.setAttribute("aria-selected", String(i === j)); b.tabIndex = i === j ? 0 : -1; if (i === j && focus) b.focus(); });
      img.src = p.image; img.alt = p.alt;
      title.textContent = p.title; text.textContent = p.text;
      specs.innerHTML = "";
      p.specs.forEach(([k, v]) => { const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = k; dd.textContent = v; specs.append(dt, dd); });
      dl.href = p.file; dl.textContent = "Download " + p.title.toLowerCase() + " (STEP)";
    }
    show(0);
  }

  const chain = $("chain");
  if (chain && SITE.system) {
    const detail = $("chain-detail");
    SITE.system.forEach((b, idx) => {
      const li = document.createElement("li"), btn = document.createElement("button");
      btn.className = "block"; btn.type = "button"; btn.role = "tab";
      btn.innerHTML = "<strong></strong><small></small>";
      btn.querySelector("strong").textContent = b.title; btn.querySelector("small").textContent = b.part;
      btn.addEventListener("click", () => select(idx));
      li.appendChild(btn); chain.appendChild(li);
    });
    function select(i) {
      chain.querySelectorAll(".block").forEach((el, j) => el.setAttribute("aria-selected", String(i === j)));
      detail.innerHTML = "<h3></h3><p></p>";
      detail.querySelector("h3").textContent = SITE.system[i].title;
      detail.querySelector("p").textContent = SITE.system[i].text;
    }
    select(1);
  }

  const team = $("team");
  if (team && SITE.team) SITE.team.forEach((m) => {
    const li = document.createElement("li");
    li.innerHTML = "<strong></strong><span></span>";
    li.querySelector("strong").textContent = m.name; li.querySelector("span").textContent = m.role;
    team.appendChild(li);
  });

  /* =====================================================
     WATERPROOFING: O-ring squeeze + buoyancy
     ===================================================== */
  const oring = $("oring");
  if (oring) {
    const d = $("o-d"), h = $("o-h"), b = $("o-b"), type = $("o-type");
    const presets = { face: [2.0, 1.5, 2.6, "static"], shaft: [1.5, 1.25, 2.0, "dynamic"] };
    document.querySelectorAll("[data-preset]").forEach((btn) => btn.addEventListener("click", () => {
      const [pd, ph, pb, pt] = presets[btn.dataset.preset];
      d.value = pd; h.value = ph; b.value = pb; type.value = pt; calc();
    }));
    [d, h, b, type].forEach((el) => el.addEventListener("input", calc));
    function calc() {
      const D = +d.value, Hh = +h.value, B = +b.value, dyn = type.value === "dynamic";
      const squeeze = Math.round(((D - Hh) / D) * 1000) / 1000;
      const fill = (Math.PI * D * D / 4) / (B * Hh);
      const [lo, hi] = dyn ? [0.08, 0.2] : [0.15, 0.3];
      $("o-squeeze").textContent = (squeeze * 100).toFixed(0) + "%";
      $("o-fill").textContent = (fill * 100).toFixed(0) + "%";
      $("o-target").textContent = `${lo * 100}–${hi * 100}%`;
      const okS = squeeze >= lo && squeeze <= hi, okF = fill <= 0.9;
      $("o-squeeze").parentElement.className = okS ? "good" : "warn";
      $("o-fill").parentElement.className = okF ? "good" : "warn";
      let msg;
      if (squeeze <= 0) msg = "No squeeze: the groove is deeper than the cord, so the ring never touches the lid. This will leak.";
      else if (squeeze < lo) msg = "Too little squeeze. Make the groove shallower or use a thicker cord.";
      else if (squeeze > hi) msg = dyn ? "Too much squeeze for a moving shaft: high friction and the servo may stall. Deepen the groove." : "Too much squeeze: the lid will be hard to close and the ring can be cut. Deepen the groove.";
      else if (!okF) msg = "Squeeze is fine but the groove is too narrow for the squashed ring. Widen it.";
      else msg = dyn ? "Good for a slow-moving shaft. Grease the O-rings with silicone grease." : "Good static seal. Tighten the lid screws evenly in a cross pattern.";
      $("o-verdict").textContent = msg;
      drawGroove(D, Hh, B, squeeze, okF);
    }
    function drawGroove(D, Hh, B, squeeze, okF) {
      const svg = $("o-svg"), S = 60, cx = 210, top = 40;
      const gw = B * S, gh = Hh * S;
      let ry, rx, cy;
      if (squeeze > 0) { ry = gh / 2; rx = (D * S) * (D * S) / (4 * ry); if (okF) rx = Math.min(rx, gw / 2 - 1); cy = top + gh / 2; }
      else { ry = rx = D * S / 2; cy = top + gh - ry; }
      svg.innerHTML = `
        <rect x="20" y="${top - 26}" width="380" height="26" fill="#2a5a70"/>
        <text x="30" y="${top - 9}" fill="#cfe3e8" font-size="13">Lid</text>
        <path d="M20 ${top} H${cx - gw / 2} V${top + gh} H${cx + gw / 2} V${top} H400 V${top + gh + 50} H20 Z" fill="#3d6f84"/>
        <text x="30" y="${top + gh + 34}" fill="#cfe3e8" font-size="13">Box flange</text>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${squeeze <= 0 ? "#ff8f6b" : okF ? "#f59a24" : "#ff8f6b"}" stroke="#061b25" stroke-width="1.5"/>
        <line x1="${cx - gw / 2}" y1="${top + gh + 12}" x2="${cx + gw / 2}" y2="${top + gh + 12}" stroke="#cfe3e8"/>
        <text x="${cx}" y="${top + gh + 26}" fill="#cfe3e8" font-size="12" text-anchor="middle">${B.toFixed(1)} mm wide</text>
        <text x="${cx + gw / 2 + 8}" y="${top + gh / 2 + 4}" fill="#cfe3e8" font-size="12">${Hh.toFixed(1)} mm deep</text>`;
    }
    calc();
  }

  const buoy = $("buoy");
  if (buoy) {
    const ins = ["b-vol", "b-print", "b-elec", "b-other"].map($);
    const water = $("b-water");
    [...ins, water].forEach((el) => el.addEventListener("input", calc));
    function calc() {
      const [V, mp, me, mo] = ins.map((el) => Math.max(0, +el.value || 0));
      const rho = +water.value;
      const lift = V * rho, mass = mp + me + mo, net = lift - mass;
      $("b-lift").textContent = lift.toFixed(0) + " g";
      $("b-mass").textContent = mass.toFixed(0) + " g";
      $("b-net").textContent = (net > 0 ? "+" : "") + net.toFixed(0) + " g";
      const ballast = net - 8;   // aim to stay ~8 g positive so a dead fish floats back up
      let msg;
      if (net > 15) msg = `It floats. Add about ${ballast.toFixed(0)} g of ballast (steel nuts or lead) low and slightly forward of the middle, so the fish sits level and just barely floats.`;
      else if (net >= 0) msg = "Nearly neutral and slightly positive. This is the target: the fins can drive it down, and it floats back up if the battery dies.";
      else msg = `It sinks by ${(-net).toFixed(0)} g. Add foam or trapped air volume, or lighten the prints (lower infill away from the seals).`;
      $("b-verdict").textContent = msg;
      $("b-net").parentElement.className = net >= 0 && net <= 15 ? "good" : "warn";
    }
    calc();
  }

  /* =====================================================
     FILES
     ===================================================== */
  const fileList = $("file-list");
  if (fileList) {
    const files = SITE.files || [];
    const filters = $("filters"), empty = $("files-empty");
    const names = { all: "All", cad: "CAD (STEP)", print: "3D print (STL)", code: "Code", report: "Reports", data: "Data", media: "Media" };
    const short = { cad: "STEP", print: "STL", code: "Code", report: "Report", data: "Data", media: "Media" };
    if (!files.length) { empty.hidden = false; filters.hidden = true; }
    else {
      ["all", ...new Set(files.map((f) => f.type))].forEach((t) => {
        const b = document.createElement("button");
        b.type = "button"; b.dataset.type = t;
        b.textContent = `${names[t] || t} (${t === "all" ? files.length : files.filter((f) => f.type === t).length})`;
        b.addEventListener("click", () => render(t));
        filters.appendChild(b);
      });
      render("all");
    }
    function render(type) {
      filters.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === type)));
      fileList.innerHTML = "";
      files.filter((f) => type === "all" || f.type === type).forEach((f) => {
        const li = document.createElement("li");
        li.innerHTML = '<span class="file-type"></span><span class="fname"></span><span class="fnote"></span><a class="dl" download>Download</a>';
        li.querySelector(".file-type").textContent = short[f.type] || f.type;
        li.querySelector(".fname").textContent = f.name;
        li.querySelector(".fnote").textContent = [f.note, f.size].filter(Boolean).join(", ");
        const a = li.querySelector(".dl"); a.href = f.file; a.setAttribute("aria-label", "Download " + f.name);
        fileList.appendChild(li);
      });
    }
  }
})();
