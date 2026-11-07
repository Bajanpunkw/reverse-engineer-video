// Scenes of "AI builder edition" in the Simply Animated style. World in frame pixels: x ∈ [-540, 540], y ∈ [-960, 960] (up).
import * as THREE from 'three';
import { makeFigure, POSES, walker, blend, ease, mix, clamp01 } from './rig.js';

export const GROUND = -70, FH = 470;
const sx = x => 540 + x, sy = y => 960 - y;           // world → screen (for HTML captions)

function grad(stops, w = 4, h = 256, radial = false) {
  const c = document.createElement('canvas'); c.width = radial ? 256 : w; c.height = h; const x = c.getContext('2d');
  const g = radial ? x.createRadialGradient(128, 128, 0, 128, 128, 128) : x.createLinearGradient(0, 0, 0, h);
  for (const [p, col] of stops) g.addColorStop(p, col); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const spotTex = () => grad([[0, 'rgba(255,255,255,0.16)'], [0.5, 'rgba(255,255,255,0.05)'], [1, 'rgba(255,255,255,0)']], 0, 256, true);
function rockTex(seed) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) { const g = 90 + r() * 90 | 0; x.fillStyle = `rgba(${g},${g},${g},0.35)`; x.beginPath(); x.arc(r() * 256, r() * 256, 3 + r() * 16, 0, 7); x.fill(); }
  for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(40,40,40,0.45)'; x.beginPath(); x.arc(r() * 256, r() * 256, 2 + r() * 7, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function kit(root) {
  const plane = (w, h, mat, x, y, z = -50) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); root.add(m); return m; };
  const spot = (x, y, s, tex = spotTex()) => plane(s, s, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), x, y, -70);
  const floor = (top = GROUND) => {
    plane(1080, 520, new THREE.MeshBasicMaterial({ map: grad([[0, '#1f1f1f'], [0.13, '#1b1b1b'], [0.33, '#121212'], [0.52, '#0a0a0a'], [0.71, '#080808'], [0.9, '#040404'], [1, '#000']]) }), 0, top - 260, -60);
    plane(1080, 3, new THREE.MeshBasicMaterial({ color: 0x2e2e2e }), 0, top, -55);
  };
  return { plane, spot, floor };
}
function html(cls, txt, css) { const d = document.createElement('div'); d.className = cls; d.innerHTML = txt; Object.assign(d.style, css || {}); document.body.insertBefore(d, document.getElementById('wm')); return d; }
const label = (txt, x, y, extra = {}) => html('lab', txt, { left: x + 'px', top: y + 'px', ...extra });

// ── 1. WATCHING TUTORIALS / BUILDING ────────────────────────────────────────────
export function scene1(scene) {
  const root = new THREE.Group(); scene.add(root); const { plane, spot, floor } = kit(root); floor();
  const A = makeFigure({ H: FH, color: 0x9f9f9f, glow: 0, back: 0.8 }); root.add(A);
  plane(150, 0.235 * FH, new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.9 }), -255, GROUND + 0.235 * FH / 2, -20);
  const phone = plane(22, 40, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 0, 30);
  const phoneGlow = spot(0, 0, 200);
  const B = makeFigure({ H: FH, color: 0xf4f4f4, glow: 1 }); root.add(B);
  const STEP_W = 95, STEP_H = 34, X0 = 140, N = 4;
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.8 }), edgeMat = new THREE.MeshBasicMaterial({ color: 0x8a8a8a });
  const steps = [];
  for (let i = 0; i < N; i++) {
    const s = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(STEP_W, STEP_H * (i + 1), 40), stepMat); body.position.set(0, STEP_H * (i + 1) / 2, -30); s.add(body);
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(STEP_W, 3), edgeMat); edge.position.set(0, STEP_H * (i + 1), -8); s.add(edge);
    s.position.set(X0 + STEP_W * (i + 0.5), GROUND, 0); root.add(s); steps.push(s);
  }
  const labs = [label('Watching tutorials', 305, 366), label('Building', 808, 366)];
  return {
    root, labs,
    update(t) {
      A.userData.pose(Object.assign({}, POSES.sit, { head: 0.35 + 0.05 * Math.sin(t * 2.1), drop: 0.47 }), -290, GROUND, 1);
      const h = A.userData.hands.l; phone.position.set(h.x + 6, h.y + 10, 30); phoneGlow.position.set(h.x + 6, h.y + 10, -10);
      phone.material.color.setScalar(0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 3.3));
      const d = 52 * t + 20, hipX = 60 + d;
      steps.forEach((s, i) => { const a = clamp01((hipX - (X0 + STEP_W * (i - 1.3))) / 60); s.scale.y = Math.max(0.001, ease(a)); s.visible = a > 0; });
      const stepH = x => { const j = Math.floor((x - X0) / STEP_W); return GROUND + (j < 0 ? 0 : STEP_H * Math.min(N, j + 1) * steps[Math.min(N - 1, j)].scale.y); };
      const snap = x => X0 + STEP_W * (Math.round((x - X0) / STEP_W - 0.5) + 0.5);
      const w = walker(d, FH, { x0: 60, stride: 2 * STEP_W / FH, ground: stepH, plant: x => snap(60 + x) - 60 });
      w.lean += 0.06; B.userData.poseIK(w);
    },
  };
}

// ── 2. PROMPTING FROM SCRATCH / WRITING A SKILL ─────────────────────────────────
export function scene2(scene) {
  const root = new THREE.Group(); scene.add(root); const { plane, floor } = kit(root); floor();
  const H2 = 380, R = 60, RISE = 175, RUN = 400;
  const halves = [-520, 40].map((xs, k) => {
    const g = x => GROUND + RISE * clamp01((x - xs) / RUN);
    const sh = new THREE.Shape(); sh.moveTo(xs - 40, GROUND); sh.lineTo(xs, GROUND); sh.lineTo(xs + RUN, GROUND + RISE); sh.lineTo(xs + RUN + 80, GROUND + RISE); sh.lineTo(xs + RUN + 80, GROUND); sh.lineTo(xs - 40, GROUND);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0x1c1c1c })); m.position.z = -40; root.add(m);
    const L = Math.hypot(RUN, RISE), ang = Math.atan2(RISE, RUN);
    const edge = plane(L, 3, new THREE.MeshBasicMaterial({ color: 0x3a3a3a }), xs + RUN / 2, GROUND + RISE / 2, -35); edge.rotation.z = ang;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 30), new THREE.MeshStandardMaterial({ map: rockTex(7 + k), color: 0xb0b0b0, roughness: 0.95 })); root.add(ball);
    const fig = makeFigure({ H: H2, color: k ? 0xf4f4f4 : 0x9f9f9f, glow: k ? 1 : 0, back: 0.8 }); root.add(fig);
    return { xs, g, ang, ball, fig };
  });
  // right: every push is "saved" — a glowing stopper pops up behind the ball, so it never rolls back
  const R0 = halves[1];
  const chockSh = new THREE.Shape(); { const w = 13, h = 52, r = 9; chockSh.moveTo(-w, 0); chockSh.lineTo(w, 0); chockSh.lineTo(w, h - r); chockSh.quadraticCurveTo(w, h, w - r, h); chockSh.lineTo(-w + r, h); chockSh.quadraticCurveTo(-w, h, -w, h - r); chockSh.lineTo(-w, 0); }   // stopper post
  const chocks = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.ShapeGeometry(chockSh), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.position.z = -10; m.visible = false; root.add(m); return m; });
  const PUSH = [0.35, 1.63, 2.9, 4.18], PD = 0.85, SL = [30, 110, 190, 270, 345];
  const labs = [label('Prompting from scratch', 290, 366), label('Writing a skill', 808, 366)];
  const place = (h, s) => {        // s = ball travel along x from the slope start; the ball rolls, the figure pushes from behind
    const bx = h.xs + 20 + s, by = h.g(bx) + R / Math.cos(h.ang);
    h.ball.position.set(bx, by, 0); h.ball.rotation.z = -s / R;
    return { bx, by };
  };
  return {
    root, labs,
    update(t) {
      // left: push — the ball rolls back — again (one bar per cycle)
      const P = 2.553, p = (t % P) / P, cyc = Math.floor(t / P);
      const up = p < 0.72 ? ease(p / 0.72) : 1 - ease((p - 0.72) / 0.28);
      const sL = 30 + 240 * up * (0.9 + 0.1 * Math.sin(cyc * 2.3));
      const L = halves[0], b = place(L, sL);
      const hipX = b.bx - R - 0.2 * H2;
      const wl = walker(hipX - (L.xs - 60), H2, { x0: L.xs - 60, stride: 0.5, ground: L.g });
      wl.lean = 0.7; wl.head = -0.35;
      const c = { x: b.bx - R * 0.95, y: b.by + R * 0.1 };
      wl.hands = [{ x: c.x, y: c.y + 12 }, { x: c.x + 4, y: c.y - 8 }];
      L.fig.userData.poseIK(wl);
      // right: 4 pushes, half a bar each, a stopper after each; at the end the figure stands up and cheers
      const Rh = halves[1];
      let sR = SL[0];
      PUSH.forEach((t0, i) => { const k = ease(clamp01((t - t0) / PD)); if (t > t0) sR = mix(SL[i], SL[i + 1], k); });
      const br = place(Rh, sR);
      PUSH.forEach((t0, i) => {
        const m = chocks[i], k = clamp01((t - t0 - PD + 0.05) / 0.18);
        m.visible = k > 0; if (!k) return;
        const cx = Rh.xs + 20 + SL[i + 1] - 45; m.position.set(cx, Rh.g(cx) - 6, -10);   // vertical post touching the ball
        m.scale.set(1, k < 1 ? 0.2 + 1.0 * k : 1 + 0.12 * Math.exp(-(t - t0 - PD - 0.13) * 6), 1);
      });
      const done = clamp01((t - (PUSH[3] + PD + 0.15)) / 0.4);
      const hx = br.bx - R - mix(0.2, 0.32, done) * H2;
      const wr = walker(hx - (Rh.xs - 60), H2, { x0: Rh.xs - 60, stride: 0.5, ground: Rh.g });
      wr.lean = mix(0.7, 0.18, done); wr.head = mix(-0.35, 0.2, done);
      if (done < 0.5) { const c = { x: br.bx - R * 0.95, y: br.by + R * 0.1 }; wr.hands = [{ x: c.x, y: c.y + 12 }, { x: c.x + 4, y: c.y - 8 }]; }
      else { const w = Math.sin((t - 5) * 7) * 0.12; wr.arms = { lsh: 2.9 + w, lel: 0.2, rsh: 2.6 - w, rel: 0.2 }; }
      Rh.fig.userData.poseIK(wr);
    },
  };
}

// ── 3. 10 AI tools / 1 tool, mastered ─────────────────────────────────────────
export function scene3(scene) {
  const root = new THREE.Group(); scene.add(root); const { plane } = kit(root);
  const charts = [{ base: 150, multi: true }, { base: -420, multi: false }].map(c => {
    const axisMat = new THREE.MeshBasicMaterial({ color: 0xbfbfbf });
    plane(3, 300, axisMat, -320, c.base + 150, -10); plane(640, 3, axisMat, 0, c.base, -10);
    const bars = [];
    for (let i = 0; i < 10; i++) {
      const glow = !c.multi && i === 4;
      const m = new THREE.Mesh(new THREE.BoxGeometry(34, 1, 30), new THREE.MeshStandardMaterial({ color: glow ? 0xffffff : 0xbdbdbd, emissive: glow ? 0xffffff : 0x000000, emissiveIntensity: glow ? 0.35 : 0, roughness: 0.5 }));
      m.position.set(-261 + i * 58, c.base, 0); root.add(m); bars.push(m);
    }
    const orb = new THREE.Mesh(new THREE.SphereGeometry(13, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 })); root.add(orb);
    return { ...c, bars, orb };
  });
  const labs = [label('10 AI tools', 540, 1960 - 1960 + 470, { textTransform: 'none', fontSize: '38px' }), label('1 tool, mastered', 540, 1050, { textTransform: 'none', fontSize: '38px' })];
  const HOP = 0.319;   // half a beat
  return {
    root, labs,
    update(t) {
      for (const c of charts) {
        const n = Math.floor(t / HOP), f = (t / HOP) - n;
        const target = k => c.multi ? (k * 7) % 10 : 4;
        const heights = c.bars.map(() => 6);
        for (let k = 0; k <= n; k++) { const j = target(k), add = c.multi ? 18 : 12; heights[j] += add * (k < n ? 1 : ease(clamp01(f / 0.3))); }
        c.bars.forEach((b, i) => { b.scale.y = heights[i]; b.position.y = c.base + heights[i] / 2; });
        const a = c.bars[target(Math.max(0, n - 1))], b = c.bars[target(n)];
        const ax = n === 0 ? -320 : a.position.x, ay = n === 0 ? c.base + 40 : c.base + heights[target(n - 1)] + 13;
        const bx = b.position.x, by = c.base + heights[target(n)] + 13;
        c.orb.position.set(mix(ax, bx, f), mix(ay, by, f) + Math.sin(Math.PI * f) * 90, 10);
      }
    },
  };
}

// ── 4. MOTIVATED / CONSISTENT ───────────────────────────────────────────────────
export function scene4(scene) {
  const root = new THREE.Group(); scene.add(root); const { plane, floor } = kit(root); floor();
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x3c3c3c, roughness: 0.7 }), barMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.3, metalness: 0.4 });
  const lifters = [-250, 250].map((x, k) => {
    const fig = makeFigure({ H: FH, color: 0xf4f4f4, glow: 1, back: 0.92 }); root.add(fig);
    const bb = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 280, 16), barMat); bar.rotation.z = Math.PI / 2; bb.add(bar);
    for (const s of [-1, 1]) for (const o of [0, 26]) { const p = new THREE.Mesh(new THREE.BoxGeometry(22, 120 - o * 0.9, 60), plateMat); p.position.x = s * (105 + o); bb.add(p); }
    root.add(bb); return { x, fig, bb, k };
  });
  const col = (x, name) => html('ctr', `<div class="cn">${name}</div><div class="cd"><span>DAY</span> <b>001</b></div>`, { left: x + 'px', top: '330px' });
  const cols = [col(290, 'MOTIVATED'), col(790, 'CONSISTENT')];
  const cal = html('cal', '<div class="cm">JAN</div><div class="cday">01</div>', {});
  const labs = [...cols, cal];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL'], DIM = [31, 28, 31, 30, 31, 30, 31];
  const date = n => { let m = 0; n -= 1; while (n >= DIM[m]) { n -= DIM[m]; m++; } return [MONTHS[m], String(n + 1).padStart(2, '0')]; };
  const BEAT = 0.6383;
  return {
    root, labs,
    update(t) {
      const day = Math.max(1, Math.round(1 + 179 * Math.pow(clamp01(t / 5.8), 1.6)));
      for (const L of lifters) {
        const stop = L.k === 0 ? 3 * BEAT * 2 : 99;           // "motivated" quits after 3 reps
        const tt = Math.min(t, stop), rep = (tt / (2 * BEAT)) % 1;
        const lift = L.k === 0 && t > stop ? 0 : 0.5 - 0.5 * Math.cos(rep * Math.PI * 2);
        const hipY = GROUND + 0.47 * FH * 0.985;
        const neckY = hipY + 0.3 * FH, headTop = neckY + 0.2 * FH;
        const dropK = L.k === 0 ? ease(clamp01((t - stop) / 0.5)) : 0;
        const barY = mix(mix(neckY + 10, headTop + 70, lift), GROUND + 60, dropK);
        L.bb.position.set(L.x, barY, 20);
        const fig = L.fig, slump = dropK;
        fig.userData.poseIK({ hip: { x: L.x, y: hipY - slump * 30 }, lean: 0, face: 1, front: true,
          feet: [{ x: L.x - 55, y: GROUND }, { x: L.x + 55, y: GROUND }],
          hands: slump > 0.5 ? null : [{ x: L.x - 95, y: barY }, { x: L.x + 95, y: barY }],
          arms: { lsh: 0.15, lel: 0.1, rsh: -0.15, rel: 0.1 } });
        fig.userData.tint(L.k === 0 ? 0.62 + 0.38 * (1 - dropK) : 1);
      }
      const dL = Math.min(3, Math.floor(t / (2 * BEAT)) + 1);
      cols[0].querySelector('b').textContent = String(dL).padStart(3, '0');
      cols[0].style.opacity = t > 3 * 2 * BEAT ? 0.45 : 1;
      cols[1].querySelector('b').textContent = String(day).padStart(3, '0');
      const [m, dd] = date(day); cal.querySelector('.cm').textContent = m; cal.querySelector('.cday').textContent = dd;
    },
  };
}

// ── 5. "If you knew…" → FAIL × 100 → WIN ────────────────────────────────────────
export function scene5(scene) {
  const root = new THREE.Group(); scene.add(root); const { plane, spot } = kit(root);
  const BASE = -300, H5 = 330, FX = -120, V = 820;
  plane(1080, 3, new THREE.MeshBasicMaterial({ color: 0x5a5a5a }), 0, BASE, -20);
  const dashes = []; for (let i = 0; i < 12; i++) { dashes.push(plane(40, 3, new THREE.MeshBasicMaterial({ color: 0x2a2a2a }), 0, BASE - 26, -20)); }
  const fig = makeFigure({ H: H5, color: 0xf4f4f4, glow: 1 }); root.add(fig);
  const SPAWN = [0.2, 0.85, 1.4, 1.9, 2.35, 2.75, 3.1, 3.42, 3.72, 4.0];
  const redMat = new THREE.MeshStandardMaterial({ color: 0xe01818, emissive: 0xc00000, emissiveIntensity: 0.5 });
  const blocks = SPAWN.map(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(80, 56, 40), redMat); root.add(m);
    const tag = html('fail', 'FAIL', {}); return { s, m, tag, tj: s + (600 - FX) / V }; });
  const green = new THREE.Mesh(new THREE.BoxGeometry(110, 1, 50), new THREE.MeshStandardMaterial({ color: 0x00e000, emissive: 0x00c000, emissiveIntensity: 0.8 })); root.add(green);
  const gSpot = spot(FX, BASE + 200, 700, grad([[0, 'rgba(0,255,0,0.18)'], [0.5, 'rgba(0,255,0,0.05)'], [1, 'rgba(0,255,0,0)']], 0, 256, true));
  const q = html('q', 'If you knew your first 100 posts<br>would flop,<br><br>how fast would you ship them?', {});
  const cnt = html('ctr2', 'FAILS <b>000</b>/100', {});
  const win = html('win', 'WIN', {}), succ = html('succ', 'SUCCESS', {});
  const labs = [q, cnt, win, succ, ...blocks.map(b => b.tag)];
  const GT = 5.1, JD = 0.42;
  return {
    root, labs,
    update(t) {
      // running in place, the ground moves
      const run = t < GT + 0.3;
      dashes.forEach((d, i) => { d.position.x = ((i * 100 - t * V) % 1200 + 1200) % 1200 - 600; d.visible = run; });
      let jump = 0; for (const b of blocks) { const p = (t - (b.tj - JD / 2)) / JD; if (p > 0 && p < 1) jump = Math.max(jump, Math.sin(Math.PI * p)); }
      let fails = 0;
      for (const b of blocks) {
        const x = 600 - (t - b.s) * V, vis = t >= b.s && x > -620;
        b.m.visible = vis; b.m.position.set(x, BASE + 28, 0);
        b.tag.style.opacity = vis ? 1 : 0; b.tag.style.left = sx(x) + 'px'; b.tag.style.top = sy(BASE - 50) + 'px';
        if (t > b.tj) fails += 10;
      }
      cnt.querySelector('b').textContent = String(Math.min(100, fails)).padStart(3, '0');
      cnt.style.opacity = Math.min(+cnt.style.opacity, 1 - clamp01((t - GT) / 0.4));
      // green pillar: slides under the feet and grows
      const gx = 600 - (t - (GT - (600 - FX) / V)) * V, arrived = gx <= FX;
      const grow = ease(clamp01((t - GT - 0.15) / 1.1));
      const gh = 20 + 300 * grow;
      green.visible = t > GT - (600 - FX) / V; green.position.set(Math.max(FX, gx), BASE + gh / 2, 0); green.scale.y = gh;
      gSpot.material.opacity = grow; gSpot.position.y = BASE + gh;
      let w;
      if (!arrived || t < GT) {
        w = walker(t * V, H5, { x0: FX - t * V, stride: 0.75, run: 1, ground: () => BASE });
        if (jump > 0) { w.hip.y += jump * 170; w.feet = w.feet.map((p, i) => ({ x: w.hip.x + (i ? 30 : -20), y: w.hip.y - 0.3 * H5 })); }
      } else {
        const top = BASE + gh, k = ease(clamp01((t - GT - 1.3) / 0.4));
        w = { hip: { x: FX, y: top + 0.47 * H5 * 0.985 }, lean: 0, face: 1, feet: [{ x: FX - 18, y: top }, { x: FX + 18, y: top }],
          arms: blend(POSES.stand, POSES.cheer, k) };
      }
      fig.userData.poseIK(w);
      win.style.opacity = grow; win.style.left = sx(FX) + 'px'; win.style.top = sy(BASE - 60) + 'px';
      const sk = ease(clamp01((t - GT - 1.4) / 0.5));
      succ.style.opacity = sk; succ.style.left = sx(FX) + 'px'; succ.style.top = sy(BASE + gh + H5 + 70) + 'px';
    },
  };
}
