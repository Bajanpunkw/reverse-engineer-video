// A "clay" stick figure: sphere head + capsule limbs, poses by joint angles, side view.
// Units are frame pixels (orthographic camera 1080×1920, origin at the centre).
import * as THREE from 'three';

const clamp01 = x => Math.max(0, Math.min(1, x));
export const ease = x => x * x * (3 - 2 * x);
export const mix = (a, b, k) => a + (b - a) * k;

// Proportions relative to height H (measured on the original's frames: head ≈ 1/6 of height, thick limbs)
const P = { head: 0.075, torso: 0.30, thigh: 0.235, shin: 0.235, upper: 0.17, fore: 0.17, limb: 0.032, body: 0.036 };

// Pose: angles in radians. Limbs measured from "straight down", plus = forward (facing direction). lean = torso tilt forward.
export const POSES = {
  stand: { lean: 0.02, head: 0, lsh: 0.08, lel: 0.10, rsh: -0.08, rel: 0.10, lhip: 0.04, lkn: 0, rhip: -0.04, rkn: 0 },
  sit:   { lean: -0.05, head: 0.25, lsh: 0.55, lel: 0.9, rsh: 0.45, rel: 1.0, lhip: 1.45, lkn: 1.5, rhip: 1.35, rkn: 1.4, drop: 0.42 },
  slump: { lean: 0.35, head: 0.45, lsh: 0.25, lel: 0.2, rsh: 0.15, rel: 0.2, lhip: 0.05, lkn: 0.05, rhip: -0.05, rkn: 0.05 },
  cheer: { lean: -0.05, head: -0.2, lsh: 2.9, lel: 0.15, rsh: 2.6, rel: 0.2, lhip: 0.1, lkn: 0, rhip: -0.12, rkn: 0 },
  push:  { lean: 0.75, head: -0.3, lsh: 1.55, lel: 0.35, rsh: 1.45, rel: 0.45, lhip: 0.55, lkn: 0.35, rhip: -0.45, rkn: 0.15 },
};
export function blend(a, b, k) { const o = {}; for (const key in a) o[key] = mix(a[key], b[key] ?? a[key], k); for (const key in b) if (!(key in o)) o[key] = b[key] * k; return o; }

// Walk cycle: phase in steps (1 = full cycle), speed 0..1 from walk to run
export function walk(phase, run = 0) {
  const s = Math.sin(phase * Math.PI * 2), c = Math.cos(phase * Math.PI * 2);
  const amp = mix(0.42, 0.75, run);
  return {
    lean: mix(0.06, 0.32, run), head: mix(-0.04, -0.2, run),
    lhip: amp * s, rhip: -amp * s,
    lkn: Math.max(0, -c) * mix(0.55, 1.3, run) + 0.05, rkn: Math.max(0, c) * mix(0.55, 1.3, run) + 0.05,
    lsh: -amp * 0.9 * s, rsh: amp * 0.9 * s,
    lel: mix(0.25, 1.4, run), rel: mix(0.25, 1.4, run),
    bob: Math.abs(c) * mix(0.012, 0.03, run),
  };
}

// Climbing stairs: one step per cycle
export function climb(phase) { const w = walk(phase, 0.15); w.lhip += 0.35; w.rhip += 0.35; w.lkn += 0.25; w.rkn += 0.25; w.lean += 0.12; return w; }

export function makeFigure({ H = 300, color = 0xf2f2f2, glow = 1, back = 0.72 } = {}) {
  const g = new THREE.Group();
  const matFront = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, emissive: color, emissiveIntensity: 0.12 * glow });
  const cBack = new THREE.Color(color).multiplyScalar(back);
  const matBack = new THREE.MeshStandardMaterial({ color: cBack, roughness: 0.6, metalness: 0, emissive: cBack, emissiveIntensity: 0.06 * glow });
  const L = k => P[k] * H, R = P.limb * H;
  const cap = (len, r, mat, z) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20), mat); m.position.z = z; g.add(m); return m; };
  const parts = {
    torso: cap(L('torso'), P.body * H, matFront, 0),
    head: (() => { const m = new THREE.Mesh(new THREE.SphereGeometry(L('head'), 32, 24), matFront); g.add(m); return m; })(),
    lth: cap(L('thigh'), R, matFront, 6), lsn: cap(L('shin'), R, matFront, 6),
    rth: cap(L('thigh'), R, matBack, -6), rsn: cap(L('shin'), R, matBack, -6),
    lua: cap(L('upper'), R * 0.92, matFront, 10), lfa: cap(L('fore'), R * 0.92, matFront, 10),
    rua: cap(L('upper'), R * 0.92, matBack, -10), rfa: cap(L('fore'), R * 0.92, matBack, -10),
  };
  // place a capsule between two points
  const seg = (m, a, b) => { m.position.x = (a.x + b.x) / 2; m.position.y = (a.y + b.y) / 2; m.rotation.z = Math.atan2(b.x - a.x, -(b.y - a.y)) + Math.PI; };
  const dirF = (ang, f) => ({ x: Math.sin(ang) * f, y: -Math.cos(ang) });

  // x,y = the ground point under the hips; face: 1 right, -1 left
  g.userData.pose = (pose, x, y, face = 1) => {
    const f = face, hipY = y + (L('thigh') + L('shin')) * (1 - (pose.drop || 0)) + (pose.bob || 0) * H;
    const hip = { x, y: hipY };
    const up = { x: Math.sin(pose.lean) * f, y: Math.cos(pose.lean) };
    const neck = { x: hip.x + up.x * L('torso'), y: hip.y + up.y * L('torso') };
    const sh = { x: neck.x - up.x * 0.06 * H, y: neck.y - up.y * 0.06 * H };
    const ha = pose.lean + (pose.head || 0) * 0.5;
    const head = { x: neck.x + Math.sin(ha) * f * (L('head') + 0.03 * H), y: neck.y + Math.cos(ha) * (L('head') + 0.03 * H) };
    seg(parts.torso, hip, neck); parts.head.position.set(head.x, head.y, 0);
    const limb = (a, b, from, A, B, l1, l2, kneeSign) => {
      const d1 = dirF(A, f), j = { x: from.x + d1.x * l1, y: from.y + d1.y * l1 };
      const d2 = dirF(A + kneeSign * B, f), e = { x: j.x + d2.x * l2, y: j.y + d2.y * l2 };
      seg(a, from, j); seg(b, j, e); return e;
    };
    limb(parts.lth, parts.lsn, hip, pose.lhip, pose.lkn, L('thigh'), L('shin'), -1);
    limb(parts.rth, parts.rsn, hip, pose.rhip, pose.rkn, L('thigh'), L('shin'), -1);
    const handL = limb(parts.lua, parts.lfa, sh, pose.lsh + pose.lean * 0.3, pose.lel, L('upper'), L('fore'), 1);
    const handR = limb(parts.rua, parts.rfa, sh, pose.rsh + pose.lean * 0.3, pose.rel, L('upper'), L('fore'), 1);
    g.userData.hands = { l: handL, r: handR }; g.userData.head = head;
  };

  // Target pose: hips at a point, feet (and optionally hands) at given points, knees/elbows solved by two-bone IK.
  // o = { hip:{x,y}, lean, head, face, feet:[{x,y},{x,y}], hands:[{x,y}|null, ...], arms:{lsh,lel,rsh,rel} }
  const ik2 = (from, to, l1, l2, bend) => {
    let dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy);
    const dm = Math.min(d, (l1 + l2) * 0.999); if (d < 1e-3) { dx = 0; dy = -1; d = 1; }
    const ux = dx / d, uy = dy / d, c = Math.max(-1, Math.min(1, (l1 * l1 + dm * dm - l2 * l2) / (2 * l1 * dm))), a = Math.acos(c) * bend;
    const j = { x: from.x + l1 * (ux * Math.cos(a) - uy * Math.sin(a)), y: from.y + l1 * (ux * Math.sin(a) + uy * Math.cos(a)) };
    const e = { x: from.x + ux * dm, y: from.y + uy * dm };
    return [j, e];
  };
  g.userData.poseIK = (o) => {
    const f = o.face ?? 1, hip = o.hip, lean = o.lean ?? 0.05;
    const up = { x: Math.sin(lean) * f, y: Math.cos(lean) };
    const neck = { x: hip.x + up.x * L('torso'), y: hip.y + up.y * L('torso') };
    const sh = { x: neck.x - up.x * 0.06 * H, y: neck.y - up.y * 0.06 * H };
    const ha = lean + (o.head || 0) * 0.5;
    const head = { x: neck.x + Math.sin(ha) * f * (L('head') + 0.03 * H), y: neck.y + Math.cos(ha) * (L('head') + 0.03 * H) };
    seg(parts.torso, hip, neck); parts.head.position.set(head.x, head.y, 0);
    // knee bends forward along the facing direction: for f=1 rotate the down vector counter-clockwise
    const fr = !!o.front, out = (from, to, l1, l2, cx) => { const a = ik2(from, to, l1, l2, 1), b = ik2(from, to, l1, l2, -1); return Math.abs(a[0].x - cx) > Math.abs(b[0].x - cx) ? a : b; };
    const hl0 = fr ? { x: hip.x - 0.045 * H, y: hip.y } : hip, hr0 = fr ? { x: hip.x + 0.045 * H, y: hip.y } : hip;
    const [lk, lf] = fr ? out(hl0, o.feet[0], L('thigh'), L('shin'), hip.x) : ik2(hip, o.feet[0], L('thigh'), L('shin'), f); seg(parts.lth, hl0, lk); seg(parts.lsn, lk, lf);
    const [rk, rf] = fr ? out(hr0, o.feet[1], L('thigh'), L('shin'), hip.x) : ik2(hip, o.feet[1], L('thigh'), L('shin'), f); seg(parts.rth, hr0, rk); seg(parts.rsn, rk, rf);
    const arms = o.arms || POSES.stand, hands = o.hands || [];
    const arm = (a, b, tgt, A, B, side) => {
      const s0 = fr ? { x: sh.x + side * 0.085 * H, y: sh.y } : sh;
      if (tgt) { const [el, hd] = fr ? out(s0, tgt, L('upper'), L('fore'), hip.x) : ik2(sh, tgt, L('upper'), L('fore'), -f); seg(a, s0, el); seg(b, el, hd); return hd; }
      if (fr) { const d1 = { x: side * Math.sin(A + 0.3), y: -Math.cos(A + 0.3) }, el = { x: s0.x + d1.x * L('upper'), y: s0.y + d1.y * L('upper') }, hd = { x: el.x + side * 0.02 * H, y: el.y - L('fore') }; seg(a, s0, el); seg(b, el, hd); return hd; }
      const d1 = dirF(A + lean * 0.3, f), el = { x: sh.x + d1.x * L('upper'), y: sh.y + d1.y * L('upper') };
      const d2 = dirF(A + lean * 0.3 + B, f), hd = { x: el.x + d2.x * L('fore'), y: el.y + d2.y * L('fore') };
      seg(a, sh, el); seg(b, el, hd); return hd;
    };
    const hl = arm(parts.lua, parts.lfa, hands[0], arms.lsh, arms.lel, -1), hr = arm(parts.rua, parts.rfa, hands[1], arms.rsh, arms.rel, 1);
    g.userData.hands = { l: hl, r: hr }; g.userData.head = head; g.userData.feet = [lf, rf];
  };
  g.userData.H = H;
  const base = [matFront.color.clone(), matBack.color.clone()];
  g.userData.tint = k => { matFront.color.copy(base[0]).multiplyScalar(k); matBack.color.copy(base[1]).multiplyScalar(k); matFront.emissiveIntensity = 0.12 * glow * k; };
  return g;
}

// Walking with planted feet. d = distance walked along x (px), ground(x) = support height,
// plant(x) = where a foot actually lands (e.g. the centre of a stair). Returns targets for poseIK.
export function walker(d, H, { ground = () => 0, plant = x => x, stride = 0.62, run = 0, face = 1, x0 = 0 } = {}) {
  const S = stride * H, leg = (P.thigh + P.shin) * H, feet = [], phases = [];
  for (let i = 0; i < 2; i++) {
    const u = d / S + 0.5 * i, n = Math.floor(u), fr = u - n, ST = 0.58;
    const X = k => x0 + face * plant((k + 0.29 - 0.5 * i) * S);
    let x, y;
    if (fr < ST) { x = X(n); y = ground(x); }
    else { const s = ease((fr - ST) / (1 - ST)), xa = X(n), xb = X(n + 1); x = mix(xa, xb, s); y = mix(ground(xa), ground(xb), s) + Math.sin(Math.PI * s) * 0.09 * H; }
    feet.push({ x, y }); phases.push(fr);
  }
  const hx = x0 + face * d;
  // hips: low enough for both feet to reach, with a slight bounce
  let hy = Infinity;
  for (const p of feet) { const dx = p.x - hx; hy = Math.min(hy, p.y + Math.sqrt(Math.max(0, (leg * 0.985) ** 2 - dx * dx))); }
  hy -= 0.012 * H;
  const sw = Math.sin((d / S) * Math.PI * 2);
  return {
    hip: { x: hx, y: hy }, feet, face, lean: mix(0.07, 0.3, run), head: -0.05,
    arms: { lsh: -0.45 * sw, lel: mix(0.3, 1.4, run), rsh: 0.45 * sw, rel: mix(0.3, 1.4, run) },
  };
}

export { clamp01 };
