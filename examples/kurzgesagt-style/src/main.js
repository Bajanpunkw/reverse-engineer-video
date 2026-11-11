// Kurzgesagt-style episode: "what happens in the second after you press Enter".
// Contract: window.renderFrame(t), window.READY. Everything depends only on t.
const W = 1920, H = 1080;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

await document.fonts.load('700 60px LX');
await document.fonts.load('500 60px LX');
await document.fonts.load('700 60px CP');
const TL = await (await fetch('timeline.json')).json();
const L = {}; for (const l of TL.lines) L[l.id] = l;
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const wt = (id, w, k = 0) => { const ws = L[id].words.filter(x => norm(x.w).startsWith(w)); return (ws[k] || L[id].words[0]).start; };
const ls = id => L[id].start;

const T = {
  enter: wt('l0', 'enter'), appear: wt('l1', 'appear'), but: wt('l1', 'but'),
  B: ls('l2') - 0.2, chop: wt('l2', 'chopped'), tokens: wt('l2', 'tokens'),
  tok3: wt('l3', 'token'), numbers: wt('l3', 'numbers'),
  C: ls('l4') - 0.1, rush: wt('l4', 'rush'), web: wt('l4', 'web'),
  seventy: wt('l5', 'seventy'), params: wt('l5', 'parameters'), all: wt('l5', 'all'),
  calc0: ls('l6'), calc: wt('l6', 'calculations'), one: wt('l6', 'one'),
  D: ls('l7') - 0.12, chips: wt('l7', 'chips'), gpu: wt('l7', 'gpu'),
  E: ls('l8') - 0.12, hot: wt('l8', 'hot'), thousands: wt('l8', 'thousands'), cooling: wt('l8', 'cooling'), power: wt('l8', 'power'),
  F: ls('l9') - 0.12, answer: wt('l9', 'answer'), notall: wt('l9', 'not'), justone: wt('l9', 'just'),
  F2: ls('l10') - 0.12, every: wt('l10', 'every'), single: wt('l10', 'single'), word: wt('l10', 'word'),
  G: ls('l11') - 0.1, thank: wt('l11', 'thank'), chatbot: wt('l11', 'chatbot'), somewhere: wt('l11', 'somewhere'), warmer: wt('l11', 'warmer'),
  end: TL.duration,
};

// ---------- utils ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const eout = k => 1 - Math.pow(1 - k, 3);
const back = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const frac = x => x - Math.floor(x);
function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgba(c, a) { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; }
function mix(c1, c2, k) { const a = hex(c1), b = hex(c2); return '#' + a.map((v, i) => Math.round(lerp(v, b[i], k)).toString(16).padStart(2, '0')).join(''); }

function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function glow(x, y, r, c, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(c, a)); g.addColorStop(.35, rgba(c, a * .45)); g.addColorStop(1, rgba(c, 0));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
}
function font(sz, wgt = 700, fam = 'LX') { ctx.font = `${wgt} ${sz}px ${fam}`; }
function cam(s, cx = W / 2, cy = H / 2, ox = 0, oy = 0) { ctx.setTransform(s, 0, 0, s, W / 2 - cx * s + ox, H / 2 - cy * s + oy); }
function reset() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
function vignette(a = .45) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(10,0,30,0)'); g.addColorStop(1, `rgba(10,0,30,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// Kurzgesagt label: solid/gradient box, white Lexend bold, wipes in from the left.
const TAGQ = [];
const tag = (...a) => TAGQ.push(a);
function drawTag(text, x, y, t0, t, cols = ['#0096fc', '#04daf0'], sz = 50, ptr = null) {
  const k = prog(t, t0, t0 + .35); if (k <= 0) return;
  font(sz, 700); const tw = ctx.measureText(text).width; const pw = tw + sz * 1.72, ph = sz * 1.8;
  ctx.save(); const w = pw * eout(k);
  ctx.beginPath(); ctx.rect(x, y - 4, w + 40, ph + 8); ctx.clip();
  const g = ctx.createLinearGradient(x, 0, x + pw, 0); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1] || cols[0]);
  ctx.fillStyle = g; ctx.fillRect(x, y, pw, ph);
  if (ptr === 'right') { ctx.beginPath(); ctx.moveTo(x + pw, y + ph * .28); ctx.lineTo(x + pw + 26, y + ph / 2); ctx.lineTo(x + pw, y + ph * .72); ctx.fillStyle = cols[1] || cols[0]; ctx.fill(); }
  if (ptr === 'down') { ctx.restore(); ctx.save(); ctx.beginPath(); ctx.moveTo(x + pw / 2 - 22, y + ph); ctx.lineTo(x + pw / 2, y + ph + 24); ctx.lineTo(x + pw / 2 + 22, y + ph); ctx.fillStyle = mix(cols[0], cols[1] || cols[0], .5); ctx.globalAlpha = eout(k); ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.rect(x, y - 4, w + 40, ph + 8); ctx.clip(); }
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(text, x + sz * .86, y + ph / 2 + sz * .04);
  ctx.restore();
}

// ---------- chat UI ----------
const PROMPT = 'write a poem about my cat';
const POEM = ['Soft', ' paws', ' at', ' dawn', ',', ' a', ' purr', 'ing', ' storm', ',', '\n', 'the', ' sun', "'s", ' best', ' friend', ',', ' forever', ' warm', '.'];
function bgBlue(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0c86d6'); g.addColorStop(.55, '#0a8ed8'); g.addColorStop(1, '#04d6e4');
  ctx.fillStyle = g; ctx.fillRect(-W, -H, 3 * W, 3 * H);
  ctx.save(); ctx.globalAlpha = .8;
  const y = 960; const e = ctx.createRadialGradient(W * .55, y, 0, W * .55, y, 700); e.addColorStop(0, 'rgba(208,58,216,.85)'); e.addColorStop(.5, 'rgba(208,58,216,.35)'); e.addColorStop(1, 'rgba(214,92,230,0)');
  ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([1, 0, 0, .09, 0, y * (1 - .09)])));
  ctx.fillStyle = e; ctx.fillRect(-W, y - 700, 3 * W, 1400); ctx.restore();
}
function inputPill(x, y, w, h, text, cursorOn, press = 0) {
  ctx.fillStyle = '#b85cf5'; rr(x + 16, y + 20, w, h, h / 2); ctx.fill();
  ctx.fillStyle = '#fff'; rr(x, y, w, h, h / 2); ctx.fill();
  font(64, 500); ctx.fillStyle = '#410081'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(text, x + 70, y + h / 2 + 3);
  const tw = ctx.measureText(text).width;
  if (cursorOn) { ctx.fillStyle = '#b26cf3'; ctx.fillRect(x + 78 + tw, y + h / 2 - 30, 36, 60); }
  // enter button
  const bx = x + w + 150, by = y + h / 2, r = 86 * (1 - .12 * press);
  ctx.fillStyle = '#b85cf5'; ctx.beginPath(); ctx.arc(bx + 18, by + 22, r, 0, 7); ctx.fill();
  const g = ctx.createLinearGradient(bx, by - r, bx, by + r); g.addColorStop(0, '#fa7a07'); g.addColorStop(1, '#ffb52e');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 22 * (r / 86); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const s = r / 86; ctx.beginPath(); ctx.moveTo(bx + 30 * s, by - 32 * s); ctx.lineTo(bx + 30 * s, by + 8 * s); ctx.lineTo(bx - 34 * s, by + 8 * s); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(bx - 52 * s, by + 8 * s); ctx.lineTo(bx - 22 * s, by - 18 * s); ctx.lineTo(bx - 22 * s, by + 34 * s); ctx.closePath(); ctx.fill();
}
// our own little helper creature peeking over the input (not a channel mascot)
function peeker(x, y, t, look = 0) {
  ctx.save();
  ctx.fillStyle = '#5a1fb0'; ctx.beginPath(); ctx.ellipse(x + 8, y + 4, 92, 80, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#6a3cf0'; ctx.beginPath(); ctx.ellipse(x, y, 92, 80, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#8a5cff'; ctx.beginPath(); ctx.ellipse(x - 10, y - 8, 70, 58, 0, Math.PI, 0); ctx.fill();
  const bl = frac(t / 3.1) > .96 ? .15 : 1;
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + s * 32, y - 34, 20, 24 * bl, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a0a5a'; ctx.beginPath(); ctx.ellipse(x + s * 32 + look * 8, y - 30, 10, 12 * bl, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function bubble(x, y, w, h, side, a = 1) {
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = '#b85cf5'; rr(x + 14, y + 18, w, h, 34); ctx.fill();
  ctx.fillStyle = '#fff'; rr(x, y, w, h, 34); ctx.fill();
  ctx.beginPath(); if (side === 'r') { ctx.moveTo(x + w - 90, y + h - 2); ctx.lineTo(x + w - 30, y + h + 40); ctx.lineTo(x + w - 40, y + h - 2); }
  else { ctx.moveTo(x + 60, y + h - 2); ctx.lineTo(x + 40, y + h + 40); ctx.lineTo(x + 110, y + h - 2); }
  ctx.fill(); ctx.restore();
}
function poemText(x, y, n, t, tNew) {
  font(54, 500); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  let cx = x, cy = y;
  for (let i = 0; i < n && i < POEM.length; i++) {
    const p = POEM[i]; if (p === '\n') { cx = x; cy += 76; continue; }
    const w = ctx.measureText(p).width;
    const age = tNew ? t - tNew[i] : 9;
    if (age < .35) { // fresh token highlight
      const k = age / .35; ctx.fillStyle = rgba('#04d6e4', .55 * (1 - k)); rr(cx - 4, cy - 50, w + 8, 66, 12); ctx.fill();
    }
    ctx.fillStyle = '#410081'; ctx.fillText(p, cx, cy); cx += w;
  }
}

function chatA(t) {
  const zIn = ease(prog(t, T.but + .9, T.B));
  const drift = 1 + .07 * ease(clamp(t / 7));
  const sc = drift * lerp(1, 2.6, zIn);
  const fx = lerp(W / 2, 1310, zIn), fy = lerp(H / 2, 215, zIn);
  cam(sc, fx, fy); bgBlue(t);
  const sent = prog(t, T.enter + .05, T.enter + .55);
  const pillY = lerp(560, 820, ease(sent));
  const nType = Math.floor(PROMPT.length * prog(t, .3, T.enter - .25));
  const typed = sent > 0 ? '' : PROMPT.slice(0, nType);
  const press = Math.max(0, 1 - Math.abs(t - T.enter) / .12);
  peeker(560, pillY + 4 - 10 * Math.abs(Math.sin(t * 3.2)), t, sent > 0 ? -1 : .6);
  inputPill(420, pillY, 1060, 170, typed, sent > 0 || (nType >= PROMPT.length ? Math.floor(t * 2.2) % 2 === 0 : true), press);
  // user bubble flies up
  if (sent > 0) {
    const k = back(clamp(sent * 1.1));
    const by = lerp(pillY, 140, k), bw = 960;
    bubble(1700 - bw, by, bw, 150, 'r', clamp(sent * 3));
    font(56, 500); ctx.fillStyle = '#410081'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(PROMPT, 1700 - bw + 60, by + 78);
  }
  // AI bubble: typing dots, then first tokens
  const ab = prog(t, T.enter + .7, T.enter + 1.1);
  if (ab > 0) {
    bubble(160, 360, 980, 300, 'l', 1);
    ctx.save(); ctx.translate(160, 360); ctx.restore();
    if (t < T.appear) {
      for (let i = 0; i < 3; i++) { const a = .35 + .65 * Math.max(0, Math.sin(t * 7 - i * .9)); ctx.fillStyle = rgba('#7a3cf0', a); ctx.beginPath(); ctx.arc(250 + i * 50, 510, 15, 0, 7); ctx.fill(); }
    } else {
      const n = Math.min(4, 1 + Math.floor((t - T.appear) / .22));
      const frozen = t > T.but ? 1 : 0;
      const tn = POEM.map((_, i) => T.appear + i * .22);
      poemText(225, 470, n, t, tn);
      if (frozen) { const k = prog(t, T.but, T.but + .4); ctx.fillStyle = rgba('#04d6e4', .0 + .0 * k); }
    }
  }
  reset(); tag('Chatbot', 110, 84, .2, t, ['#7624b9', '#4708cd']);
  // "what happened in that second?" — time freezes: cool tint
  const fr = prog(t, T.but, T.but + .5);
  if (fr > 0) { ctx.fillStyle = `rgba(13,0,69,${.32 * fr})`; ctx.fillRect(0, 0, W, H); }
  vignette(.25);
}

// ---------- tokens ----------
const TOK = ['write', ' a', ' poem', ' about', ' my', ' cat'];
const TCOL = ['#19b5ea', '#8a1cff', '#e0329b', '#fa8207', '#3e52fd', '#f5b800'];
const NUMS = TOK.map((_, i) => { const r = mulberry32(100 + i); return [0, 1, 2].map(() => ((r() * 2 - 1) * 1.9).toFixed(2)); });
function bgDeep(t, cx = W / 2, cy = H / 2) {
  ctx.fillStyle = '#12013a'; ctx.fillRect(-4 * W, -4 * H, 9 * W, 9 * H);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1100); g.addColorStop(0, 'rgba(37,55,154,.85)'); g.addColorStop(.6, 'rgba(37,40,120,.25)'); g.addColorStop(1, 'rgba(37,55,154,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - 1100, cy - 1100, 2200, 2200);
}
function tokenPill(x, y, text, col, sz = 84, a = 1, eyes = false, t = 0) {
  font(sz, 700); const tw = ctx.measureText(text.trim()).width;
  const w = tw + sz * 1.0, h = sz * 1.62;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = mix(col, '#12013a', .45); rr(x - w / 2 + 8, y - h / 2 + 12, w, h, h / 2); ctx.fill();
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, mix(col, '#ffffff', .12)); g.addColorStop(1, col);
  ctx.fillStyle = g; rr(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; rr(x - w / 2 + h * .4, y - h / 2 + h * .06, w - h * .8, h * .08, h * .04); ctx.fill();
  ctx.fillStyle = col === '#f5b800' ? '#410081' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text.trim(), x, y + sz * .06);
  if (eyes) {
    const bl = frac(t / 2.3) > .94 ? .15 : 1;
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + s * sz * .42, y - h / 2 - sz * .05, sz * .26, sz * .3 * bl, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#1b0d30'; ctx.beginPath(); ctx.ellipse(x + s * sz * .42, y - h / 2 - sz * .0, sz * .12, sz * .15 * bl, 0, 0, 7); ctx.fill();
    }
  }
  ctx.restore(); return w;
}
function tokenRow(t, sz = 84) {
  font(sz, 700);
  const sp = ease(prog(t, T.chop - .1, T.chop + .5));
  const ws = TOK.map(s => ctx.measureText(s.trim()).width + sz * 1.0);
  const gap = lerp(-sz * .6, 34, sp);
  const total = ws.reduce((a, b) => a + b, 0) + gap * (TOK.length - 1);
  let x = W / 2 - total / 2; const xs = [];
  for (let i = 0; i < TOK.length; i++) { xs.push(x + ws[i] / 2); x += ws[i] + gap; }
  return { xs, ws, sp };
}
function tokens(t) {
  const sc = lerp(1.12, 1.0, eout(prog(t, T.B, T.B + 1.2))) + .02 * Math.sin(t * .5);
  cam(sc, W / 2, H / 2 + 40); bgDeep(t, W / 2, 420);
  // floating specks
  const r = mulberry32(7); for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, s = 3 + r() * 6; ctx.fillStyle = rgba('#643bfb', .35); ctx.beginPath(); ctx.arc(x + Math.sin(t * .4 + i) * 20, y - (t * 12 * (0.5 + r())) % H, s, 0, 7); ctx.fill(); }
  const { xs, sp } = tokenRow(t);
  const y0 = 400;
  for (let i = 0; i < TOK.length; i++) {
    const bob = sp * 10 * Math.sin(t * 2.2 + i * 1.3);
    const col = sp < .02 ? '#ffffff' : mix('#ffffff', TCOL[i], clamp(sp * 1.4));
    if (sp < .02) { // still one white pill with the sentence
      if (i === 0) { font(84, 700); const tw = ctx.measureText(PROMPT).width + 84; ctx.fillStyle = '#fff'; rr(W / 2 - tw / 2, y0 - 63, tw, 126, 63); ctx.fill(); ctx.fillStyle = '#410081'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(PROMPT, W / 2, y0 + 5); }
      continue;
    }
    ctx.save(); ctx.translate(xs[i], y0 + bob); ctx.rotate(sp * .05 * Math.sin(i * 2.1 + 1));
    tokenPill(0, 0, TOK[i], col, 84, 1); ctx.restore();
    if (sp < 1) { ctx.fillStyle = rgba('#ffffff', .0); }
    // number cards
    const k = back(prog(t, T.tok3 + i * .16, T.tok3 + i * .16 + .45));
    if (k > 0) {
      const cy = y0 + 150 + 30 * (1 - k), cw = 170, ch = 250;
      ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(xs[i], cy); ctx.scale(clamp(k, .2, 1.2), clamp(k, .2, 1.2));
      ctx.fillStyle = '#1b0d4d'; rr(-cw / 2, 0, cw, ch, 24); ctx.fill();
      ctx.strokeStyle = TCOL[i]; ctx.lineWidth = 6; rr(-cw / 2, 0, cw, ch, 24); ctx.stroke();
      font(44, 700, 'CP'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      NUMS[i].forEach((n, j) => { const flick = t < T.numbers + .3 ? Math.floor(t * 14 + i * 3 + j) % 2 : 0; ctx.fillStyle = j === 1 && flick ? '#ffffff' : '#61ffeb'; ctx.fillText(n, 0, 52 + j * 64); });
      ctx.fillStyle = '#61ffeb'; ctx.fillText('…', 0, 52 + 3 * 52); ctx.restore();
    }
  }
  reset();
  // label
  tag('Tokens', 110, 84, T.tokens - .05, t, ['#3e52fd', '#4a3cf5']);
  tag('Numbers', W - 110 - 330, 84, T.numbers - .05, t, ['#0096fc', '#04daf0']);
  vignette(.5);
}

// ---------- neural web ----------
const NET = (() => {
  const r = mulberry32(42); const hubs = [], nodes = [], edges = [];
  for (let gy = -2; gy <= 2; gy++) for (let gx = -3; gx <= 3; gx++) {
    const c = gx === 0 && gy === 0;
    hubs.push({ x: gx * 1150 + (c ? 0 : (r() - .5) * 380), y: gy * 900 + (c ? 0 : (r() - .5) * 300), c });
  }
  const COLS = ['#06ecfa', '#6a4bff', '#0f8ff5', '#7b55ff', '#14b8f8'];
  for (const h of hubs) {
    h.i = nodes.length; nodes.push({ x: h.x, y: h.y, r: h.c ? 0 : 30, col: '#06ecfa', hub: true });
    const n = h.c ? 16 : 11;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r() * .4, d = 200 + r() * 330;
      const nd = { x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d * .85, r: 13 + r() * 14, col: COLS[Math.floor(r() * COLS.length)] };
      nodes.push(nd); edges.push({ a: h.i, b: nodes.length - 1, bend: (r() - .5) * .7, col: r() < .5 ? '#3b4fd8' : '#5a3bf0', w: 9 + r() * 4, s: r() });
      if (k > 0 && r() < .45) edges.push({ a: nodes.length - 2, b: nodes.length - 1, bend: (r() - .5) * .9, col: '#4a3be0', w: 7, s: r() });
    }
  }
  for (let i = 0; i < hubs.length; i++) for (let j = i + 1; j < hubs.length; j++) {
    const dx = hubs[i].x - hubs[j].x, dy = hubs[i].y - hubs[j].y; const d = Math.hypot(dx, dy);
    if (d < 1500) edges.push({ a: hubs[i].i, b: hubs[j].i, bend: (r() - .5) * .5, col: '#3a3fc8', w: 10, s: r(), long: true });
  }
  for (const e of edges) {
    const A = nodes[e.a], B = nodes[e.b]; const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    const nx = -(B.y - A.y), ny = B.x - A.x; e.cx = mx + nx * e.bend; e.cy = my + ny * e.bend;
    e.len = Math.hypot(B.x - A.x, B.y - A.y);
  }
  for (const n of nodes) n.d = Math.hypot(n.x, n.y);
  return { nodes, edges, hubs };
})();
function qpt(e, k) { const A = NET.nodes[e.a], B = NET.nodes[e.b]; const u = 1 - k; return [u * u * A.x + 2 * u * k * e.cx + k * k * B.x, u * u * A.y + 2 * u * k * e.cy + k * k * B.y]; }
function coreFace(x, y, s, t) {
  glow(x, y, 260 * s, '#06ecfa', .9);
  ctx.fillStyle = '#fff'; rr(x - 78 * s, y - 46 * s, 156 * s, 92 * s, 46 * s); ctx.fill();
  const bl = frac(t / 2.7) > .95 ? .2 : 1;
  ctx.fillStyle = '#3e2ab0'; for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + k * 30 * s, y, 14 * s, 18 * s * bl, 0, 0, 7); ctx.fill(); }
}
function network(t) {
  const zo = ease(prog(t, T.seventy - .2, T.seventy + 2.2)) * .62;
  const zin = ease(prog(t, T.D - .75, T.D));
  let sc = lerp(1.0, .34, zo) * (1 + .03 * Math.sin(t * .4)) * lerp(1, 9, zin * zin);
  sc *= lerp(1.06, 1, eout(prog(t, T.C, T.C + 1.5)));
  cam(sc, 0, 0, 0, 0);
  // background in screen space
  ctx.save(); reset(); bgDeep(t); ctx.restore();
  const view = 1150 / sc;
  const lit = n => { // wave from the centre once tokens rush in; everything lit at "all of them"
    const w = (t - T.rush - .4) * 900; const base = clamp((w - n.d) / 300);
    const all = Math.max(0, 1 - Math.abs(t - T.all - .3) / .6);
    return clamp(base * (.35 + .25 * Math.sin(t * 3 + n.x * .01)) + all);
  };
  // far plane: soft, dim, larger blobs (depth)
  { const rb = mulberry32(77); ctx.save(); reset();
    for (let i = 0; i < 26; i++) { const x = rb() * W, y = rb() * H, r0 = 14 + rb() * 22; const g = ctx.createRadialGradient(x, y, 0, x, y, r0 * 1.8); g.addColorStop(0, 'rgba(37,55,154,.55)'); g.addColorStop(.55, 'rgba(37,55,154,.35)'); g.addColorStop(1, 'rgba(37,55,154,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + Math.sin(t * .3 + i) * 12, y, r0 * 1.8, 0, 7); ctx.fill(); }
    ctx.restore(); cam(sc, 0, 0, 0, 0); }
  // edges
  ctx.lineCap = 'round';
  for (const e of NET.edges) {
    const A = NET.nodes[e.a]; if (Math.abs(A.x) > view * 1.9 + 600 || Math.abs(A.y) > view * 1.1 + 600) continue;
    ctx.strokeStyle = rgba(e.col, .8); ctx.lineWidth = e.w * 1.5 / Math.min(1, sc);
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(e.cx, e.cy, NET.nodes[e.b].x, NET.nodes[e.b].y); ctx.stroke();
  }
  // pulses along edges
  const act = prog(t, T.rush, T.rush + 1.5);
  if (act > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const fast = 1 + 2.5 * prog(t, T.calc0, T.calc0 + 1);
    for (let i = 0; i < NET.edges.length; i++) {
      const e = NET.edges[i]; const A = NET.nodes[e.a];
      if (Math.abs(A.x) > view * 1.9 + 600 || Math.abs(A.y) > view * 1.1 + 600) continue;
      if (e.s > act) continue;
      const k = frac(t * .55 * fast * (600 / (e.len + 300)) + e.s * 7);
      const [x, y] = qpt(e, e.long ? k : 1 - k);
      const pr = 1 / Math.min(1, sc); ctx.fillStyle = 'rgba(160,252,255,.9)'; ctx.beginPath(); ctx.arc(x, y, 9 * pr, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(6,236,250,.25)'; ctx.beginPath(); ctx.arc(x, y, 24 * pr, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  // nodes
  for (const n of NET.nodes) {
    if (Math.abs(n.x) > view * 1.9 + 300 || Math.abs(n.y) > view * 1.1 + 300) continue;
    if (n.r === 0) continue;
    const l = lit(n);
    if (n.hub) { glow(n.x, n.y, 150, '#06ecfa', .25 + .6 * l); ctx.fillStyle = mix('#5fe6ff', '#ffffff', l); ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7); ctx.fill(); continue; }
    if (l > .05) glow(n.x, n.y, n.r * 3.2, n.col, .5 * l);
    ctx.fillStyle = mix(n.col, '#e9fdff', l * .6); ctx.beginPath(); ctx.arc(n.x, n.y, n.r / Math.min(1, Math.sqrt(sc)), 0, 7); ctx.fill();
  }
  coreFace(0, 0, 1.9 / Math.min(1, sc * 1.1), t);
  // incoming tokens fly into the core
  for (let i = 0; i < TOK.length; i++) {
    const k = ease(prog(t, T.C + i * .1, T.rush + .5 + i * .1)); if (k >= 1) continue;
    const sx = -1200 + i * 120, sy = -260 + i * 110 - (i % 2) * 300;
    const x = lerp(sx, 0, k), y = lerp(sy, 0, k) - Math.sin(k * Math.PI) * 120;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 - .7 * k, 1 - .7 * k); tokenPill(0, 0, TOK[i], TCOL[i], 70, 1 - k * k); ctx.restore();
  }
  reset();
  if (zin > .3) { ctx.fillStyle = `rgba(255,255,255,${clamp((zin - .3) / .7)})`; ctx.fillRect(0, 0, W, H); }
  tag('Large Language Model', 96, 88, T.web - .05, t, ['#0096fc', '#04daf0']);
  // counters
  const c1 = prog(t, T.seventy - .1, T.seventy + .3), c2 = prog(t, T.calc0 - .05, T.calc0 + .25);
  if (c1 > 0 && zin < .5) {
    const isCalc = c2 > 0;
    const val = isCalc ? Math.floor(140e9 * ease(prog(t, T.calc0, T.calc - .1)) / 1e6) * 1e6 : 70e9;
    const txt = val.toLocaleString('en-US');
    const lab = isCalc ? 'calculations' : 'parameters';
    const k = back(isCalc ? c2 : c1);
    font(80, 700); const tw = Math.max(ctx.measureText('140,000,000,000').width, ctx.measureText(txt).width);
    const bw = tw + 110, bh = 112, bx = W / 2 - bw / 2, by = 820;
    ctx.save(); ctx.translate(W / 2, by + bh / 2); ctx.scale(k, k); ctx.translate(-W / 2, -(by + bh / 2));
    ctx.fillStyle = '#1b0d4d'; ctx.fillRect(bx + 10, by + 12, bw, bh);
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, isCalc ? '#e0329b' : '#7624b9'); g.addColorStop(1, isCalc ? '#fa8207' : '#4708cd');
    ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, W / 2, by + bh / 2 + 6);
    font(46, 700); const lw = ctx.measureText(lab).width + 70;
    ctx.fillStyle = '#04d6e4'; ctx.fillRect(W / 2 - lw / 2, by - 78, lw, 66); ctx.fillStyle = '#12013a'; ctx.fillText(lab, W / 2, by - 43);
    ctx.restore();
    if (t > T.one - .1 && isCalc) { // "for one token"
      const k2 = back(prog(t, T.one - .1, T.one + .3));
      ctx.save(); ctx.translate(W / 2 + bw / 2 + 140, by + bh / 2); ctx.scale(k2, k2); tokenPill(0, 0, 'cat', TCOL[5], 78, 1); ctx.restore();
      font(54, 700); ctx.fillStyle = '#fff'; ctx.globalAlpha = clamp(k2); ctx.textAlign = 'center'; ctx.fillText('×1', W / 2 + bw / 2 + 140, by - 52); ctx.globalAlpha = 1;
    }
  }
  vignette(.45);
}

// ---------- GPU ----------
function blobs(t, cx, cy, n, seed, col, a, R) { // organic wavy-edged clouds
  const r = mulberry32(seed); ctx.fillStyle = rgba(col, a);
  for (let i = 0; i < n; i++) {
    const x = cx + (r() - .5) * R * 2.2 + Math.sin(t * .6 + i) * 30, y = cy + (r() - .2) * R + Math.cos(t * .5 + i * 2) * 20, s = 110 + r() * 150;
    const f1 = 2 + Math.floor(r() * 3), f2 = 5 + Math.floor(r() * 3), p1 = r() * 6, p2 = r() * 6;
    ctx.beginPath();
    for (let k = 0; k <= 48; k++) { const a0 = k / 48 * Math.PI * 2; const rad = s * (1 + .16 * Math.sin(f1 * a0 + p1 + t * .7) + .07 * Math.sin(f2 * a0 + p2 - t)); const px = x + Math.cos(a0) * rad * 1.35, py = y + Math.sin(a0) * rad * .8; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fill();
  }
}
function chip(x, y, s, t, heat) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // cables: from the chip base, arc out and down to the floor
  ctx.lineCap = 'round'; ctx.lineWidth = 30;
  ctx.strokeStyle = '#3a0a3a'; ctx.beginPath(); ctx.moveTo(-180, 330); ctx.bezierCurveTo(-380, 330, -420, 110, -500, 120); ctx.bezierCurveTo(-600, 130, -560, 300, -660, 520); ctx.stroke(); ctx.strokeStyle = '#b0164f';
  ctx.beginPath(); ctx.moveTo(180, 330); ctx.bezierCurveTo(380, 330, 420, 110, 500, 120); ctx.bezierCurveTo(600, 130, 560, 300, 660, 520); ctx.stroke();
  // body
  const bw = 600, bh = 760;
  ctx.fillStyle = '#93005c'; ctx.beginPath(); ctx.moveTo(-bw / 2, -bh / 2); ctx.lineTo(bw / 2, -bh / 2); ctx.lineTo(bw / 2, bh * .1); ctx.quadraticCurveTo(bw / 2, bh / 2, 0, bh / 2); ctx.quadraticCurveTo(-bw / 2, bh / 2, -bw / 2, bh * .1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c4105e'; ctx.fillRect(bw / 2 - 52, -bh / 2, 52, bh * .55);
  ctx.fillStyle = '#2a1458'; ctx.beginPath(); const iw = bw - 110; ctx.moveTo(-bw / 2 + 50, -bh / 2 + 40); ctx.lineTo(-bw / 2 + 50 + iw - 30, -bh / 2 + 40); ctx.lineTo(-bw / 2 + 50 + iw - 30, bh * .06); ctx.quadraticCurveTo(-bw / 2 + 50 + iw - 30, bh / 2 - 40, -20, bh / 2 - 40); ctx.quadraticCurveTo(-bw / 2 + 50, bh / 2 - 40, -bw / 2 + 50, bh * .06); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(80,40,140,.5)'; ctx.beginPath(); ctx.arc(-50, 170, 120, 0, 7); ctx.fill();
  // status lights
  ctx.fillStyle = '#c58cf0'; ctx.fillRect(bw / 2 - 130, -bh / 2 + 70, 46, 90);
  ctx.fillStyle = Math.floor(t * 5) % 2 ? '#61ffeb' : '#3aa6c8'; ctx.fillRect(bw / 2 - 130, -bh / 2 + 240, 46, 66);
  // core
  glow(-40, -30, 240, '#06ecfa', .85);
  ctx.save(); ctx.filter = 'blur(10px)'; ctx.fillStyle = '#06ecfa'; rr(-40 - 128, -30 - 205, 256, 410, 128); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#ffffff'; rr(-40 - 105, -30 - 180, 210, 370, 105); ctx.fill();
  glow(-40, -30, 150, '#ffffff', .5 + .15 * Math.sin(t * 9));
  ctx.restore();
  if (heat > 0) { // heat shimmer lines
    ctx.save(); ctx.strokeStyle = rgba('#fff3c4', .5 * heat); ctx.lineWidth = 10 * s; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const x0 = x + (i - 2.5) * 110 * s; ctx.beginPath(); for (let k = 0; k <= 20; k++) { const yy = y - bh / 2 * s - k * 14 * s - (t * 160 * s) % (60 * s); const xx = x0 + Math.sin(k * .6 + t * 4 + i) * 16 * s; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    ctx.restore();
  }
}
function gpu(t) {
  const k = ease(prog(t, T.D, T.D + 1.3));
  const sc = lerp(7, 1, k) * (1 + .02 * (t - T.D));
  const zout = ease(prog(t, T.E - .55, T.E));
  cam(sc * lerp(1, .5, zout), 960 - 40 * (1 - k), 540 - 30 * (1 - k));
  ctx.fillStyle = '#060745'; ctx.fillRect(-4 * W, -4 * H, 9 * W, 9 * H);
  // hot box
  const bx = 262, by = 0, bw = 1396, bh = 930;
  const fg = ctx.createLinearGradient(0, by, 0, by + bh + 120); fg.addColorStop(0, '#7a0a2a'); fg.addColorStop(1, '#3a0430');
  ctx.fillStyle = fg; ctx.fillRect(bx - 120, by - 200, bw + 240, bh + 320);
  ctx.fillStyle = '#fd9000'; ctx.fillRect(bx, by, bw, bh);
  ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
  ctx.fillStyle = '#fdc35a'; ctx.beginPath(); ctx.moveTo(bx + 360, by - 40); ctx.lineTo(bx + 600, by + 620); ctx.lineTo(bx + 796, by + 620); ctx.lineTo(bx + 1036, by - 40); ctx.fill();
  ctx.fillStyle = 'rgba(255,224,120,.75)'; ctx.beginPath(); ctx.moveTo(bx, by + 40); ctx.lineTo(bx + 330, by + 520); ctx.lineTo(bx + 330, by + 560); ctx.lineTo(bx, by + 240); ctx.fill(); ctx.beginPath(); ctx.moveTo(bx + bw, by + 40); ctx.lineTo(bx + bw - 330, by + 520); ctx.lineTo(bx + bw - 330, by + 560); ctx.lineTo(bx + bw, by + 240); ctx.fill();
  blobs(t, 960, 640, 4, 11, '#fde2a8', .75, 520); blobs(t * 1.3, 960, 800, 3, 12, '#ffeccb', .7, 600);
  // red glow along the inner edge of the window
  { const e = 70, c0 = 'rgba(192,16,74,.55)', c1 = 'rgba(192,16,74,0)'; let g;
    g = ctx.createLinearGradient(0, by, 0, by + e); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(bx, by, bw, e);
    g = ctx.createLinearGradient(0, by + bh, 0, by + bh - e); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(bx, by + bh - e, bw, e);
    g = ctx.createLinearGradient(bx, 0, bx + e, 0); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(bx, by, e, bh);
    g = ctx.createLinearGradient(bx + bw, 0, bx + bw - e, 0); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(bx + bw - e, by, e, bh); }
  const heat0 = prog(t, T.chips, T.gpu + .5);
  chip(960, 540, 1, t, 0);
  ctx.restore();
  reset();
  tag('GPU', 1500, 120, T.gpu - .1, t, ['#e0329b', '#b8004f'], 56, 'right');
  vignette(.35);
}

// ---------- data-centre hall (isometric) ----------
let ISO = { s: 60, cx: 960, cy: 200 };
const P = (x, y, z = 0) => [ISO.cx + (x - y) * .866 * ISO.s, ISO.cy + (x + y) * .5 * ISO.s - z * ISO.s];
function poly(pts, fill) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
const N = 30;
const RACKS = (() => { const a = []; for (let i = 0; i < 12; i++) for (let j = 0; j < 8; j++) a.push({ x: 2 + i * 2.3, y: 2 + j * 3.4, w: 1.5, d: 2.2, h: 1.7, s: (i * 7 + j * 13) % 11 }); return a.sort((p, q) => (p.x + p.y) - (q.x + q.y)); })();
function rack(r, t, heat) {
  const { x, y, w, d, h } = r, x1 = x + w, y1 = y + d;
  const dc = Math.hypot(x + w / 2 - N / 2, y + d / 2 - N / 2) / (N * .6); // distance from the hot centre
  const lit = clamp(1 - dc) * (.35 + .65 * heat), dark = clamp(dc - .35) * .55;
  poly([P(x, y1, 0), P(x1, y1, 0), P(x1, y1, h), P(x, y1, h)], mix(mix('#2a2f78', '#8a3a6a', lit * .7), '#0c0f38', dark));
  poly([P(x1, y, 0), P(x1, y1, 0), P(x1, y1, h), P(x1, y, h)], mix(mix('#1b1f4d', '#5a2450', lit * .6), '#080a2a', dark));
  poly([P(x, y, h), P(x1, y, h), P(x1, y1, h), P(x, y1, h)], mix(mix('#5a2a9a', '#8a3fd0', lit), '#141850', dark));
  // server slots on the front face
  for (let k = 0; k < 4; k++) {
    const z = .22 + k * .42;
    poly([P(x + .12, y1, z), P(x1 - .12, y1, z), P(x1 - .12, y1, z + .3), P(x + .12, y1, z + .3)], mix('#141640', '#2a0f30', lit * .5));
  }
  // vents on the side face
  for (let k = 0; k < 3; k++) { const yy = y + .35 + k * .65; poly([P(x1, yy, .3), P(x1, yy + .35, .3), P(x1, yy + .35, h - .3), P(x1, yy, h - .3)], 'rgba(8,10,40,.35)'); }
  // blinking lights on the front face (y = y1)
  for (let k = 0; k < 4; k++) for (let m = 0; m < 3; m++) {
    const on = frac(t * (1.3 + (k + m) * .37) + r.s * .13 + k * .29) > (.25 + .5 * ((r.s * 3 + k * 5 + m) % 7) / 7);
    const [px, py] = P(x + .32 + m * .42, y1, .37 + k * .42);
    ctx.fillStyle = on ? (m === 2 ? '#ff4a6a' : '#61ffeb') : '#3a4a9a'; ctx.beginPath(); ctx.arc(px, py, ISO.s * .07, 0, 7); ctx.fill();
  }
}
function hall(t) {
  const kz = ease(prog(t, T.thousands - .2, T.thousands + 1.6));
  ISO.s = lerp(118, 42, kz) * lerp(1.25, 1, eout(prog(t, T.E, T.E + 1.2)));
  ISO.cx = 960 + lerp(-40, 0, kz); ISO.cy = lerp(-640, 60, kz) - (t - T.E) * 6;
  reset();
  ctx.fillStyle = '#090f3e'; ctx.fillRect(0, 0, W, H);
  const heat = prog(t, T.hot - .3, T.hot + 1.2);
  const H0 = 6;
  // back walls with glowing windows
  poly([P(0, 0, 0), P(0, N, 0), P(0, N, H0), P(0, 0, H0)], '#2c2a66');
  poly([P(0, 0, 0), P(N, 0, 0), P(N, 0, H0), P(0, 0, H0)], '#3a2f74');
  for (let i = 0; i < 9; i++) for (let lev = 0; lev < 2; lev++) {
    const yy = 1.5 + i * 3.2, z0 = 1.6 + lev * 2.2;
    const glowc = mix('#591d62', '#cb0003', .5 + .5 * heat);
    poly([P(0, yy, z0), P(0, yy + 1.8, z0), P(0, yy + 1.8, z0 + 1.5), P(0, yy, z0 + 1.5)], '#591d62');
    poly([P(0, yy + .3, z0 + .25), P(0, yy + 1.5, z0 + .25), P(0, yy + 1.5, z0 + 1.25), P(0, yy + .3, z0 + 1.25)], glowc);
    poly([P(yy, 0, z0), P(yy + 1.8, 0, z0), P(yy + 1.8, 0, z0 + 1.5), P(yy, 0, z0 + 1.5)], '#591d62');
    poly([P(yy + .3, 0, z0 + .25), P(yy + 1.5, 0, z0 + .25), P(yy + 1.5, 0, z0 + 1.25), P(yy + .3, 0, z0 + 1.25)], glowc);
  }
  // power lines on the walls
  const pw = prog(t, T.power - .2, T.power + .4);
  ctx.lineWidth = ISO.s * .14; ctx.lineCap = 'round';
  for (const z of [5.2, 5.5]) {
    ctx.strokeStyle = mix('#8a7a20', '#fde500', pw); ctx.beginPath(); let p = P(0, N, z); ctx.moveTo(...p); p = P(0, 0, z); ctx.lineTo(...p); p = P(N, 0, z); ctx.lineTo(...p); ctx.stroke();
    if (pw > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.setLineDash([ISO.s * .5, ISO.s * 1.5]); ctx.lineDashOffset = -t * ISO.s * 6; ctx.strokeStyle = rgba('#fff7a0', .8 * pw); ctx.stroke(); ctx.restore(); }
  }
  // floor
  const f0 = P(0, 0), f1 = P(N, 0), f2 = P(N, N), f3 = P(0, N);
  const fg = ctx.createLinearGradient(0, f0[1], 0, f2[1]); fg.addColorStop(0, '#3e1c6a'); fg.addColorStop(1, '#6a2c84');
  poly([f0, f1, f2, f3], fg);
  const c = P(N / 2, N / 2);
  const hg = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], ISO.s * 22);
  hg.addColorStop(0, rgba('#fd9000', .25 + .55 * heat)); hg.addColorStop(1, 'rgba(253,144,0,0)');
  ctx.fillStyle = hg; poly([f0, f1, f2, f3], hg);
  // green circuit traces
  ctx.strokeStyle = 'rgba(30,110,70,.8)'; ctx.lineWidth = ISO.s * .06;
  for (let j = 0; j < 8; j++) { const yy = 1.3 + j * 3.4; ctx.beginPath(); ctx.moveTo(...P(.5, yy, 0)); ctx.lineTo(...P(N - .5, yy, 0)); ctx.stroke(); }
  // cooling pipes between rack rows
  const cl = prog(t, T.cooling - .2, T.cooling + .4);
  for (let j = 0; j < 9; j++) {
    const yy = 1.2 + j * 3.4 + 2.6; if (yy > N) break;
    ctx.lineWidth = ISO.s * .32; ctx.strokeStyle = mix('#1d4fae', '#2aa8ff', cl);
    ctx.beginPath(); ctx.moveTo(...P(.2, yy, .2)); ctx.lineTo(...P(N - .2, yy, .2)); ctx.stroke();
    ctx.lineWidth = ISO.s * .08; ctx.strokeStyle = rgba('#bdf3ff', .5); ctx.beginPath(); ctx.moveTo(...P(.2, yy - .05, .32)); ctx.lineTo(...P(N - .2, yy - .05, .32)); ctx.stroke();
    if (cl > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.setLineDash([ISO.s * .4, ISO.s * 1.1]); ctx.lineDashOffset = -t * ISO.s * 4; ctx.lineWidth = ISO.s * .16; ctx.strokeStyle = rgba('#9ffcff', .8 * cl); ctx.beginPath(); ctx.moveTo(...P(.2, yy, .25)); ctx.lineTo(...P(N - .2, yy, .25)); ctx.stroke(); ctx.restore(); }
  }
  // racks (far to near)
  for (const r of RACKS) rack(r, t, heat);
  { // heat glow over the hall
    const hc = P(N / 2, N / 2, 1.5); glow(hc[0], hc[1], Math.max(ISO.s * 16, W * .4), '#fd9000', .2 + .4 * heat);
  }
  // heat haze above racks
  if (heat > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const rr0 = RACKS[(i * 5) % RACKS.length]; const [px, py] = P(rr0.x + .75, rr0.y + 1.1, rr0.h);
      ctx.strokeStyle = rgba('#ffb45a', .35 * heat); ctx.lineWidth = ISO.s * .1; ctx.lineCap = 'round';
      ctx.beginPath(); for (let k = 0; k <= 12; k++) { const yy = py - k * ISO.s * .25 - (t * ISO.s * 2 + i * 13) % (ISO.s * .8); const xx = px + Math.sin(k * .8 + t * 4 + i) * ISO.s * .12; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
    }
    ctx.restore();
  }
  { const g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.0); g.addColorStop(0, 'rgba(18,1,58,0)'); g.addColorStop(1, 'rgba(18,1,58,.85)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  tag('Data center', 110, 84, T.E + .4, t, ['#e0329b', '#fa8207']);
  if (t > T.thousands - .1) {
    const k = back(prog(t, T.thousands - .1, T.thousands + .3));
    ctx.save(); ctx.translate(1600, 150); ctx.scale(k, k); font(80, 700, 'CP'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1b0d4d'; rr(-200, -62, 400, 124, 22); ctx.fill(); ctx.fillStyle = '#fde500'; ctx.fillText('×1,000s', 0, 4); ctx.restore();
  }
  vignette(.45);
}

// ---------- one token comes out ----------
const GHOST = [' paws', ' at', ' dawn'];
function oneToken(t) {
  const sc = 1 + .03 * (t - T.F);
  cam(sc); bgDeep(t, W / 2, 520);
  const r = mulberry32(9); for (let i = 0; i < 50; i++) { const x = r() * W, y = r() * H; ctx.fillStyle = rgba('#643bfb', .3); ctx.beginPath(); ctx.arc(x, (y - t * 30 * (r() + .3)) % H + (y < 0 ? H : 0), 3 + r() * 5, 0, 7); ctx.fill(); }
  const k = prog(t, T.F, T.answer + .5);
  const y = lerp(1250, 540, eout(k)), s = lerp(.45, 1.7, back(k));
  // sparkle trail
  for (let i = 0; i < 8; i++) { const kk = clamp(k - i * .05); glow(960 + Math.sin(i * 2) * 40, lerp(1250, 540, eout(kk)) + 60, 60, '#06ecfa', .25 * (1 - i / 8)); }
  glow(960, y, 420 * s, '#06ecfa', .45);
  ctx.save(); ctx.translate(960, y); ctx.scale(s, s); tokenPill(0, 0, 'Soft', '#19b5ea', 150, 1, true, t); ctx.restore();
  // ghosts of the rest of the answer, then gone
  const g1 = prog(t, T.notall - .1, T.notall + .3), g2 = prog(t, T.justone, T.justone + .35);
  if (g1 > 0 && g2 < 1) {
    GHOST.forEach((w, i) => { const a = .45 * clamp(g1 * 2 - i * .3) * (1 - g2); ctx.save(); ctx.translate(1420 + i * 190, 560 + i * 26 * Math.sin(t * 3 + i)); ctx.scale(1 - g2 * .6, 1 - g2 * .6); tokenPill(0, 0, w, '#8a7ad8', 84, a); ctx.restore(); });
  }
  reset();
  tag('1 token', 110, 84, T.justone, t, ['#3e52fd', '#4a3cf5']);
  vignette(.5);
}

// ---------- chat again: token by token, then "thank you" ----------
function chatB(t) {
  const sc = 1.04 - .03 * prog(t, T.F2, T.somewhere);
  cam(sc, W / 2, H / 2); bgBlue(t);
  const tNew = []; let tt = T.F2 + .15;
  for (let i = 0; i < POEM.length; i++) { tNew.push(tt); tt += (POEM[i] === '\n' ? 0 : .2); }
  // user bubble (fades while every/single/word are on screen)
  const ua = 1 - prog(t, T.every - .4, T.every);
  if (ua > 0) { ctx.save(); ctx.globalAlpha = ua; bubble(1700 - 960, 120, 960, 150, 'r'); font(56, 500); ctx.fillStyle = '#410081'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(PROMPT, 800, 198); ctx.restore(); }
  // AI bubble growing
  bubble(160, 330, 1180, 260, 'l');
  const n = tNew.filter(x => x <= t).length;
  poemText(225, 435, n, t, tNew);
  // "starts again" loop arrow next to the newest token
  const loopA = prog(t, T.F2, T.F2 + .3) * (1 - prog(t, T.G - .3, T.G));
  if (loopA > 0) {
    ctx.save(); ctx.translate(1450, 460); ctx.rotate(t * 5); ctx.globalAlpha = loopA;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 46, .3, 5.6); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(56, -30); ctx.lineTo(30, -6); ctx.lineTo(66, 4); ctx.fill(); ctx.restore();
  }
  // every. single. word. — three bouncing token pills
  [[T.every, 'every', '#e0329b'], [T.single, 'single', '#fa8207'], [T.word, 'word', '#3e52fd']].forEach(([tw, w, col], i) => {
    const k = prog(t, tw - .05, tw + .3); if (k <= 0 || t > T.G) return;
    ctx.save(); ctx.translate(560 + i * 400, 700 + 20 * (1 - back(k))); ctx.scale(back(k), back(k)); tokenPill(0, 0, w, col, 70, clamp(k * 3)); ctx.restore();
  });
  // input with "thank you!"
  const tk = 'thank you!';
  const nT = Math.floor(tk.length * prog(t, T.G + .1, T.chatbot - .2));
  const press = Math.max(0, 1 - Math.abs(t - T.chatbot) / .12);
  const sent = t > T.chatbot;
  const pillY = 860;
  const ia = clamp(1 - prog(t, T.every - .4, T.every) + prog(t, T.G - .3, T.G));
  ctx.save(); ctx.globalAlpha = ia; ctx.translate(0, 120 * (1 - ia)); inputPill(420, pillY, 1060, 150, sent ? '' : tk.slice(0, nT), true, press); ctx.restore();
  if (sent) { const k = back(prog(t, T.chatbot, T.chatbot + .35)); bubble(1700 - 420, lerp(pillY, 640, k), 420, 120, 'r', clamp(k * 3)); font(52, 500); ctx.fillStyle = '#410081'; ctx.textAlign = 'left'; ctx.fillText(tk, 1700 - 420 + 58, lerp(pillY, 640, k) + 62); }
  reset(); tag('Chatbot', 110, 84, -1, t, ['#7624b9', '#4708cd']);
  vignette(.25);
}

// ---------- outside: a building somewhere gets a little warmer ----------
function exterior(t) {
  const k = prog(t, T.somewhere, T.end);
  ISO.s = lerp(52, 60, ease(k)); ISO.cx = 960; ISO.cy = lerp(300, 290, k);
  reset();
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#060a36'); g.addColorStop(1, '#2a1650'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = mulberry32(3); for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * H * .6, s = 1.5 + r() * 3; ctx.fillStyle = rgba('#cfd8ff', .4 + .5 * Math.max(0, Math.sin(t * 2 + i))); ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill(); }
  const warm = ease(prog(t, T.warmer - .35, T.warmer + .6));
  // ground
  poly([P(-20, -6), P(30, -6), P(30, 40), P(-20, 40)], '#170b38');
  // building
  const x0 = 0, y0 = 0, x1 = 12, y1 = 7, h = 4;
  const top = P(6, 3.5, h);
  glow(top[0], top[1] - 60, lerp(380, 640, warm), '#fd9000', lerp(.18, .55, warm));
  poly([P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, h), P(x0, y1, h)], '#2a2f78');
  poly([P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, h), P(x1, y0, h)], '#1b1f4d');
  poly([P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)], '#4a4fa8');
  const win = mix('#3e52fd', '#fdb000', warm);
  for (let i = 0; i < 11; i++) for (let lev = 0; lev < 3; lev++) {
    const xx = .5 + i * 1.05, z = .6 + lev * 1.15;
    poly([P(xx, y1, z), P(xx + .65, y1, z), P(xx + .65, y1, z + .7), P(xx, y1, z + .7)], win);
  }
  for (let i = 0; i < 6; i++) for (let lev = 0; lev < 3; lev++) {
    const yy = .5 + i * 1.07, z = .6 + lev * 1.15;
    poly([P(x1, yy, z), P(x1, yy + .65, z), P(x1, yy + .65, z + .7), P(x1, yy, z + .7)], mix(win, '#1b1f4d', .35));
  }
  // rooftop fans
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const [fx, fy] = P(1.8 + i * 2.8, 1.8 + j * 3.2, h);
    ctx.fillStyle = '#2a2f78'; ctx.beginPath(); ctx.ellipse(fx, fy, ISO.s * .9, ISO.s * .52, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(fx, fy); ctx.scale(1, .58); ctx.rotate(t * 6 + i);
    ctx.fillStyle = '#6a70c8'; for (let b = 0; b < 3; b++) { ctx.rotate(2.094); ctx.beginPath(); ctx.ellipse(ISO.s * .38, 0, ISO.s * .36, ISO.s * .14, 0, 0, 7); ctx.fill(); }
    ctx.restore();
    // warm air rising
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#ffb45a', .2 + .45 * warm); ctx.lineWidth = ISO.s * .12; ctx.lineCap = 'round';
    ctx.beginPath(); for (let q = 0; q <= 14; q++) { const yy = fy - q * ISO.s * .3 - (t * ISO.s * 2 + i * 20) % (ISO.s * .9); const xx = fx + Math.sin(q * .7 + t * 3 + i) * ISO.s * .2; q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); ctx.restore();
  }
  // tiny thermometer label
  { // thermometer (no number: illustration only)
    const kk = back(clamp(prog(t, T.somewhere + .2, T.somewhere + .6)));
    ctx.save(); ctx.translate(1560, 300); ctx.scale(kk, kk);
    ctx.fillStyle = '#1b0d4d'; rr(-44, -190, 88, 260, 44); ctx.fill(); ctx.beginPath(); ctx.arc(0, 90, 70, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; rr(-24, -170, 48, 240, 24); ctx.fill(); ctx.beginPath(); ctx.arc(0, 90, 50, 0, 7); ctx.fill();
    const lv = lerp(.3, .85, warm); const col = mix('#3e52fd', '#fd5000', warm);
    ctx.fillStyle = col; rr(-13, 70 - 230 * lv, 26, 230 * lv + 10, 13); ctx.fill(); ctx.beginPath(); ctx.arc(0, 90, 38, 0, 7); ctx.fill();
    ctx.restore();
  }
  const fade = prog(t, T.end - .6, T.end);
  vignette(.45);
  if (fade > 0) { ctx.fillStyle = `rgba(6,10,54,${fade})`; ctx.fillRect(0, 0, W, H); }
}

function draw(t) {
  reset(); ctx.clearRect(0, 0, W, H);
  if (t < T.B) chatA(t);
  else if (t < T.C) tokens(t);
  else if (t < T.D) network(t);
  else if (t < T.E) gpu(t);
  else if (t < T.F) hall(t);
  else if (t < T.F2) oneToken(t);
  else if (t < T.somewhere - .05) chatB(t);
  else exterior(t);
  reset();
  for (const a of TAGQ) drawTag(...a); TAGQ.length = 0;
  reset();
}

window.renderFrame = async t => { draw(t); };
const t0 = parseFloat(new URLSearchParams(location.search).get('t') || '0');
draw(t0);
TAGQ.length = 0; draw(t0);
window.READY = true;
