// HUD in the OutwardAnimates style. Sizes and positions were calibrated against original frames (see ../../outwardanimates-style.md).
// Drawn as DOM on top of the WebGL canvas and updated per frame via set(state) — no CSS animations, so every frame is deterministic.
const CSS = `
@font-face{font-family:CG;src:url(fonts/CormorantGaramond%5Bwght%5D.ttf);font-weight:300 700;font-style:normal}
@font-face{font-family:CG;src:url(fonts/CormorantGaramond-Italic%5Bwght%5D.ttf);font-weight:300 700;font-style:italic}
#hud{--ink:#EDEBE5;--red:#AF0F2B;--x:87px;position:absolute;inset:0;font-family:CG;color:var(--ink);font-feature-settings:"onum" 1;pointer-events:none}
#hud .blob{position:absolute;left:-120px;top:560px;width:900px;height:420px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.42),rgba(0,0,0,0));filter:blur(10px)}
#hud .tag{position:absolute;left:86px;top:596px;height:48px;min-width:330px;box-sizing:border-box;padding:0 21px;background:var(--red);border-radius:8px;display:flex;align-items:center;font-size:28px;letter-spacing:.22em;font-weight:500;color:#fff;text-transform:uppercase;white-space:nowrap}
#hud .lab{position:absolute;left:var(--x);top:700px;font-size:29px;letter-spacing:.23em;font-weight:400;text-transform:uppercase;line-height:1}
#hud .num{position:absolute;left:var(--x);top:735px;line-height:1;white-space:nowrap}
#hud .num b{margin-left:-2px;font-weight:400;font-size:88px;font-feature-settings:"lnum" 1,"tnum" 1}
#hud .num i{position:relative;top:-2px;font-style:normal;font-weight:400;font-size:56px;margin-left:18px}
#hud .num sup{font-size:.5em;vertical-align:super;font-feature-settings:"lnum" 1}
#hud .l1{position:absolute;left:var(--x);top:844px;font-size:29px;letter-spacing:.255em;font-weight:400;text-transform:uppercase;line-height:1;white-space:nowrap}
#hud .l2{position:absolute;left:var(--x);top:886px;font-size:27px;letter-spacing:.228em;font-weight:400;text-transform:uppercase;line-height:1;white-space:nowrap;opacity:.8}
#hud .cap{position:absolute;left:40px;right:40px;top:1148px;text-align:center;font-style:italic;font-size:49px;font-weight:400;line-height:1.15;text-shadow:0 2px 10px rgba(0,0,0,.45)}
#hud .intro{position:absolute;left:60px;right:60px;top:356px;text-align:center;font-size:97px;line-height:104px;font-weight:400;text-shadow:0 2px 14px rgba(0,0,0,.5)}
#hud .end{position:absolute;left:60px;right:60px;top:880px;text-align:center;font-size:62px;line-height:72px;font-weight:400}
#hud .dot{position:absolute;width:18px;height:18px;border-radius:50%;background:var(--red);box-shadow:0 0 10px 3px rgba(175,15,43,.55);transform:translate(-50%,-50%)}
#hud canvas{position:absolute;left:0;top:0}
`;

const UNITS = ['W', 'kW', 'MW', 'GW', 'TW', 'PW', 'EW', 'ZW', 'YW'];
export function fmtPower(P) {
  if (P < 10000) return [Math.round(P).toLocaleString('en-US'), 'W'];
  let k = Math.min(Math.floor(Math.log10(P) / 3), UNITS.length - 1), v = P / 10 ** (3 * k);
  if (v >= 1000) v = Math.round(v);
  return [v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US'), UNITS[k]];
}

// Log-scale power ruler in place of the original's altitude ruler (x=33, y 268…1460).
const R = { x: 33, top: 268, bottom: 1460, max: Math.log10(3.828e26) };
export const rulerY = P => R.bottom - Math.max(0, Math.log10(Math.max(P, 1))) / R.max * (R.bottom - R.top);
const LABELS = [[1, '1 W'], [1e3, '1 kW'], [1e6, '1 MW'], [1e9, '1 GW'], [1e12, '1 TW'], [1e15, '1 PW'], [1e18, '1 EW'], [1e21, '1 ZW'], [3.828e26, 'Sun']];

export function createHUD(root) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const hud = document.createElement('div'); hud.id = 'hud'; root.appendChild(hud);
  const mk = (cls, tag = 'div') => { const d = document.createElement(tag); if (cls) d.className = cls; hud.appendChild(d); return d; };
  const blob = mk('blob');
  const ruler = mk('', 'canvas'); ruler.width = 420; ruler.height = 1920;
  const dot = mk('dot'); const tag = mk('tag'); const lab = mk('lab'); const num = mk('num');
  const l1 = mk('l1'); const l2 = mk('l2'); const cap = mk('cap'); const intro = mk('intro'); const end = mk('end');

  function drawRuler() {
    const g = ruler.getContext('2d'); g.clearRect(0, 0, ruler.width, ruler.height);
    g.strokeStyle = 'rgba(237,235,229,.40)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(R.x, R.top - 4); g.lineTo(R.x, R.bottom + 1); g.stroke();
    g.strokeStyle = 'rgba(237,235,229,.75)';
    for (let e = 0; e <= 26; e += 1) { const y = Math.round(rulerY(10 ** e)) + .5; const major = e % 3 === 0;
      g.beginPath(); g.moveTo(R.x, y); g.lineTo(R.x + (major ? 14 : 7), y); g.stroke(); }
    g.font = '500 17px CG'; g.fillStyle = 'rgba(237,235,229,.9)'; g.textBaseline = 'middle';
    for (const [P, s] of LABELS) { const y = rulerY(P); let x = R.x + 19;
      g.beginPath(); g.moveTo(R.x, Math.round(y) + .5); g.lineTo(R.x + 14, Math.round(y) + .5); g.stroke();
      for (const ch of s.toUpperCase()) { g.fillText(ch, x, y + 4); x += g.measureText(ch).width + (ch === ' ' ? 0 : 3.2); } }
  }
  let rulerDrawn = false;

  return {
    // state: {blockA, tag, tagA, label, P, l1, l2, cap, capA, intro, introA, end, endA, rulerA}
    set(s) {
      if (!rulerDrawn) { drawRuler(); rulerDrawn = true; }
      const a = s.blockA ?? 0, boost = s.boost ?? 0;
      blob.style.opacity = a;
      blob.style.background = `radial-gradient(closest-side,rgba(0,0,0,${0.42 + 0.4 * boost}),rgba(0,0,0,0))`;
      cap.style.textShadow = `0 2px 10px rgba(0,0,0,${0.45 + 0.5 * boost}), 0 0 ${24 * boost}px rgba(0,0,0,${0.6 * boost})`;
      tag.style.boxShadow = boost ? `0 0 30px rgba(0,0,0,${0.5 * boost})` : '';
      cap.style.background = boost ? `radial-gradient(closest-side,rgba(0,0,0,${0.5 * boost}),rgba(0,0,0,0))` : 'none'; cap.style.padding = '30px 0';
      cap.style.marginTop = '-30px'; ruler.style.opacity = s.rulerA ?? a; dot.style.opacity = s.rulerA ?? a;
      for (const el of [lab, num, l1, l2]) el.style.opacity = el === l2 ? a * 0.8 : a;
      tag.style.opacity = (s.tagA ?? 0) * a; tag.textContent = s.tag || '';
      lab.textContent = s.label || '';
      if (s.P != null) { const [v, u] = fmtPower(s.P); num.innerHTML = `<b>${v}</b><i>${u}</i>`;
        dot.style.left = R.x + 'px'; dot.style.top = rulerY(s.P) + 'px'; }
      l1.textContent = s.l1 || ''; l2.textContent = s.l2 || '';
      cap.style.opacity = s.capA ?? 0; cap.textContent = s.cap || '';
      intro.style.opacity = s.introA ?? 0; intro.innerHTML = s.intro || '';
      end.style.opacity = s.endA ?? 0; end.innerHTML = s.end || '';
    },
    ready: () => Promise.all(['500 17px CG', '400 88px CG', 'italic 400 49px CG'].map(f => document.fonts.load(f))),
  };
}
