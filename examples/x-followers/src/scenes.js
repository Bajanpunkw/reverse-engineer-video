// 3D scenes for the "X followers" episode. Each is {scene, camera, update(...)}. The Earth comes from the data-center example (city lights → crowd).
import * as THREE from 'three';

const W = 1080, H = 1920;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = x => x * x * (3 - 2 * x);
const expLerp = (a, b, k) => a * Math.pow(b / a, k);

export const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<6;i++){s+=a*snoise(p);p*=2.03;a*=.5;}return s;}
`;

// ---------- Earth from orbit (calibrated on the opening shot of the original's "Magnitude 18" video) ----------
export function makeEarth() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.01, 100);
  const sun = new THREE.Vector3(0.8, 0.9, 0.35).normalize();
  const uni = { P_CC: { value: 0.5 }, P_CF: { value: 15 }, P_ATMI: { value: 0.55 }, P_ATM: { value: 0.03 }, P_LAND: { value: -0.04 },
    sun: { value: sun }, seed: { value: new THREE.Vector3(3.1, 1.7, 5.3) }, night: { value: 0 }, lightsOn: { value: 1 },
    regionC: { value: new THREE.Vector3(0, 0, 1) }, offAngle: { value: 0 }, glare: { value: 0 } };
  const vs = `varying vec3 vP; varying vec3 vW; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 256), new THREE.ShaderMaterial({ uniforms: uni, vertexShader: vs,
    fragmentShader: NOISE + `uniform vec3 sun; uniform vec3 seed; uniform float P_LAND; uniform float night; uniform float lightsOn; uniform vec3 regionC; uniform float offAngle; uniform float glare; varying vec3 vP; varying vec3 vW;
    void main(){
      vec3 p=normalize(vP);
      float n=fbm(p*1.25+seed)+P_LAND; float land=smoothstep(0.015,0.05,n);
      float bn=fbm(p*9.+seed)*0.5+0.5; float beach=smoothstep(-0.008,0.015,n)*(1.-land)*smoothstep(0.35,0.7,bn);
      vec3 ocean=mix(vec3(0.08,0.15,0.28),vec3(0.13,0.22,0.35),smoothstep(-0.25,0.0,n));
      float v=fbm(p*6.+seed*2.)*.5+.5; vec3 olive=mix(vec3(0.20,0.27,0.19),vec3(0.27,0.32,0.22),v); vec3 sand=vec3(0.62,0.55,0.44);
      vec3 col=mix(ocean,sand,beach); col=mix(col,olive,land); col=mix(col,sand*0.85,land*smoothstep(0.03,0.0,n-0.015)*0.35*bn);
      vec3 N=normalize(vW); float lit=clamp(dot(N,sun)*0.6+0.3,0.,1.)*0.82; lit=mix(lit,0.06,night);
      vec3 V=normalize(cameraPosition-vW); float fr=pow(1.-max(dot(N,V),0.),3.);
      col=col*lit; col=mix(col,mix(vec3(0.60,0.58,0.56),vec3(0.05,0.06,0.09),night),clamp(pow(fr,1.4)*1.2,0.,0.7));
      // crowd: colourful specks of people cover land from regionC; offAngle = angular radius of the covered area
      float ang=acos(clamp(dot(p,normalize(regionC)),-1.,1.))+fbm(p*7.+seed)*0.06;
      float cr=land*(1.-smoothstep(offAngle-0.02,offAngle+0.02,ang));
      float s1=snoise(p*260.)*.5+.5, s2=snoise(p*260.+7.3)*.5+.5, s3=snoise(p*520.+2.)*.5+.5;
      vec3 cc=mix(mix(vec3(0.80,0.22,0.20),vec3(0.20,0.36,0.72),step(0.5,s1)),vec3(0.95,0.78,0.30),step(0.6,s2));
      cc=mix(cc,vec3(0.92,0.90,0.86),step(0.7,s3)*0.6);
      col=mix(col,cc*clamp(lit*1.5,0.,1.),cr*0.95);
      col+=vec3(1.0,0.78,0.45)*cr*lightsOn*0.12;                      // lightsOn here = warm glow ("everyone who ever lived")
      col=mix(col,vec3(1.0,0.86,0.62),glare*0.8*clamp(dot(N,sun)*0.8+0.3,0.,1.)); col*=1.+glare*0.35;
      gl_FragColor=vec4(col,1.);
      #include <colorspace_fragment>
    }` }));
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.006, 256, 256), new THREE.ShaderMaterial({ uniforms: uni, vertexShader: vs, transparent: true, depthWrite: false,
    fragmentShader: NOISE + `uniform vec3 sun; uniform vec3 seed; uniform float P_CF; uniform float P_CC; uniform float night; uniform vec3 regionC; uniform float offAngle; varying vec3 vP; varying vec3 vW;
    void main(){
      vec3 p=normalize(vP);
      float cover=smoothstep(-0.15,0.35,fbm(p*1.6+seed*0.7+vec3(9.)));
      float c=fbm(p*P_CF+seed*3.)*0.55+fbm(p*P_CF*2.8+seed)*0.30+fbm(p*P_CF*7.+seed*1.3)*0.15;
      float a=smoothstep(0.0,0.20,c+cover*0.75-P_CC);
      vec3 N=normalize(vW); float lit=clamp(dot(N,sun)*0.7+0.45,0.,1.); lit=mix(lit,0.05,night);
      float inner=smoothstep(-0.05,0.35,c+cover*0.75-P_CC+fbm(p*P_CF*5.)*0.15); vec3 col=vec3(0.84,0.82,0.79)*lit*mix(0.55,1.0,inner);
      vec3 V=normalize(cameraPosition-vW); float fr=pow(1.-max(dot(N,V),0.),3.); col=mix(col,vec3(0.75,0.73,0.70)*(1.-night*0.9),clamp(fr,0.,0.6));
      float angC=acos(clamp(dot(p,normalize(regionC)),-1.,1.)); float clr=1.-smoothstep(offAngle-0.05,offAngle+0.1,angC)*1.;
      gl_FragColor=vec4(col,a*0.85*(1.-night*0.5)*(1.-0.85*clr));
      #include <colorspace_fragment>
    }` }));
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1.12, 128, 128), new THREE.ShaderMaterial({ uniforms: uni, transparent: true, side: THREE.BackSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float P_ATM; uniform float P_ATMI; uniform float night; varying vec3 vW;
    void main(){ vec3 d=normalize(vW-cameraPosition); vec3 c=-cameraPosition; float t=dot(c,d); float b=length(c-d*t);
      float g=b>1.?exp(-(b-1.)/P_ATM):1.; gl_FragColor=vec4(mix(vec3(0.93,0.70,0.52),vec3(0.25,0.35,0.6),night)*g*P_ATMI,1.); }` }));
  scene.add(planet, clouds, atm);
  planet.rotation.set(0.6, 3.0, 0); clouds.rotation.copy(planet.rotation);
  return {
    scene, camera, uni,
    // k: 0..1 through the scene; slow camera drift like the original
    update(k, o = {}) {
      const d = o.dist ?? 2.8, drift = o.drift ?? 0.06;
      camera.position.set(Math.sin(k * drift) * 0.4, 0, d);
      camera.lookAt(0, (o.lookY ?? 0.72), 0);
      planet.rotation.y = 3.0 + k * (o.spin ?? 0.05); clouds.rotation.y = planet.rotation.y + k * 0.01;
      uni.night.value = o.night ?? 0; uni.lightsOn.value = o.lightsOn ?? 1;
      uni.offAngle.value = o.offAngle ?? 0; uni.glare.value = o.glare ?? 0;
      if (o.regionWorld) { const v = o.regionWorld.clone().normalize(); planet.updateMatrixWorld(); uni.regionC.value.copy(planet.worldToLocal(v.clone()).normalize()); }
      if (o.camX != null) camera.position.x = o.camX;
      if (o.sunDir) uni.sun.value.copy(o.sunDir).normalize();
    },
  };
}

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }


// ---------- Street → stadium → city: followers gather at your house ----------
// The first 2048 people are 3D mannequins (they pop in one by one), the rest are coloured points: the stadium (65,536 seats), then every street.
const SHIRTS = [0xa8443c, 0x3f5a86, 0xc9a24a, 0x5b7a4a, 0x8a5a8a, 0xd8d2c6, 0x2f3338, 0xb86a3c, 0x6c8fa8];
export function makeCity() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 6000);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: NOISE + `varying vec3 vD; void main(){ float h=clamp(vD.y,0.,1.); vec3 c=mix(vec3(0.86,0.78,0.70),vec3(0.36,0.40,0.47),pow(h,0.5));
      float cl=smoothstep(0.1,0.6,fbm(vD*vec3(3.,9.,3.)))*smoothstep(0.02,0.12,h)*0.55; c=mix(c,vec3(0.30,0.31,0.34),cl); gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }` }));
  scene.add(sky);
  scene.fog = new THREE.Fog(0xc4b6a4, 700, 5200);
  scene.add(new THREE.HemisphereLight(0xe6dccb, 0x5b4a36, 1.4));
  const sun = new THREE.DirectionalLight(0xffe2bb, 1.5); sun.position.set(-300, 400, 200); scene.add(sun);

  const rng = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const fieldTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7a5d3e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${90 + rng() * 40},${70 + rng() * 30},45,0.25)`; g.fillRect(rng() * w, rng() * h, 3, 3); } });
  fieldTex.wrapS = fieldTex.wrapT = THREE.RepeatWrapping; fieldTex.repeat.set(30, 30);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ map: fieldTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  const BX = 80, BZ = 60, ST = 12, NX = 14, NZ = 16;
  const ox = -NX / 2 * (BX + ST), oz = -NZ / 2 * (BZ + ST);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(NX * (BX + ST), NZ * (BZ + ST)), new THREE.MeshStandardMaterial({ color: 0x5d6a40, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.04; scene.add(lawn);
  const roadTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#45474b'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9c4b5'; for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 1, y, 2, 28); });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  const roadX = i => ox + i * (BX + ST) - ST / 2, roadZ = j => oz + j * (BZ + ST) - ST / 2;
  for (let i = 0; i <= NX; i++) { const L = NZ * (BZ + ST); const m = new THREE.MeshStandardMaterial({ map: roadTex.clone(), roughness: 0.9 }); m.map.repeat.set(1, L / 40);
    const r = new THREE.Mesh(new THREE.PlaneGeometry(ST, L), m); r.rotation.x = -Math.PI / 2; r.position.set(roadX(i), 0.1, 0); scene.add(r); }
  for (let j = 0; j <= NZ; j++) { const L = NX * (BX + ST); const m = new THREE.MeshStandardMaterial({ map: roadTex.clone(), roughness: 0.9 }); m.map.repeat.set(1, L / 40);
    const r = new THREE.Mesh(new THREE.PlaneGeometry(ST, L), m); r.rotation.x = -Math.PI / 2; r.rotation.z = Math.PI / 2; r.position.set(0, 0.12, roadZ(j)); scene.add(r); }

  // stadium on 2×3 blocks in the middle: elliptical bowl, marked pitch
  const stX = ox + (NX / 2) * (BX + ST) - ST / 2, stZ = oz + (NZ / 2) * (BZ + ST) - ST / 2 + 20;
  const A0 = 46, B0 = 64, A1 = 92, B1 = 112, HS = 30;
  const inSt = (x, z) => ((x - stX) / (A1 + 14)) ** 2 + ((z - stZ) / (B1 + 14)) ** 2 < 1;
  { const seg = 96, pos = [], idx = [];
    for (let i = 0; i <= seg; i++) { const u = i / seg * Math.PI * 2, c = Math.cos(u), s = Math.sin(u);
      pos.push(stX + A0 * c, 1.5, stZ + B0 * s, stX + A1 * c, HS, stZ + B1 * s, stX + A1 * c, 0, stZ + B1 * s); }
    for (let i = 0; i < seg; i++) { const a = i * 3, b = a + 3; idx.push(a, b, a + 1, b, b + 1, a + 1, a + 1, b + 1, a + 2, b + 1, b + 2, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const bowl = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x9a9ca0, roughness: 0.85, side: THREE.DoubleSide })); scene.add(bowl);
    const ft = canvasTex(256, 384, (c, w, h) => { c.fillStyle = '#5f7d45'; c.fillRect(0, 0, w, h); for (let k = 0; k < 12; k++) { c.fillStyle = k % 2 ? '#668449' : '#5a7841'; c.fillRect(0, k * h / 12, w, h / 12); }
      c.strokeStyle = '#e8e4da'; c.lineWidth = 3; c.strokeRect(24, 30, w - 48, h - 60); c.beginPath(); c.moveTo(24, h / 2); c.lineTo(w - 24, h / 2); c.stroke(); c.beginPath(); c.arc(w / 2, h / 2, 30, 0, 7); c.stroke(); });
    const field = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ map: ft, roughness: 1 }));
    field.rotation.x = -Math.PI / 2; field.scale.set(A0, B0, 1); field.position.set(stX, 1.4, stZ); scene.add(field); }

  // houses and trees (same as the data-center suburb), except where the stadium is
  const houses = [];
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const bx = ox + i * (BX + ST), bz = oz + j * (BZ + ST);
    for (let k = 0; k < 8; k++) { const x = bx + 10 + (k % 4) * 19 + rng() * 2, z = bz + (k < 4 ? 12 : BZ - 12); if (!inSt(x, z)) houses.push([x, z, k < 4 ? 0 : Math.PI, rng()]); } }
  const N = houses.length, tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3(), col = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0);
  const wallTex = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#e4d9c8'; g.fillRect(0, 0, w, h); g.fillStyle = '#3c4148'; for (const x of [34, 104, 174]) g.fillRect(x, 30, 44, 34); g.fillStyle = '#cbbfae'; g.fillRect(0, h - 8, w, 8); });
  const wallM = new THREE.MeshStandardMaterial({ color: 0xe4d9c8, roughness: .9 }), winM = new THREE.MeshStandardMaterial({ map: wallTex, roughness: .9 });
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(11, 4.2, 9), [wallM, wallM, wallM, wallM, winM, winM], N);
  const roofGeo = new THREE.CylinderGeometry(0.1, 7.2, 3, 4, 1); roofGeo.rotateY(Math.PI / 4); roofGeo.scale(1.08, 1, 0.9);
  const roof = new THREE.InstancedMesh(roofGeo, new THREE.MeshStandardMaterial({ roughness: .9 }), N); const roofCols = [0x9a5a44, 0x7e4a3a, 0x8f6a58, 0x6f5448];
  houses.forEach(([x, z, r, u], k) => { q.setFromAxisAngle(Y, r); body.setMatrixAt(k, tmpM.compose(pos.set(x, 2.1, z), q, one)); roof.setMatrixAt(k, tmpM.compose(pos.set(x, 5.7, z), q, one)); roof.setColorAt(k, col.setHex(roofCols[Math.floor(u * 4)])); });
  scene.add(body, roof);
  const T = 900, crown = new THREE.InstancedMesh(new THREE.SphereGeometry(3.2, 12, 8), new THREE.MeshStandardMaterial({ color: 0x7d8a3e, roughness: 1 }), T);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.3, 4, 5), new THREE.MeshStandardMaterial({ color: 0x5a4a3a }), T);
  for (let k = 0; k < T; k++) { const i = Math.floor(rng() * NX), j = Math.floor(rng() * NZ); const x = ox + i * (BX + ST) + rng() * BX, z = oz + j * (BZ + ST) + BZ / 2 + (rng() - .5) * 14; const s = inSt(x, z) ? 0 : 0.8 + rng() * 0.5;
    crown.setMatrixAt(k, tmpM.compose(pos.set(x, 5.5 * s, z), q.identity(), new THREE.Vector3(s, s, s))); trunk.setMatrixAt(k, tmpM.compose(pos.set(x, 2, z), q.identity(), new THREE.Vector3(s, s, s))); }
  scene.add(crown, trunk);

  // your house: 4 blocks north of the stadium in the same column, so the stadium is revealed behind it; door and windows face the street
  const hi = NX / 2 - 1, hj = NZ / 2 - 4, hbz = oz + hj * (BZ + ST);
  const myH = houses.reduce((b, h) => (h[2] === 0 && Math.abs(h[1] - (hbz + 12)) < 1 && Math.abs(h[0] - (ox + hi * (BX + ST) + 31)) < Math.abs(b[0] - (ox + hi * (BX + ST) + 31)) ? h : b), houses[0]);
  const [hx, hz] = myH, wallZ = hz - 4.5, streetZ = roadZ(hj);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1), new THREE.MeshStandardMaterial({ color: 0x5c4636, roughness: .8 })); door.rotation.y = Math.PI; door.position.set(hx, 1.05, wallZ - 0.02); scene.add(door);
  for (const dx of [-3.4, 3.4]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x8fa3b3, roughness: .3, metalness: .2 })); w.rotation.y = Math.PI; w.position.set(hx + dx, 2.2, wallZ - 0.02); scene.add(w); }

  // mom: a mannequin waving
  const skin = new THREE.MeshStandardMaterial({ color: 0xe9e4dc, roughness: 0.6 });
  const momX = hx - 1.6, momZ = wallZ - 3.2;
  const mom = new THREE.Group(); mom.position.set(momX, 0, momZ); mom.rotation.y = Math.PI;
  const mb = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.0, 4, 10), new THREE.MeshStandardMaterial({ color: 0xa8443c, roughness: .8 })); mb.position.y = 0.75; mom.add(mb);
  const mh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), skin); mh.position.y = 1.63; mom.add(mh);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.55, 3, 8), skin); arm.geometry.translate(0, 0.33, 0); const sh = new THREE.Group(); sh.position.set(0.24, 1.3, 0); sh.add(arm); mom.add(sh);
  const arm2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.55, 3, 8), skin); arm2.position.set(-0.24, 0.98, 0); arm2.rotation.z = -0.12; mom.add(arm2);
  scene.add(mom);

  // spots for people: your yard, the street and the yards opposite; ordered outward from mom
  const spots = [];
  const blockedByHouse = (x, z) => houses.some(([X, Z]) => Math.abs(x - X) < 6.2 && Math.abs(z - Z) < 5.2);
  for (let x = hx - 260; x <= hx + 260; x += 0.95) for (let z = hz - 34; z <= wallZ - 0.6; z += 0.95) {
    const jx = x + (rng() - .5) * 0.5, jz = z + (rng() - .5) * 0.5;
    if (Math.abs(jx - momX) < 0.7 && Math.abs(jz - momZ) < 0.7) continue;
    if (blockedByHouse(jx, jz)) continue;
    spots.push([jx, jz, Math.hypot((jx - momX) * 1, (jz - momZ) * 1.6) + rng() * 3]);
  }
  spots.sort((a, b) => a[2] - b[2]);
  const NM = 2047;   // + mom = 2048
  const pb = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 1.0, 3, 8), new THREE.MeshStandardMaterial({ roughness: .85 }), NM);
  const ph = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 10, 8), skin, NM);
  const people = spots.slice(0, NM).map(([x, z], i) => ({ x, z, h: 0.9 + rng() * 0.2, ry: rng() * 6.28, arrive: 2 + Math.log2(i + 2) }));
  people.forEach((p, i) => pb.setColorAt(i, col.setHex(SHIRTS[Math.floor(rng() * SHIRTS.length)])));
  scene.add(pb, ph);
  const meshR = Math.max(...people.map(p => Math.abs(p.x - hx)));

  // points: the stadium (65,536 seats) and every street in town; colour = shirts
  function points(arr, size) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr.flatMap(p => [p[0], p[1], p[2]]), 3));
    const c = new Float32Array(arr.length * 3); arr.forEach((p, i) => { col.setHex(SHIRTS[Math.floor(rng() * SHIRTS.length)]); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; });
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setDrawRange(0, 0);
    const m = new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, fog: true })); scene.add(m); return m; }
  const seats = []; for (let i = 0; i < 65536; i++) { const u = rng() * Math.PI * 2, v = Math.sqrt(0.04 + rng() * 0.96); const a = A0 + (A1 - A0) * v, b = B0 + (B1 - B0) * v;
    seats.push([stX + a * Math.cos(u), 1.5 + (HS - 1.5) * v + 0.8, stZ + b * Math.sin(u), rng()]); }
  seats.sort((p, q) => p[3] - q[3]);
  const seatPts = points(seats, 2.5);
  const street = [];
  for (let i = 0; i <= NX; i++) for (let z = oz - ST; z < oz + NZ * (BZ + ST); z += 1.7) for (let w = -5; w <= 5; w += 1.7) street.push([roadX(i) + w + (rng() - .5), 1, z + (rng() - .5)]);
  for (let j = 0; j <= NZ; j++) for (let x = ox - ST; x < ox + NX * (BX + ST); x += 1.7) for (let w = -5; w <= 5; w += 1.7) street.push([x + (rng() - .5), 1, roadZ(j) + w + (rng() - .5)]);
  const streetF = street.filter(([x, , z]) => !(Math.abs(z - streetZ) < 8 && Math.abs(x - hx) < meshR + 2) && !inSt(x, z)).map(p => [p[0], p[1], p[2], Math.hypot(p[0] - stX, p[2] - stZ) + rng() * 120]);
  streetF.sort((a, b) => a[3] - b[3]);
  const streetPts = points(streetF, 3);

  const momP = new THREE.Vector3(momX, 1.2, momZ), stP = new THREE.Vector3(stX, 8, stZ), midP = momP.clone().lerp(stP, 0.45), cityP = new THREE.Vector3(0, 0, 0);
  const KEYS = [ // t (video s), distance, target, azimuth, elevation
    [2, 9.5, momP.clone().add(new THREE.Vector3(0.6, -0.55, 0)), Math.PI + 0.3, 0.10],
    [7, 27, momP.clone().add(new THREE.Vector3(0, 0, -2)), Math.PI + 0.35, 0.26],
    [12, 95, momP.clone().add(new THREE.Vector3(0, 0, 12)), Math.PI + 0.3, 0.40],
    [15.5, 270, momP.clone().lerp(stP, 0.5), Math.PI + 0.25, 0.50],
    [19, 520, stP, Math.PI + 0.2, 0.62],
    [22, 1250, cityP, Math.PI + 0.2, 0.90],
    [24.5, 1700, cityP, Math.PI + 0.2, 1.00],
  ];
  const tv = new THREE.Vector3();
  function camAt(t) { let a = KEYS[0], b = KEYS[KEYS.length - 1];
    for (let k = 0; k < KEYS.length - 1; k++) if (t >= KEYS[k][0] && t <= KEYS[k + 1][0]) { a = KEYS[k]; b = KEYS[k + 1]; break; }
    if (t < KEYS[0][0]) b = a; if (t > b[0]) a = b;
    const k = a === b ? 0 : ease(clamp01((t - a[0]) / (b[0] - a[0])));
    const d = expLerp(a[1], b[1], k), az = lerp(a[3], b[3], k), el = lerp(a[4], b[4], k); tv.copy(a[2]).lerp(b[2], k);
    camera.position.set(tv.x + Math.sin(az) * Math.cos(el) * d, tv.y + Math.sin(el) * d, tv.z + Math.cos(az) * Math.cos(el) * d); camera.lookAt(tv);
    camera.near = Math.max(0.1, d * 0.02); camera.updateProjectionMatrix(); }

  return { scene, camera,
    update(t, F) {
      camAt(Math.max(t, 0.5));
      sh.rotation.z = -0.3 + 0.35 * Math.sin(t * 7);                       // mom waves
      people.forEach((p, i) => { const s = clamp01((t - p.arrive) / 0.35) * (i + 2 <= F + 0.5 ? 1 : 0); const k = ease(s);
        q.setFromAxisAngle(Y, p.ry); const b = 0.02 * Math.sin(t * 5 + i);
        pb.setMatrixAt(i, tmpM.compose(pos.set(p.x, 0.75 * p.h + b, p.z), q, new THREE.Vector3(k, k * p.h, k)));
        ph.setMatrixAt(i, tmpM.compose(pos.set(p.x, 1.63 * p.h + b, p.z), q, new THREE.Vector3(k, k, k))); });
      pb.instanceMatrix.needsUpdate = ph.instanceMatrix.needsUpdate = true;
      seatPts.geometry.setDrawRange(0, Math.floor(clamp01((F - 2048) / 65536) * seats.length));
      streetPts.geometry.setDrawRange(0, Math.floor(clamp01((F - 67584) / 400000) * streetF.length));
    } };
}

// ---------- Galaxy: a spiral of points ----------
export function makeGalaxy() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 5000);
  const rng = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += rng(); return (u - 2) / 0.58; };
  const pos = [], colA = [], c = new THREE.Color();
  for (let i = 0; i < 110000; i++) {
    const core = rng() < 0.12; let x, y, z;
    if (core) { const r = Math.abs(gauss()) * 9; const a = rng() * 6.283; x = r * Math.cos(a); z = r * Math.sin(a) * 0.9; y = gauss() * 2.5 * Math.exp(-r / 14);
      c.setRGB(1.0, 0.82 + rng() * 0.1, 0.6 + rng() * 0.15); }
    else { const r = 5 + Math.pow(rng(), 0.9) * 60; const arm = rng() < 0.5 ? 0 : Math.PI; const a = arm + Math.log(r / 5) * 2.2 + gauss() * 0.16 * (1 + r / 80);
      x = r * Math.cos(a) + gauss() * 0.9; z = r * Math.sin(a) + gauss() * 0.9; y = gauss() * 0.6;
      const k = rng(); if (k < 0.06) c.setRGB(1.0, 0.55, 0.65); else c.setRGB(0.72 + rng() * 0.2, 0.8 + rng() * 0.15, 1.0); }
    pos.push(x, y, z); colA.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
  const dotTex = canvasTex(32, 32, (x) => { const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); });
  const gal = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.42, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
  gal.rotation.x = 0.0; scene.add(gal);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 256, (x) => { const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,215,160,.9)'); gr.addColorStop(.3, 'rgba(255,190,130,.25)'); gr.addColorStop(1, 'rgba(255,180,120,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(40, 40, 1); scene.add(glow);
  const bg = []; for (let i = 0; i < 3000; i++) { const v = new THREE.Vector3(gauss(), gauss(), gauss()).normalize().multiplyScalar(1500); bg.push(v.x, v.y, v.z); }
  const bgG = new THREE.BufferGeometry(); bgG.setAttribute('position', new THREE.Float32BufferAttribute(bg, 3));
  scene.add(new THREE.Points(bgG, new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, color: 0x9a9a9a })));
  return { scene, camera, update(k) {
    const d = expLerp(120, 200, ease(k)), el = lerp(1.0, 1.15, ease(k));
    camera.position.set(Math.sin(0.3 + k * 0.25) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(0.3 + k * 0.25) * Math.cos(el) * d);
    camera.lookAt(0, 0, 0); gal.rotation.y = -k * 0.15;
  } };
}
