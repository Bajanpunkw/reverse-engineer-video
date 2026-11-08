// TED-Ed bridge-riddle style, own story (avalanche, 4 hikers, 1/2/5/10 min). Canvas 2D, 1920x1080.
// Contract: window.renderFrame(t), window.READY. Everything depends only on t.
const W = 1920, H = 1080;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');

// ---------- utils ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const eio = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const back = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const q12 = t => Math.floor(t * 12) / 12;            // character animation "on twos"

// ---------- palette (sampled from original key frames, 8.11) ----------
const C = {
  sky0: '#000814', sky1: '#001025', sky2: '#0a2246', ground: '#525252', groundLit: '#b1b1b1',
  snow: '#c8c7c4', snowShade: '#9c9c9c', coat: '#fcfcfc', black: '#000000', ink: '#020202',
  rope: '#4f463a', plank: '#4c4338', text: '#ececec', red: '#b8300c', redDark: '#8a0000',
  blue: '#0155bd', brown: '#673c07', teal: '#2d8b8d', grey: '#878787', navyShirt: '#0b3a66', jeans: '#075280',
  purple: '#23235a'
};

// ---------- timeline (voice) ----------
let TL = null; const L = {};
function wt(line, word, n = 0) { // start time of a word in a line
  const l = L[line]; if (!word) return l.start;
  const ws = l.words.filter(w => w.w.toLowerCase().replace(/[^a-z]/g, '') === word); return (ws[n] || ws[0] || l).start;
}

// ---------- textures ----------
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
let grain, sky;
function buildGrain() {
  grain = makeCanvas(512, 512); const g = grain.getContext('2d'); const id = g.createImageData(512, 512); const r = mulberry32(11);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - .5) * 120; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
}
function valueNoise(w, h, seed, oct) {
  const r = mulberry32(seed), out = new Float32Array(w * h);
  let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const gs = 4 << o, gw = gs + 1, gh = Math.ceil(gs * h / w) + 2, grid = new Float32Array(gw * gh).map(() => r());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = x / w * gs, fy = y / w * gs, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = grid[iy * gw + ix], b = grid[iy * gw + ix + 1], c = grid[(iy + 1) * gw + ix], d = grid[(iy + 1) * gw + ix + 1];
      out[y * w + x] += amp * lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
    }
    tot += amp; amp *= .55;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
function buildSky() { // dark navy with inky cloud patches
  const w = 640, h = 340; const n = valueNoise(w, h, 5, 5);
  const c = makeCanvas(w, h), g = c.getContext('2d'), id = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = n[y * w + x], k = ss(.42, .66, v), dk = ss(.42, .25, v), vy = y / h;
    let R = lerp(0, 6, k), G = lerp(10, 27, k) + vy * 4, B = lerp(26, 58, k) + vy * 8;
    R *= 1 - dk * .7; G *= 1 - dk * .6; B *= 1 - dk * .5;
    const i = (y * w + x) * 4; id.data[i] = R; id.data[i + 1] = G; id.data[i + 2] = B; id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0); sky = c;
}

// ---------- text (handwritten small caps) ----------
function scText(txt, x, y, size, opts = {}) {
  const { align = 'center', color = C.text, reveal = 1, sx = 1.12, alpha = 1, shadow = 0, thin = 0 } = opts;
  const parts = []; // [char, big?]
  txt.toUpperCase().split('').forEach((ch, i, a) => {
    const first = i === 0 || a[i - 1] === ' ' || a[i - 1] === '\n';
    parts.push([ch, first || /[0-9:?!=+\-]/.test(ch)]);
  });
  const fb = `700 ${size}px TEDHand`, fs = `700 ${size * .8}px TEDHand`;
  let wsum = 0; for (const [ch, big] of parts) { ctx.font = big ? fb : fs; wsum += ctx.measureText(ch).width + size * (thin ? .07 : .02); }
  const n = Math.floor(parts.length * clamp(reveal) + 1e-6);
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1); ctx.globalAlpha *= alpha;
  let cx = align === 'center' ? -wsum / 2 : align === 'right' ? -wsum : 0;
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = size * (thin ? .012 : .035); ctx.lineJoin = 'round'; ctx.textBaseline = 'alphabetic';
  if (shadow) { ctx.shadowColor = `rgba(0,6,20,${.85 * shadow})`; ctx.shadowBlur = 26; }
  parts.forEach(([ch, big], i) => {
    ctx.font = big ? fb : fs; const w = ctx.measureText(ch).width;
    if (i < n) { ctx.fillText(ch, cx, 0); ctx.strokeText(ch, cx, 0); }
    cx += w + size * (thin ? .07 : .02);
  });
  ctx.restore();
  return wsum * sx;
}
function popLabel(txt, x, y, size, t0, t) { // label pops in with a small overshoot
  const k = clamp((t - t0) / .25); if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); const s = back(k); ctx.scale(s, s); scText(txt, 0, 0, size, { alpha: clamp(k * 2) }); ctx.restore();
}

// ---------- characters ----------
// origin = feet centre, s=1 → ~640 px tall. dir: 1 faces right, -1 left.
const CH = {
  mia: { skin: C.brown, body: C.red, legs: C.jeans, hair: 'pony', w: 1, h: 1.0 },
  leo: { skin: C.blue, body: C.coat, legs: C.ink, hair: 'beanie', w: 1, h: .94 },
  sam: { skin: C.teal, body: C.coat, legs: C.navyShirt, hair: 'toque', w: 1.35, h: .92 },
  rose: { skin: C.grey, body: C.redDark, legs: C.ink, hair: 'bun', w: .9, h: .86, cane: true }
};
function drawChar(id, x, y, s, o = {}) {
  const c = CH[id]; const { walk = 0, dir = 1, sil = 0, look = 0, blink = 0, lantern = 0, armUp = 0, eyesWide = 0, tilt = 0 } = o;
  const col = v => sil ? C.black : v;
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.translate(x, y); ctx.scale(s * dir, s); ctx.rotate(tilt);
  const ph = walk * Math.PI * 2, moving = o.moving ? 1 : 0;
  const bob = moving ? Math.abs(Math.sin(ph)) * -10 : 0;
  const legL = 170 * c.h, hipY = -legL + bob, bodyH = 250 * c.h, shY = hipY - bodyH, bw = 60 * c.w;
  // legs
  ctx.lineCap = 'round'; ctx.lineWidth = 13; ctx.strokeStyle = col(c.legs);
  const sw = moving ? .38 : 0;
  for (const [sx, a] of [[-bw * .35, Math.sin(ph) * sw], [bw * .35, -Math.sin(ph) * sw]]) {
    const fx = sx + Math.sin(a) * legL, fy = hipY + Math.cos(a) * legL;
    ctx.beginPath(); ctx.moveTo(sx, hipY); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = C.black; ctx.beginPath(); ctx.ellipse(fx + 8, fy - 2, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
  }
  // cane
  if (c.cane) { ctx.strokeStyle = col('#5a4a36'); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(bw + 30, 0); ctx.lineTo(bw + 30, shY + 150); ctx.quadraticCurveTo(bw + 30, shY + 120, bw + 10, shY + 128); ctx.stroke(); }
  // back arm
  const arm = (side, up) => {
    const sxp = side * bw * .95, a = side > 0 ? (.15 + up * 2.5) : (-.15 + (moving ? Math.sin(ph) * .4 : 0));
    const ex = sxp + Math.sin(a) * 200 * c.h, ey = shY + 15 + Math.cos(a) * 200 * c.h;
    ctx.strokeStyle = col(c.body === C.redDark ? C.coat : c.body); ctx.lineWidth = 17;
    ctx.beginPath(); ctx.moveTo(sxp, shY + 15); ctx.quadraticCurveTo(sxp + side * 12, (shY + ey) / 2, ex, ey); ctx.stroke();
    ctx.fillStyle = col(c.skin); ctx.beginPath(); ctx.arc(ex, ey, 10, 0, 7); ctx.fill();
    return [ex, ey];
  };
  arm(-1, 0);
  // body
  ctx.fillStyle = col(c.body);
  ctx.beginPath();
  if (id === 'sam') { ctx.ellipse(0, (hipY + shY) / 2 + 10, bw * 1.15, bodyH * .56, 0, 0, 7); }
  else { ctx.moveTo(-bw, shY); ctx.lineTo(bw, shY); ctx.lineTo(bw * 1.12, hipY + 15); ctx.lineTo(-bw * 1.12, hipY + 15); ctx.closePath(); }
  ctx.fill();
  if (id === 'rose' && !sil) { ctx.fillStyle = C.coat; ctx.fillRect(-bw * .5, shY + bodyH * .45, bw, bodyH * .6); }
  if (id === 'sam' && !sil) { ctx.fillStyle = C.navyShirt; ctx.fillRect(-bw * 1.1, shY + 4, bw * 2.2, 26); }
  if (id === 'mia' && !sil) { ctx.strokeStyle = '#7a1c04'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, shY + 8); ctx.lineTo(0, hipY + 10); ctx.stroke(); }
  // front arm (holds lantern if lantern)
  const [hx, hy] = arm(1, armUp);
  // head: long wedge, narrow chin, wide rounded top
  const hb = shY + 14, hh = 268 * c.h, top = hb - hh, hw = 64 * Math.min(1.1, c.w);
  if (c.hair === 'pony') {
    const sway = Math.sin(ph * 2 + 1) * (moving ? .25 : .06) + Math.sin(q12(o.t || 0) * 2) * .05;
    ctx.fillStyle = col(C.black); ctx.save(); ctx.translate(-hw * .85, top + 25); ctx.rotate(.55 + sway);
    ctx.beginPath(); ctx.ellipse(-22, 80, 32, 92, -.2, 0, 7); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = col(c.skin);
  ctx.beginPath(); ctx.moveTo(-14, hb); ctx.bezierCurveTo(-30, hb - hh * .35, -hw * 1.05, hb - hh * .7, -hw, top + hh * .2);
  ctx.bezierCurveTo(-hw * .95, top - 6, hw * .95, top - 6, hw, top + hh * .2);
  ctx.bezierCurveTo(hw * 1.05, hb - hh * .7, 30, hb - hh * .35, 14, hb); ctx.closePath(); ctx.fill();
  // hair / hats (behind or on top)
  if (c.hair === 'pony') {
    ctx.fillStyle = col(C.black); ctx.beginPath(); ctx.ellipse(0, top + 18, hw * 1.02, 40, 0, Math.PI, 0); ctx.fill();
  } else if (c.hair === 'beanie') {
    ctx.fillStyle = col(C.black); ctx.beginPath(); ctx.ellipse(0, top + 30, hw * 1.08, 62, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(-hw * 1.1, top + 22, hw * 2.2, 26);
    ctx.fillStyle = col(C.coat); ctx.beginPath(); ctx.arc(0, top - 38, 20, 0, 7); ctx.fill();
  } else if (c.hair === 'toque') {
    ctx.fillStyle = col(C.coat);
    ctx.fillRect(-hw * .8, top - 40, hw * 1.6, 70);
    for (const [px, py, r] of [[-hw * .7, -85, 42], [0, -110, 52], [hw * .7, -85, 42], [-hw * .3, -70, 40], [hw * .35, -70, 40]]) { ctx.beginPath(); ctx.arc(px, top + py, r, 0, 7); ctx.fill(); }
  } else if (c.hair === 'bun') {
    ctx.fillStyle = col('#f7f7f7');
    for (const [px, py, r] of [[-hw * .5, 0, 34], [0, -18, 40], [hw * .5, 0, 34], [0, -60, 34]]) { ctx.beginPath(); ctx.arc(px, top + py, r, 0, 7); ctx.fill(); }
  }
  // face
  const ey = top + hh * .22, er = 17 * (1 + eyesWide * .35), bl = 1 - clamp(blink);
  for (const ex of [-24, 20]) {
    ctx.fillStyle = sil && sil < 2 ? '#e9e9e9' : sil ? C.black : '#f4f4f4';
    ctx.beginPath(); ctx.ellipse(ex, ey, er, er * Math.max(.08, bl), 0, 0, 7); ctx.fill();
    if (bl > .2) { ctx.fillStyle = C.black; ctx.beginPath(); ctx.arc(ex + look * 7 + 3, ey + 1, 7.5, 0, 7); ctx.fill(); }
  }
  if (!sil) {
    ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.beginPath(); ctx.arc(4 + look * 4, ey + 72, eyesWide ? 9 : 4.5, 0, 7); ctx.fill();
    if (id === 'sam') { ctx.fillStyle = C.black; ctx.beginPath(); ctx.ellipse(-18, ey + 40, 30, 10, .25, 0, 7); ctx.ellipse(26, ey + 40, 30, 10, -.25, 0, 7); ctx.fill(); }
    if (id === 'rose') { ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3; for (const k of [0, 1]) { ctx.beginPath(); ctx.moveTo(-30, top + 30 + k * 10); ctx.lineTo(30, top + 30 + k * 10); ctx.stroke(); } }
  }
  ctx.restore();
  // lantern position in world space (hanging from front hand)
  const d = dir, wx = x + (hx * d) * s, wy = y + hy * s;
  if (lantern) drawLantern(wx, wy + 8 * s, s * 1.0, o.t || 0, sil);
  return [wx, wy + 60 * s];
}
function drawLantern(x, y, s, t, sil) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(q12(t) * 3.1) * .12); ctx.scale(s, s);
  ctx.strokeStyle = C.black; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 18, 22, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = C.black; ctx.fillRect(-22, 18, 44, 14); ctx.fillRect(-26, 96, 52, 16);
  ctx.fillStyle = '#fdfdfd'; ctx.beginPath(); ctx.ellipse(0, 64, 20, 34, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = C.black; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-22, 30); ctx.lineTo(-22, 98); ctx.moveTo(22, 30); ctx.lineTo(22, 98); ctx.stroke();
  ctx.restore();
}
function glow(x, y, r, a = .6) {
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.35, `rgba(225,232,245,${a * .55})`); g.addColorStop(1, 'rgba(160,180,215,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
}
function darkness(x, y, r, a) { // everything outside the lantern circle goes black
  if (a <= 0) return;
  ctx.save(); const g = ctx.createRadialGradient(x, y, r * .35, x, y, r);
  g.addColorStop(0, 'rgba(4,12,28,0)'); g.addColorStop(1, `rgba(4,12,28,${a})`);
  ctx.fillStyle = g; ctx.fillRect(-4000, -4000, 12000, 12000); ctx.restore();
}

// ---------- backgrounds ----------
function drawSky(ox, oy, z) { ctx.drawImage(sky, -700 - ox * .3, -1000 - oy * .3, 4600, 3000); }
function whiteVignette(a = 1) { // light oval frame, signature of the night scenes
  if (a <= 0) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(W / 2, H / 2); ctx.scale(1, H / W * 1.25);
  const g = ctx.createRadialGradient(0, 0, W * .36, 0, 0, W * .62);
  g.addColorStop(0, 'rgba(244,244,244,0)'); g.addColorStop(.45, `rgba(225,228,232,${.55 * a})`); g.addColorStop(1, `rgba(246,246,246,${a})`);
  ctx.fillStyle = g; ctx.fillRect(-W, -W, 2 * W, 2 * W); ctx.restore();
}
function darkVignette(a = .5) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// world for wide shots: left massif with ledge (ground y=690, edge x=1450), bridge to right cliff (x=2500)
const LEDGE_Y = 690, EDGE_X = 1450, RCLIFF_X = 2520, DECK_Y = 712;
let massif, rcliff;
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); }
function buildMassif() { // prerendered with airbrush shading; world origin offset (400, 600)
  const OX = 400, OY = 600; massif = { c: makeCanvas(2100, 2400), ox: OX, oy: OY }; const g = massif.c.getContext('2d'); g.translate(OX, OY);
  const P = [[-400, 1800], [-400, 300], [-120, -420], [60, 80], [260, -560], [470, 120], [640, -180], [860, 380], [1030, 560], [1250, LEDGE_Y - 10], [EDGE_X, LEDGE_Y + 10], [EDGE_X + 12, 760],
    [1420, 900], [1385, 820], [1340, 1040], [1290, 900], [1230, 1150], [1150, 1800]];
  g.fillStyle = C.snow; poly(g, P); g.fill();
  g.save(); poly(g, P); g.clip();
  g.filter = 'blur(28px)'; g.fillStyle = 'rgba(70,72,78,.35)';
  g.fillStyle = 'rgba(110,112,118,.6)'; g.filter = 'blur(22px)';
  for (const s of [[[260, -560], [470, 120], [425, 130], [235, -470]], [[-120, -420], [60, 80], [15, 90], [-140, -330]], [[640, -180], [860, 380], [815, 390], [620, -90]], [[60, 80], [380, 330], [370, 380], [40, 140]], [[860, 380], [1250, 690], [1230, 730], [840, 440]]]) { poly(g, s); g.fill(); }
  g.filter = 'none'; g.strokeStyle = 'rgba(60,60,64,.55)'; g.lineWidth = 6;
  for (const l of [[[-300, 200], [80, 260], [140, 230]], [[120, -60], [420, -80], [470, -100]], [[380, 330], [700, 300]]]) { g.beginPath(); g.moveTo(...l[0]); for (const p of l.slice(1)) g.lineTo(...p); g.stroke(); }
  g.filter = 'none'; g.fillStyle = '#5e5e5e';
  for (const [x0, y0, x1, y1] of [[-380, 230, 150, 300], [180, -90, 520, -20], [-200, 640, 500, 700]]) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); const n = 9;
    for (let i = n; i >= 0; i--) { const k = i / n; g.lineTo(lerp(x0, x1, k), lerp(y0, y1, k) + 18 + (i % 2 ? 10 : 0)); }
    g.closePath(); g.fill(); }
  g.restore();
  rcliff = { c: makeCanvas(1400, 2100), ox: -RCLIFF_X + 60, oy: 300 }; const h = rcliff.c.getContext('2d'); h.translate(-RCLIFF_X + 60, 300);
  const R = [[RCLIFF_X, DECK_Y - 4], [RCLIFF_X + 300, DECK_Y - 30], [RCLIFF_X + 520, 300], [RCLIFF_X + 700, 80], [RCLIFF_X + 1300, -200], [RCLIFF_X + 1300, 1800], [RCLIFF_X + 120, 1800], [RCLIFF_X + 60, 900], [RCLIFF_X + 20, 980], [RCLIFF_X - 10, 800]];
  h.fillStyle = C.snow; poly(h, R); h.fill(); h.save(); poly(h, R); h.clip(); h.filter = 'blur(22px)'; h.fillStyle = 'rgba(110,112,118,.6)'; poly(h, [[RCLIFF_X + 520, 300], [RCLIFF_X + 700, 80], [RCLIFF_X + 720, 120], [RCLIFF_X + 560, 330]]); h.fill(); h.restore();
}
function drawFarPeaks(shift) { // purple-navy peaks deep in the chasm
  ctx.fillStyle = C.purple; ctx.beginPath(); ctx.moveTo(1300, 1600);
  const pk = [[1500, 1080], [1640, 1250], [1820, 980], [2000, 1210], [2200, 1010], [2380, 1240], [2600, 1600]];
  for (const [x, y] of pk) ctx.lineTo(x + shift, y + 40); ctx.closePath(); ctx.fill();
}
function bridge(x0, y0, x1, y1, sag, t, opts = {}) {
  const pts = []; const n = 34, sway = Math.sin(t * 1.7) * 6;
  for (let i = 0; i <= n; i++) { const k = i / n; pts.push([lerp(x0, x1, k), lerp(y0, y1, k) + Math.sin(Math.PI * k) * (sag + sway)]); }
  // planks
  ctx.fillStyle = C.plank;
  for (let i = 0; i < n; i++) { if (opts.missing && opts.missing.includes(i)) continue; const [x, y] = pts[i]; const pw = (x1 - x0) / n; ctx.beginPath(); ctx.roundRect(x + 1.5, y - 2, pw - 3, 13, 6); ctx.fill(); }
  // rails + truss
  ctx.strokeStyle = C.rope; ctx.lineWidth = opts.lw || 6; ctx.lineCap = 'round';
  const rail = pts.map(([x, y], i) => [x, y - 70 + Math.sin(Math.PI * i / n) * 8]);
  ctx.beginPath(); rail.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  ctx.beginPath(); for (let i = 0; i < n; i += 3) { const a = pts[i], b = rail[Math.min(n, i + 3)]; ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(b[0], b[1]); ctx.lineTo(pts[Math.min(n, i + 3)][0], pts[Math.min(n, i + 3)][1]); } ctx.stroke();
  ctx.lineWidth = (opts.lw || 6) * 2.2; ctx.beginPath(); ctx.moveTo(x0, y0 + 10); ctx.lineTo(x0, y0 - 100); ctx.moveTo(x1, y1 + 10); ctx.lineTo(x1, y1 - 100); ctx.stroke();
  return k => { const i = clamp(k) * n, a = Math.floor(Math.min(i, n - 1)), f = i - a; return [lerp(pts[a][0], pts[a + 1][0], f), lerp(pts[a][1], pts[a + 1][1], f)]; };
}
function snowfall(t, a = 1, n = 70) { // wind-blown flakes, screen space
  const r = mulberry32(3); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(240,240,245,${.7 * a})`;
  for (let i = 0; i < n; i++) { const sp = 120 + r() * 220, x0 = r() * (W + 400), y0 = r() * H, sz = 2 + r() * 4;
    const x = ((x0 - t * sp * 1.3) % (W + 400) + W + 400) % (W + 400) - 200, y = (y0 + t * sp * .6) % H;
    ctx.beginPath(); ctx.arc(x, y, sz, 0, 7); ctx.fill(); }
  ctx.restore();
}
function avalancheMass(cx, cy, r, t, body = true) { // smoky rolling snow cloud (blurred puffs + grey inner shading)
  const tq = q12(t), rr = mulberry32(9);
  ctx.save();
  if (body) { ctx.filter = 'blur(9px)'; ctx.fillStyle = '#ececec'; // trail of puffs back up the slope
    for (let k = 1; k <= 9; k++) { const f = k / 9, px = cx - r * 3.2 * f, py = cy - r * 3 * f;
      for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(px + (rr() - .5) * r * .6, py + (rr() - .5) * r * .6, r * (.55 - f * .2) * (.8 + rr() * .4), 0, 7); ctx.fill(); } } }
  ctx.filter = 'blur(7px)';
  for (let i = 0; i < 22; i++) { const a = -1.4 + rr() * 2.8, d = r * (.2 + rr() * .7), s = r * (.22 + rr() * .22) * (1 + .07 * Math.sin(tq * 6 + i));
    ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d - r * .3, cy + Math.sin(a) * d * .8, s, 0, 7); ctx.fill(); }
  ctx.filter = 'blur(16px)'; ctx.fillStyle = 'rgba(185,188,194,.55)';
  for (let i = 0; i < 6; i++) { const a = rr() * 6.28, d = rr() * r * .45; ctx.beginPath(); ctx.arc(cx - r * .4 + Math.cos(a) * d, cy + r * .25 + Math.sin(a) * d * .5, r * .2, 0, 7); ctx.fill(); }
  ctx.restore();
}
function timer(mins, x, y, a = 1, red = 0) {
  if (a <= 0) return; const m = Math.max(0, mins), mm = Math.floor(m), sec = Math.floor((m - mm) * 60);
  const s = `${mm}:${String(sec).padStart(2, '0')}`;
  scText(s, x, y, 150, { align: 'right', alpha: a, shadow: 1, color: red ? '#ff5a3c' : C.text, sx: 1.3, thin: 1 });
}

// ---------- camera ----------
function cam(cx, cy, z) { ctx.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z); }

// ---------- scenes ----------
// positions of the 4 hikers on the ledge (wide world)
const LEDGE_POS = { rose: 1180, sam: 1250, leo: 1320, mia: 1390 };
const FAR_POS = { rose: 2600, sam: 2660, leo: 2720, mia: 2780 };
function wideWorld(t, o) { // shared wide shot: sky, massif, bridge, chasm, hikers
  const { cx, cy, z, chars = [], av = null, lanternAt = null, snowA = 1 } = o;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = C.sky0; ctx.fillRect(0, 0, W, H);
  cam(cx, cy, z); drawSky(cx, cy, z);
  ctx.fillStyle = 'rgba(5,10,40,.6)'; drawFarPeaks(0);
  const at = bridge(EDGE_X - 10, DECK_Y, RCLIFF_X + 10, DECK_Y, 46, t);
  ctx.drawImage(rcliff.c, -rcliff.ox, -rcliff.oy);
  ctx.drawImage(massif.c, -massif.ox, -massif.oy);
  if (av) avalancheMass(av[0], av[1], av[2], t, av[3] !== false);
  if (lanternAt) glow(lanternAt[0], lanternAt[1], 260, .55);
  for (const ch of chars) drawChar(ch.id, ch.x, ch.y, ch.s || .2, { ...ch, t });
  if (lanternAt) glow(lanternAt[0], lanternAt[1], 90, .35);
  return at;
}
function sceneA(t) { // 0–4.85: cornice cracks, avalanche starts far up; tilt down to the hikers on the ledge
  const k = eio(ss(0, 4.6, t));
  const cx = lerp(380, 1150, k), cy = lerp(-330, 560, k), z = lerp(1.5, .95, k);
  const crack = clamp((t - .35) / 4.2), avX = lerp(300, 600, crack), avY = lerp(-430, -120, crack), avR = lerp(70, 190, Math.sqrt(crack));
  const ch = Object.entries(LEDGE_POS).map(([id, x]) => ({ id, x, y: LEDGE_Y, s: .2, sil: 0, look: -1, lantern: id === 'mia', blink: id === 'leo' ? ss(3.0, 3.1, t) - ss(3.15, 3.25, t) : 0 }));
  wideWorld(t, { cx, cy, z, chars: ch, av: [avX, avY, avR, false], lanternAt: [LEDGE_POS.mia + 14, LEDGE_Y - 60] });
  // breaking cornice chunk in the first second
  { const f = ss(.1, .35, t); ctx.strokeStyle = '#3c3c40'; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.beginPath();
    const crk = [[150, -430], [200, -400], [235, -425], [290, -395], [330, -420], [380, -385]]; const nn = Math.ceil(crk.length * f);
    crk.slice(0, nn).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (nn > 1) ctx.stroke(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  timer(17 - Math.max(0, t - .9) / 60, 1800, 200, ss(.9, 1.3, t));
}
function lineup(t, o) { // ground + sky lineup used by B and E
  const { ground = C.ground, vign = 0, cx = 960, z = 1 } = o;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = C.sky0; ctx.fillRect(0, 0, W, H);
  cam(cx, 540, z); ctx.drawImage(sky, -500, -300, 3200, 1700);
  ctx.fillStyle = ground; ctx.beginPath(); ctx.moveTo(-600, 790); ctx.lineTo(2600, 820); ctx.lineTo(2600, 1600); ctx.lineTo(-600, 1600); ctx.fill();
}
const LINE_X = { rose: 1560, sam: 1130, leo: 760, mia: 380 };
function sceneB(t) { // 4.85–7.7: silhouettes, eyes blink on, lantern ignites → colour
  const t0 = 4.85, lt = wt('s2', 'lantern');
  const lit = ss(lt - .1, lt + .35, t), cx = lerp(930, 990, ss(t0, 7.7, t)), z = lerp(1.0, 1.06, ss(t0, 7.7, t));
  lineup(t, { ground: C.groundLit, cx, z });
  const lx = LINE_X.mia + 120, ly = 560;
  if (lit > 0) glow(lx, ly, 700 * lit, .55 * lit);
  const eyesOn = ss(wt('s2', 'hikers') - .2, wt('s2', 'hikers'), t);
  for (const [id, x] of Object.entries(LINE_X)) {
    const s = id === 'mia' ? 1 : 1;
    // silhouettes until lantern lights; eyes appear first
    const sil = lit < .5 ? (eyesOn > .5 ? 1 : 3) : 0;
    drawChar(id, x, 910, .95, { sil, look: id === 'mia' ? 1 : -1, t, lantern: id === 'mia', armUp: id === 'mia' ? .35 * lit : 0, blink: id === 'sam' ? ss(6.0, 6.08, t) - ss(6.12, 6.2, t) : 0 });
  }
  if (lit > 0) glow(lx, ly + 20, 160 * lit, .6 * lit);
  whiteVignette(1);
}
function bridgeClose(t, o) { // side view of the bridge over the chasm
  const { cx = 960, z = 1 } = o;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = C.sky0; ctx.fillRect(0, 0, W, H);
  cam(cx, 540, z); ctx.drawImage(sky, -900, -400, 4600, 2000);
  ctx.fillStyle = C.purple; ctx.beginPath(); ctx.moveTo(-300, 1500); for (const [x, y] of [[0, 1080], [300, 1280], [700, 1000], [1100, 1300], [1500, 1050], [1900, 1260], [2300, 1020], [2700, 1500]]) ctx.lineTo(x, y + 60); ctx.fill();
  // cliffs at both ends
  ctx.fillStyle = C.snow; poly(ctx, [[-900, 700], [-60, 700], [-20, 820], [-90, 1000], [-140, 900], [-200, 1600], [-900, 1600]]); ctx.fill();
  poly(ctx, [[2900, 700], [1980, 700], [1950, 810], [2010, 960], [2060, 880], [2100, 1600], [2900, 1600]]); ctx.fill();
}
function sceneC(t) { // 7.7–9.85: pan along the old bridge, a plank snaps off
  const t0 = 7.7, k = eio(ss(t0, 9.85, t));
  bridgeClose(t, { cx: lerp(80, 760, k), z: 1.0 });
  const snap = wt('s3', 'old'), f = clamp((t - snap) / 1.2);
  bridge(-40, 700, 1990, 700, 70, t, { missing: f > 0 ? [17] : [], lw: 7 });
  let lan; for (const [id, x] of [['rose', -560], ['sam', -440], ['leo', -320], ['mia', -200]]) { const r = drawChar(id, x, 700, .5, { t, look: 1, lantern: id === 'mia', armUp: .3 }); if (id === 'mia') lan = r; }
  glow(lan[0], lan[1] - 40, 330, .5);
  if (f > 0) { ctx.fillStyle = C.plank; ctx.save(); ctx.translate(lerp(-40, 1990, 17.5 / 34), 770 + f * f * 600); ctx.rotate(f * 4); ctx.beginPath(); ctx.ellipse(0, 0, 26, 9, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); whiteVignette(1);
}
function sceneD(t) { // 9.85–14.95: two step on (bridge sags), third makes it creak → "2 AT A TIME"; then dark: only the lantern circle
  const t0 = 9.85, dk = wt('s4', 'dark') - .2, sag = 70 + 70 * ss(t0, t0 + 1.4, t) + 90 * ss(11.3, 11.6, t) * (1 - ss(12.0, 12.3, t));
  bridgeClose(t, { cx: lerp(480, 540, ss(t0, 14.95, t)), z: .92 });
  const at = bridge(-40, 700, 1990, 700, sag, t, { missing: [17], lw: 7 });
  const walkK = ss(t0, t0 + 3.2, t);
  const pL = at(lerp(.0, .3, walkK)), pS = at(lerp(-.02, .24, walkK));
  // rose on the cliff edge tries to step on, then steps back
  const rx = lerp(-110, -20, ss(10.9, 11.4, t)) - 95 * ss(12.0, 12.4, t);
  drawChar('rose', rx, 700, .5, { t, sil: 0, look: 1, eyesWide: ss(11.3, 11.5, t) });
  drawChar('sam', pS[0], pS[1], .5, { moving: walkK < 1 && walkK > 0, walk: q12(t) * 1.2, t, look: 1 });
  drawChar('leo', pL[0], pL[1], .5, { moving: walkK < 1 && walkK > 0, walk: q12(t) * 1.4 + .3, t, look: walkK >= 1 ? -1 : 1 });
  const miaX = -200; const lan = drawChar('mia', miaX, 700, .5, { t, lantern: 1, look: 1, armUp: .3 });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - ss(dk - .3, dk, t); popLabel('2 at a time', 1000, 250, 120, wt('s4', 'two'), t); ctx.globalAlpha = 1; cam(lerp(480, 540, ss(t0, 14.95, t)), 540, .92);
  // darkness: only the lantern circle survives; Leo out of the light becomes a silhouette with white eyes
  const d = ss(dk, dk + .5, t);
  if (d > 0) { glow(lan[0], lan[1] - 40, 360, .5 * d); darkness(lan[0], lan[1] - 40, 520, d); drawChar('sam', pS[0], pS[1], .5, { sil: 1, t, look: 1, alpha: d }); drawChar('leo', pL[0], pL[1], .5, { sil: 1, t, look: -1, eyesWide: ss(13.3, 13.5, t), alpha: d }); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); whiteVignette(1 - d * .6);
}
function sceneE(t) { // 14.95–20.8: spotlight lineup with minute labels
  const k = ss(14.95, 20.8, t);
  lineup(t, { ground: C.ground, cx: lerp(900, 1020, k), z: lerp(1.0, 1.05, k) });
  const order = [['mia', 's5', 'mia', '1 minute', 'one'], ['leo', 's6', 'leo', '2 minutes', 'two'], ['sam', 's7', 'sam', '5 minutes', 'five'], ['rose', 's8', 'rose', '10 minutes', 'ten']];
  for (const [id, line, word] of order) { const on = ss(wt(line, word) - .15, wt(line, word) + .05, t); if (on > 0) spot(LINE_X[id], on); }
  for (const [id, line, word, lab, lw] of order) {
    const on = t >= wt(line, word) - .1; const x = LINE_X[id];
    const pose = { t, sil: on ? 0 : 1, look: 0, blink: ss(17.9, 17.95, t) - ss(18.0, 18.05, t) };
    if (id === 'mia' && on) { pose.tilt = Math.sin(q12(t) * 9) * .03; pose.armUp = .9 * ss(wt(line, word), wt(line, word) + .3, t); }
    if (id === 'rose' && on) { pose.tilt = .06 + Math.sin(q12(t) * 2) * .02; pose.look = -1; }
    drawChar(id, x, 930, .95, pose);
    popLabel(lab, x, { mia: 215, leo: 250, sam: 140, rose: 225 }[id], 82, wt(line, lw) - .05, t);
  }
  darkVignette(.45);
}
function spot(x, a) { // light column from above + bright floor ellipse
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, `rgba(170,180,200,${.0 * a})`); g.addColorStop(1, `rgba(170,180,200,${.35 * a})`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 120, -200); ctx.lineTo(x + 120, -200); ctx.lineTo(x + 175, 930); ctx.lineTo(x - 175, 930); ctx.fill();
  ctx.fillStyle = `rgba(240,240,240,${.95 * a})`; ctx.beginPath(); ctx.ellipse(x, 935, 170, 30, 0, 0, 7); ctx.fill(); ctx.restore();
}
function sceneF(t) { // 20.8–24.25: Mia and Rose cross together at Rose's pace
  const t0 = 20.8, k = ss(t0, 24.25, t);
  bridgeClose(t, { cx: lerp(700, 980, k), z: 1.05 });
  const at = bridge(-40, 700, 1990, 700, 120, t, { lw: 7 });
  const pr = at(lerp(.05, .4, k)), pm = at(lerp(.12, .44, k) + Math.sin(q12(t) * 5) * .004);
  const waitTap = Math.sin(q12(t) * 14) > 0 ? .05 : 0;
  drawChar('rose', pr[0], pr[1], .55, { t, moving: true, walk: q12(t) * .6, look: 1 });
  const lan = drawChar('mia', pm[0], pm[1], .55, { t, look: -1, lantern: 1, armUp: .3, tilt: waitTap - .03 });
  glow(lan[0], lan[1] - 40, 300, .5);
  popLabel('10 minutes', (pr[0] + pm[0]) / 2, 260, 110, wt('s9', 'slower') - .1, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); whiteVignette(1);
}
// obvious plan: crossings in story minutes [who, from, to, startMin, durMin]
const PLAN = [[['mia', 'rose'], 1, 10], [['mia'], -1, 1], [['mia', 'sam'], 1, 5], [['mia'], -1, 1], [['mia', 'leo'], 1, 2]];
function storyMin(t) { // video time → story minutes since start of the plan
  const s10 = wt('s10', 'obvious'), w = [wt('s11', 'ten'), wt('s11', 'one'), wt('s11', 'five'), wt('s11', 'one', 1), wt('s11', 'two')];
  const keys = [[s10 + .3, 0], [w[0] + .1, 10], [w[1] + .5, 11], [w[2] + .6, 16], [w[3] + .5, 17]];
  if (t <= keys[0][0]) return 0;
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
  return 17;
}
function planState(m) { // where everyone is at story minute m (0..19)
  const pos = { mia: 0, rose: 0, sam: 0, leo: 0 }; let t0 = 0; let moving = new Set();
  for (const [who, dir, dur] of PLAN) {
    const k = clamp((m - t0) / dur);
    for (const id of who) pos[id] = dir > 0 ? k : 1 - k;
    if (m > t0 && m < t0 + dur) who.forEach(id => moving.add(id));
    if (m < t0 + dur) { // later crossings haven't happened; stop here
      return { pos, moving };
    }
    t0 += dur;
  }
  return { pos, moving };
}
function sceneG(t) { // 24.25–34.9: wide shot, time-lapse of the obvious plan, handwritten sum, avalanche hits at 17
  const m = storyMin(t), st = planState(m);
  const late = wt('s13', 'late'), avStart = wt('s12', 'nineteen') - 1.2;
  const fa = ss(avStart, late + .2, t);
  const cx = lerp(1980, 1900, ss(24.25, 30, t)) - 350 * fa, cy = 560 - 160 * fa, z = lerp(.74, .8, ss(24.25, 32, t));
  const chars = []; let lanternAt = null;
  const stepX = (id, p) => p <= 0 ? LEDGE_POS[id] : p >= 1 ? FAR_POS[id] : null;
  let atFn = null;
  // first pass to get bridge function
  const getAt = k => [lerp(EDGE_X, RCLIFF_X, k), DECK_Y + Math.sin(Math.PI * k) * 46];
  for (const id of ['rose', 'sam', 'leo', 'mia']) {
    const p = st.pos[id]; let x, y;
    const sx = stepX(id, p);
    if (sx !== null) { x = sx; y = p <= 0 ? LEDGE_Y : DECK_Y - 6; }
    else { [x, y] = getAt(p); x += id === 'mia' ? 26 : 0; }
    const mv = st.moving.has(id);
    const dir = id === 'mia' && mv && planDirAt(m) < 0 ? -1 : 1;
    const c = { id, x, y, s: .26, moving: mv, walk: q12(t) * 2.2, look: 1, dir, eyesWide: ss(late - 1.2, late - .9, t), lantern: id === 'mia' };
    chars.push(c);
    if (id === 'mia') lanternAt = [x + 14 * dir, y - 62];
  }
  const avX = lerp(300, 1300, fa), avY = lerp(-300, LEDGE_Y - 80, fa), avR = lerp(260, 520, fa);
  wideWorld(t, { cx, cy, z, chars, av: [avX, avY, avR], lanternAt });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // countdown: 17:00 at plan start → 0 at minute 17
  const tf = 1 - ss(late - .7, late - .4, t); timer(17 - Math.min(17, m), 1800, 200, tf, m >= 17);
  // handwritten sum, each number on its word
  const nums = [['10', wt('s11', 'ten')], ['+ 1', wt('s11', 'one')], ['+ 5', wt('s11', 'five')], ['+ 1', wt('s11', 'one', 1)], ['+ 2', wt('s11', 'two')], ['= 19', wt('s12', 'nineteen')]];
  let x = 780; for (const [s, ts] of nums) { const a = ss(ts - .05, ts + .12, t) * tf; if (a > 0) { ctx.save(); ctx.translate(x, 330); const sc = back(clamp((t - ts) / .25)); ctx.scale(sc, sc); scText(s, 0, 0, 130, { align: 'left', alpha: a, shadow: 1, color: s.startsWith('=') ? '#ff5a3c' : C.text }); ctx.restore(); }
    ctx.font = '700 130px TEDHand'; x += ctx.measureText(s).width * 1.12 + 40; }
  // white-out when the avalanche hits
  const wo = ss(late - .06, late + .08, t); if (wo > 0) { ctx.fillStyle = `rgba(246,246,246,${wo})`; ctx.fillRect(0, 0, W, H); }
}
function planDirAt(m) { let t0 = 0; for (const [, d, du] of PLAN) { if (m < t0 + du) return d; t0 += du; } return 1; }
function sceneK(t) { // 34.9–37.8: rewind to the ledge, timer back to 17:00, "17 MINUTES"
  const t0 = 34.4, k = eio(ss(t0, 37.9, t));
  const ch = Object.entries(LEDGE_POS).map(([id, x]) => ({ id, x, y: LEDGE_Y, s: .2, look: 1, lantern: id === 'mia', blink: id === 'mia' ? ss(36.6, 36.65, t) - ss(36.7, 36.75, t) : 0 }));
  wideWorld(t, { cx: lerp(1250, 1330, k), cy: lerp(560, 600, k), z: lerp(1.25, 1.6, k), chars: ch, lanternAt: [LEDGE_POS.mia + 14, LEDGE_Y - 60] });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const rw = 1 - ss(t0, t0 + .4, t); if (rw > 0) { ctx.fillStyle = `rgba(246,246,246,${rw})`; ctx.fillRect(0, 0, W, H); }
  timer(17, 1800, 200, 1);
  const ts = wt('s14', 'seventeen') - .05; popLabel('17 minutes', 960, 330, 150, ts, t);
  const u = ss(ts + .2, ts + .6, t); if (u > 0) { ctx.strokeStyle = C.text; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(760, 360); ctx.quadraticCurveTo(960, 372, 760 + 400 * u, 356 + 6 * u); ctx.stroke(); }
}
function sceneL(t) { // 37.8–end: black card, TED-Ed style question + "answer tomorrow"
  const t0 = wt('s15') - .15;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const r = clamp((t - t0) / 1.1);
  scText('Can you get all four', 960, 410, 140, { reveal: clamp(r * 2) });
  scText('across in 17 minutes?', 960, 580, 140, { reveal: clamp(r * 2 - 1) });
  const a = ss(t0 + 1.6, t0 + 2.0, t); scText('Answer: tomorrow', 960, 790, 96, { alpha: a, color: '#bdbdbd' });
  if (a > 0) { glow(960, 930, 170 * a, .5 * a); drawLantern(960, 860, 1.1 * a, t, 0); }
}

// ---------- frame ----------
const SCENES = [[0, sceneA], [4.85, sceneB], [7.7, sceneC], [9.85, sceneD], [14.95, sceneE], [20.8, sceneF], [24.25, sceneG], [34.4, sceneK], [37.75, sceneL]];
function draw(t) {
  let f = SCENES[0][1]; for (const [s, fn] of SCENES) if (t >= s) f = fn;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  f(t);
  // paper grain on everything, jitters on twos
  ctx.setTransform(1, 0, 0, 1, 0, 0); const fr = Math.floor(t * 12), r = mulberry32(fr + 1);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .13; const pat = ctx.createPattern(grain, 'repeat');
  ctx.translate(-r() * 512, -r() * 512); ctx.fillStyle = pat; ctx.fillRect(0, 0, W + 512, H + 512);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// fix sceneG: L lines inside timeline need s1..; build index
async function init() {
  TL = await (await fetch('audio/timeline.json')).json(); for (const l of TL.lines) L[l.id] = l;
  await document.fonts.load('700 100px TEDHand');
  buildGrain(); buildSky(); buildMassif();
  window.DURATION = TL.duration;
  window.renderFrame = async t => { draw(t); };
  const q = new URLSearchParams(location.search); draw(parseFloat(q.get('t') || '0'));
  window.READY = true;
}
init();
