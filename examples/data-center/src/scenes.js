// 3D scenes. Each is {scene, camera, update(t, P)}; t = story seconds, P = power in watts.
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
      // city lights on the night side: scattered over land, denser near coasts
      float cityMask=land*smoothstep(0.5,0.8,fbm(p*14.+seed*4.)*0.5+0.5+smoothstep(0.08,0.0,n-0.015)*0.25);
      float sparkle=smoothstep(0.72,0.95,snoise(p*420.)*0.5+0.5)+0.5*smoothstep(0.8,0.97,snoise(p*900.+3.)*0.5+0.5);
      float ang=acos(clamp(dot(p,normalize(regionC)),-1.,1.));
      float on=smoothstep(offAngle-0.03,offAngle+0.03,ang);          // everything closer than offAngle goes dark
      col+=vec3(1.0,0.74,0.40)*cityMask*(0.06+sparkle*1.6)*night*lightsOn*on;
      col=mix(col,vec3(1.0,0.86,0.62),glare*0.8*clamp(dot(N,sun)*0.8+0.3,0.,1.)); col*=1.+glare*0.35;
      gl_FragColor=vec4(col,1.);
      #include <colorspace_fragment>
    }` }));
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.006, 256, 256), new THREE.ShaderMaterial({ uniforms: uni, vertexShader: vs, transparent: true, depthWrite: false,
    fragmentShader: NOISE + `uniform vec3 sun; uniform vec3 seed; uniform float P_CF; uniform float P_CC; uniform float night; varying vec3 vP; varying vec3 vW;
    void main(){
      vec3 p=normalize(vP);
      float cover=smoothstep(-0.15,0.35,fbm(p*1.6+seed*0.7+vec3(9.)));
      float c=fbm(p*P_CF+seed*3.)*0.55+fbm(p*P_CF*2.8+seed)*0.30+fbm(p*P_CF*7.+seed*1.3)*0.15;
      float a=smoothstep(0.0,0.20,c+cover*0.75-P_CC);
      vec3 N=normalize(vW); float lit=clamp(dot(N,sun)*0.7+0.45,0.,1.); lit=mix(lit,0.05,night);
      float inner=smoothstep(-0.05,0.35,c+cover*0.75-P_CC+fbm(p*P_CF*5.)*0.15); vec3 col=vec3(0.84,0.82,0.79)*lit*mix(0.55,1.0,inner);
      vec3 V=normalize(cameraPosition-vW); float fr=pow(1.-max(dot(N,V),0.),3.); col=mix(col,vec3(0.75,0.73,0.70)*(1.-night*0.9),clamp(fr,0.,0.6));
      gl_FragColor=vec4(col,a*0.85*(1.-night*0.5));
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

// ---------- Data center: one GPU → server → rack → row → hall (one continuous pull-back) ----------
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export function makeHall() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6f757d);
  scene.fog = new THREE.FogExp2(0x737981, 0.03);
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.005, 400);

  scene.add(new THREE.HemisphereLight(0xd6dce3, 0x5a5650, 1.5));
  const key = new THREE.DirectionalLight(0xfff1e0, 1.6); key.position.set(4, 9, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb4d8, 0.7); rim.position.set(-6, 4, -8); scene.add(rim);

  const metal = new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.7, roughness: 0.38 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3e44, metalness: 0.3, roughness: 0.7 });
  const pcb = new THREE.MeshStandardMaterial({ color: 0x1d2a22, roughness: 0.8 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc8a250, metalness: 0.9, roughness: 0.3 });
  const heat = new THREE.MeshStandardMaterial({ color: 0xb4b8be, metalness: 0.25, roughness: 0.45, emissive: 0xff5a20, emissiveIntensity: 0 });

  // GPU module (≈ 0.11 × 0.03 × 0.15 m): board, finned heatsink, contacts
  function gpuModule() {
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.004, 0.15), pcb); g.add(board);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.006, 0.12), heat); base.position.y = 0.005; g.add(base);
    const finGeo = new THREE.BoxGeometry(0.088, 0.024, 0.0012);
    const fins = new THREE.InstancedMesh(finGeo, heat, 30);
    for (let i = 0; i < 30; i++) { const m = new THREE.Matrix4().makeTranslation(0, 0.02, -0.058 + i * 0.004); fins.setMatrixAt(i, m); }
    g.add(fins);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.002, 0.008), gold); edge.position.set(0, 0.001, 0.078); g.add(edge);
    return g;
  }
  // 8-GPU server (open chassis, pulled out of the rack)
  const server = new THREE.Group();
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.006, 0.78), dark); server.add(chassis);
  for (const sx of [-1, 1]) { const wall = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.09, 0.78), dark); wall.position.set(sx * 0.227, 0.045, 0); server.add(wall); }
  const gpus = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { const m = gpuModule(); m.position.set(-0.165 + c * 0.11, 0.004, -0.05 + r * 0.17); server.add(m); gpus.push(m); }
  const fanRow = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.04), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.9 })); fanRow.position.set(0, 0.035, -0.32); server.add(fanRow);

  // rack front panel: vent mesh + LEDs (canvas texture)
  const frontTex = canvasTex(256, 852, (g, w, h) => {
    g.fillStyle = '#34383e'; g.fillRect(0, 0, w, h);
    for (let u = 0; u < 42; u++) { const y = 6 + u * 20; g.fillStyle = u % 6 === 0 ? '#464b52' : '#3c4147'; g.fillRect(8, y, w - 16, 17);
      g.fillStyle = '#25282c'; for (let x = 30; x < w - 40; x += 7) g.fillRect(x, y + 4, 4, 9);
      g.fillStyle = Math.random() < .7 ? '#5fe08a' : '#4aa3ff'; g.fillRect(w - 28, y + 6, 5, 5);
      if (Math.random() < .5) { g.fillStyle = '#f2b04a'; g.fillRect(w - 20, y + 6, 4, 4); } }
  });
  const rackFront = new THREE.MeshStandardMaterial({ map: frontTex, emissiveMap: frontTex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.8 });
  const rackSide = new THREE.MeshStandardMaterial({ color: 0x3b3f45, roughness: 0.75, metalness: 0.2 });
  const rackGeo = new THREE.BoxGeometry(0.6, 2.0, 1.1);
  const rackMats = [rackSide, rackSide, rackSide, rackSide, rackFront, rackSide];

  // hall: 10 rows × 24 racks, 1.4 m aisles; "our" rack is the first in row 0
  const ROWS = 10, PER = 24, rackW = 0.62, pitch = 1.1 + 1.4;
  const racks = new THREE.InstancedMesh(rackGeo, rackMats, ROWS * PER);
  let i = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < PER; c++) {
    const m = new THREE.Matrix4().makeTranslation(c * rackW, 1.0, -r * pitch);
    if (r === 0 && c === 0) m.makeTranslation(0, -50, 0); // our rack is separate, with the server pulled out
    racks.setMatrixAt(i++, m);
  }
  scene.add(racks);
  const myRack = new THREE.Mesh(rackGeo, rackMats); myRack.position.set(0, 1.0, 0); scene.add(myRack);
  server.position.set(0, 1.18, 0.55 + 0.32); scene.add(server); // server pulled forward out of the rack

  // floor (light tiled concrete), cable trays and lamps
  const floorTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#9a9ea4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#868a90'; g.lineWidth = 3; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); } });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(40, 40);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(7, 0, -10); scene.add(floor);
  const lampGeo = new THREE.BoxGeometry(0.15, 0.03, 2.4); const lampMat = new THREE.MeshBasicMaterial({ color: 0xf4f1ea });
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, ROWS * 6); let li = 0;
  for (let r = 0; r < ROWS; r++) for (let k = 0; k < 6; k++) lamps.setMatrixAt(li++, new THREE.Matrix4().makeTranslation(k * 2.6, 3.6, -r * pitch + 1.25));
  const trayGeo = new THREE.BoxGeometry(PER * rackW, 0.06, 0.4); const trayMat = new THREE.MeshStandardMaterial({ color: 0x6d7178, metalness: 0.6, roughness: 0.4 });
  for (let r = 0; r < ROWS; r++) { const tr = new THREE.Mesh(trayGeo, trayMat); tr.position.set(PER * rackW / 2 - 0.3, 2.35, -r * pitch); scene.add(tr); }

  // warm heat haze over hot cards — simple sprites
  const hazeTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,170,110,.55)'); gr.addColorStop(1, 'rgba(255,170,110,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const hazes = []; for (let k = 0; k < 40; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: hazeTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    s.userData = { ph: Math.random(), x: (Math.random() - .5) * 0.4, z: (Math.random() - .5) * 0.3 }; s.scale.setScalar(0.06); server.add(s); hazes.push(s); }

  // camera path: from one card to the whole hall. Keys are story time (s).
  const target0 = new THREE.Vector3(); gpus[5].getWorldPosition(target0);
  const KEYS = [ // t, distance, target (x,y,z), azimuth, elevation
    [5, 0.22, target0.clone(), 0.55, 0.75],
    [12, 0.55, target0.clone().lerp(server.getWorldPosition(new THREE.Vector3()), 0.6), 0.65, 0.8],
    [16, 1.6, new THREE.Vector3(0, 1.15, 0.6), 0.8, 0.42],
    [20, 4.5, new THREE.Vector3(1.5, 1.1, 0.2), 0.95, 0.30],
    [24, 11, new THREE.Vector3(5, 1.0, -3), 1.0, 0.42],
    [29, 22, new THREE.Vector3(7, 0.8, -10), 0.95, 0.70],
  ];
  const tmp = new THREE.Vector3();
  function camAt(t) {
    let a = KEYS[0], b = KEYS[KEYS.length - 1];
    for (let k = 0; k < KEYS.length - 1; k++) if (t >= KEYS[k][0] && t <= KEYS[k + 1][0]) { a = KEYS[k]; b = KEYS[k + 1]; break; }
    if (t < KEYS[0][0]) b = a; if (t > b[0]) a = b;
    const k = a === b ? 0 : ease(clamp01((t - a[0]) / (b[0] - a[0])));
    const dist = expLerp(a[1], b[1], k), az = lerp(a[3], b[3], k), el = lerp(a[4], b[4], k);
    tmp.copy(a[2]).lerp(b[2], k);
    camera.position.set(tmp.x + Math.sin(az) * Math.cos(el) * dist, tmp.y + Math.sin(el) * dist, tmp.z + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(tmp);
    camera.near = Math.max(0.003, dist * 0.02); camera.updateProjectionMatrix();
  }

  return {
    scene, camera,
    update(t, P) {
      camAt(t);
      // heat: from 700 W (cold) to ~200 kW (glowing heatsinks)
      const hot = clamp01((Math.log10(P) - Math.log10(5e4)) / (Math.log10(1e6) - Math.log10(5e4)));
      heat.emissiveIntensity = hot * 0.5;
      rackFront.emissiveIntensity = 0.35 + hot * 0.25;
      scene.fog.density = lerp(0.03, 0.02, clamp01((t - 16) / 10));
      for (const s of hazes) { const u = (t * 0.35 + s.userData.ph) % 1; s.position.set(s.userData.x, 0.03 + u * 0.12, s.userData.z);
        s.material.opacity = hot * Math.sin(u * Math.PI) * 0.7; s.scale.setScalar(0.04 + u * 0.08); }
    },
  };
}

// ---------- Suburb with the data center: roof → building → town from above → dusk and blackout ----------
export function makeTown() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 6000);
  // sky: warm overcast gradient, darkens towards night
  const skyU = { night: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float night; varying vec3 vD; void main(){ float h=clamp(vD.y,0.,1.);
      vec3 day=mix(vec3(0.80,0.72,0.58),vec3(0.24,0.26,0.30),pow(h,0.45)); vec3 nt=mix(vec3(0.16,0.13,0.15),vec3(0.03,0.04,0.07),pow(h,0.45));
      gl_FragColor=vec4(mix(day,nt,night),1.);
      #include <colorspace_fragment>
    }` }));
  scene.add(sky);
  scene.fog = new THREE.Fog(0xb8a88e, 250, 2600);
  const hemi = new THREE.HemisphereLight(0xe6dccb, 0x5b4a36, 1.4); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2bb, 1.5); sun.position.set(-300, 400, 200); scene.add(sun);

  // ground: fields + town lawn
  const fieldTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7a5d3e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${90 + Math.random() * 40},${70 + Math.random() * 30},${45},0.25)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } });
  fieldTex.wrapS = fieldTex.wrapT = THREE.RepeatWrapping; fieldTex.repeat.set(30, 30);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ map: fieldTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  // town: 80×60 m blocks, 12 m streets; 14×16 block grid around the data center
  const BX = 80, BZ = 60, ST = 12, NX = 14, NZ = 16;
  const ox = -NX / 2 * (BX + ST), oz = -NZ / 2 * (BZ + ST);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(NX * (BX + ST), NZ * (BZ + ST)), new THREE.MeshStandardMaterial({ color: 0x6f7646, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.04; scene.add(lawn);
  const roadTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#45474b'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9c4b5'; for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 1, y, 2, 28); });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9 });
  for (let i = 0; i <= NX; i++) { const L = NZ * (BZ + ST); const r = new THREE.Mesh(new THREE.PlaneGeometry(ST, L), roadMat.clone()); r.material.map = roadTex.clone(); r.material.map.repeat.set(1, L / 40); r.material.map.needsUpdate = true;
    r.rotation.x = -Math.PI / 2; r.position.set(ox + i * (BX + ST) - ST / 2, 0.1, 0); scene.add(r); }
  for (let j = 0; j <= NZ; j++) { const L = NX * (BX + ST); const r = new THREE.Mesh(new THREE.PlaneGeometry(ST, L), roadMat.clone()); r.material.map = roadTex.clone(); r.material.map.repeat.set(1, L / 40); r.material.map.needsUpdate = true;
    r.rotation.x = -Math.PI / 2; r.rotation.z = Math.PI / 2; r.position.set(0, 0.25, oz + j * (BZ + ST) - ST / 2); scene.add(r); }

  // the data center takes 2×3 blocks in the middle
  const dcW = 2 * BX + ST, dcD = 3 * BZ + 2 * ST, dcH = 16;
  const dcX = ox + (NX / 2 - 1) * (BX + ST) + dcW / 2 - ST / 2 + 3, dcZ = oz + (NZ / 2 - 1) * (BZ + ST) + dcD / 2 - ST / 2;
  const inDC = (x, z) => Math.abs(x - dcX) < dcW / 2 + 6 && Math.abs(z - dcZ) < dcD / 2 + 6;
  const dcMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.8, emissive: 0xbfd8ff, emissiveIntensity: 0 });
  const dc = new THREE.Mesh(new THREE.BoxGeometry(dcW, dcH, dcD), dcMat);
  dc.position.set(dcX, dcH / 2, dcZ); scene.add(dc);
  const band = new THREE.Mesh(new THREE.BoxGeometry(dcW + 0.4, 1.2, dcD + 0.4), new THREE.MeshStandardMaterial({ color: 0x7d8288 })); band.position.set(dcX, dcH - 0.9, dcZ); // cornice top 0.3 m below the roof to avoid z-fighting scene.add(band);
  // rooftop chillers: rows of boxes with dark fan circles
  const fanTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#9da2a8'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a3d42'; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.fill();
    g.strokeStyle = '#6a6e74'; g.lineWidth = 6; for (let a = 0; a < 6; a++) { g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 46 * Math.cos(a), 64 + 46 * Math.sin(a)); g.stroke(); } });
  const chillMat = [0, 0, 1, 0, 0, 0].map(k => k ? new THREE.MeshStandardMaterial({ map: fanTex, roughness: 0.7 }) : new THREE.MeshStandardMaterial({ color: 0xa4a9af, roughness: 0.7 }));
  const chillers = new THREE.InstancedMesh(new THREE.BoxGeometry(6, 2.4, 6), chillMat, 60); let ci = 0; const vents = [];
  for (let a = 0; a < 6; a++) for (let b = 0; b < 10; b++) { const x = dcX - dcW / 2 + 22 + a * 24, z = dcZ - dcD / 2 + 16 + b * 18.5; chillers.setMatrixAt(ci++, new THREE.Matrix4().makeTranslation(x, dcH + 1.25, z)); vents.push([x, z]); }
  scene.add(chillers);
  const roofGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(200,225,255,.9)'); gr.addColorStop(1, 'rgba(200,225,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  roofGlow.position.set(dcX, dcH + 10, dcZ); roofGlow.scale.set(dcW * 2.2, 90, 1); scene.add(roofGlow);
  // steam: sprites over the chillers, grows with power
  const steamTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(240,238,232,.9)'); gr.addColorStop(.6, 'rgba(235,232,226,.35)'); gr.addColorStop(1, 'rgba(235,232,226,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const steam = []; for (let k = 0; k < 140; k++) { const v = vents[k % vents.length]; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0, fog: true }));
    s.userData = { x: v[0] + (Math.random() - .5) * 3, z: v[1] + (Math.random() - .5) * 3, ph: Math.random(), dr: (Math.random() - .5) * 8 }; scene.add(s); steam.push(s); }
  // substation
  const sub = new THREE.Mesh(new THREE.BoxGeometry(40, 0.4, 30), new THREE.MeshStandardMaterial({ color: 0x8e8c86 })); sub.position.set(dcX + dcW / 2 + 40, 0.3, dcZ); scene.add(sub);
  const tr = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 5, 4), new THREE.MeshStandardMaterial({ color: 0x6f747a, metalness: .4, roughness: .5 }), 8);
  for (let k = 0; k < 8; k++) tr.setMatrixAt(k, new THREE.Matrix4().makeTranslation(dcX + dcW / 2 + 28 + (k % 4) * 8, 2.8, dcZ - 6 + Math.floor(k / 4) * 12)); scene.add(tr);

  // houses: white boxes with pitched roofs, 8 per block + windows (lit at night)
  const houses = [], rng = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const bx = ox + i * (BX + ST), bz = oz + j * (BZ + ST);
    for (let k = 0; k < 8; k++) { const x = bx + 10 + (k % 4) * 19 + rng() * 2, z = bz + (k < 4 ? 12 : BZ - 12);
      if (!inDC(x, z)) houses.push([x, z, k < 4 ? 0 : Math.PI, rng()]); }
  }
  const N = houses.length;
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(11, 4.2, 9), new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: .9 }), N);
  const roofGeo = new THREE.CylinderGeometry(0.1, 7.2, 3, 4, 1); roofGeo.rotateY(Math.PI / 4); roofGeo.scale(1.08, 1, 0.9);
  const roofCols = [0x8a8b8e, 0x7b6a5c, 0x9a9690, 0x6e6f73];
  const roof = new THREE.InstancedMesh(roofGeo, new THREE.MeshStandardMaterial({ roughness: .9 }), N);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffc97a, transparent: true, opacity: 0, fog: true });
  const wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(7, 1.4), winMat, N);
  const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3(), col = new THREE.Color();
  houses.forEach(([x, z, r, u], k) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r);
    body.setMatrixAt(k, tmpM.compose(pos.set(x, 2.1, z), q, sc)); roof.setMatrixAt(k, tmpM.compose(pos.set(x, 5.7, z), q, sc));
    roof.setColorAt(k, col.setHex(roofCols[Math.floor(u * 4)]));
    const off = new THREE.Vector3(0, 0, r ? -4.56 : 4.56); wins.setMatrixAt(k, tmpM.compose(pos.set(x + off.x, 2.2, z + off.z), r ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI) : new THREE.Quaternion(), sc));
    wins.setColorAt(k, col.setRGB(1, 1, 1)); });
  scene.add(body, roof, wins);
  // ball trees
  const T = 900; const crown = new THREE.InstancedMesh(new THREE.SphereGeometry(3.2, 12, 8), new THREE.MeshStandardMaterial({ color: 0x7d8a3e, roughness: 1 }), T);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.3, 4, 5), new THREE.MeshStandardMaterial({ color: 0x5a4a3a }), T);
  for (let k = 0; k < T; k++) { const i = Math.floor(rng() * NX), j = Math.floor(rng() * NZ); const x = ox + i * (BX + ST) + rng() * BX, z = oz + j * (BZ + ST) + BZ / 2 + (rng() - .5) * 14;
    if (inDC(x, z)) { crown.setMatrixAt(k, tmpM.makeScale(0, 0, 0)); trunk.setMatrixAt(k, tmpM.makeScale(0, 0, 0)); continue; }
    const s = 0.8 + rng() * 0.5; crown.setMatrixAt(k, tmpM.compose(pos.set(x, 5.5 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s))); trunk.setMatrixAt(k, tmpM.makeTranslation(x, 2, z)); }
  scene.add(crown, trunk);
  // street lamps (points of light at night)
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0, fog: true });
  const lampsN = (NX + 1) * NZ * 2; const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(1.1, 6, 4), lampMat, lampsN); let lk = 0; const lampPos = [];
  for (let i = 0; i <= NX; i++) for (let j = 0; j < NZ; j++) for (const f of [0.25, 0.75]) { const x = ox + i * (BX + ST) - ST / 2 + 7, z = oz + j * (BZ + ST) + BZ * f;
    lamps.setMatrixAt(lk, tmpM.makeTranslation(x, 6, z)); lamps.setColorAt(lk, col.setRGB(1, 1, 1)); lampPos.push([x, z]); lk++; }
  scene.add(lamps);
  const dist = houses.map(([x, z]) => Math.hypot(x - dcX, z - dcZ)), ldist = lampPos.map(([x, z]) => Math.hypot(x - dcX, z - dcZ));
  const glowTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,225,170,1)'); gr.addColorStop(.35, 'rgba(255,190,110,.55)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const lp = [...houses.map(([x, z]) => [x, 4, z]), ...lampPos.map(([x, z]) => [x, 6, z])];
  const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.Float32BufferAttribute(lp.flat(), 3));
  const lcol = new Float32Array(lp.length * 3).fill(1); lgeo.setAttribute('color', new THREE.BufferAttribute(lcol, 3));
  const lightsMat = new THREE.PointsMaterial({ map: glowTex, size: 11, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  scene.add(new THREE.Points(lgeo, lightsMat));
  const haloMat = new THREE.PointsMaterial({ map: glowTex, size: 34, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  scene.add(new THREE.Points(lgeo, haloMat));
  const lpd = lp.map(([x, , z]) => Math.hypot(x - dcX, z - dcZ));
  const maxD = Math.max(...dist);

  const KEYS = [ // t, distance, target, azimuth, elevation
    [29, 60, new THREE.Vector3(dcX - 20, dcH + 2, dcZ), 0.9, 0.55],
    [33, 210, new THREE.Vector3(dcX, dcH, dcZ), 1.05, 0.50],
    [39, 650, new THREE.Vector3(dcX, 0, dcZ), 1.2, 0.48],
    [44, 1150, new THREE.Vector3(dcX, 0, dcZ), 1.3, 0.55],
    [49, 1400, new THREE.Vector3(dcX, 0, dcZ), 1.35, 0.62],
  ];
  const tv = new THREE.Vector3();
  function camAt(t) { let a = KEYS[0], b = KEYS[KEYS.length - 1];
    for (let k = 0; k < KEYS.length - 1; k++) if (t >= KEYS[k][0] && t <= KEYS[k + 1][0]) { a = KEYS[k]; b = KEYS[k + 1]; break; }
    if (t < KEYS[0][0]) b = a; if (t > b[0]) a = b;
    const k = a === b ? 0 : ease(clamp01((t - a[0]) / (b[0] - a[0])));
    const d = expLerp(a[1], b[1], k), az = lerp(a[3], b[3], k), el = lerp(a[4], b[4], k); tv.copy(a[2]).lerp(b[2], k);
    camera.position.set(tv.x + Math.sin(az) * Math.cos(el) * d, tv.y + Math.sin(el) * d, tv.z + Math.cos(az) * Math.cos(el) * d); camera.lookAt(tv);
    camera.near = Math.max(0.5, d * 0.08); camera.updateProjectionMatrix(); }

  return { scene, camera,
    update(t, P) {
      camAt(t);
      // dusk from 40 to 45 s; blackout spreads from the data center at 1 GW (≈46 s)
      const night = ease(clamp01((t - 40) / 5)); skyU.night.value = night;
      hemi.intensity = lerp(1.4, 0.32, night); sun.intensity = lerp(1.5, 0.1, night); hemi.color.setRGB(lerp(0.9,0.55,night),lerp(0.86,0.62,night),lerp(0.8,0.85,night));
      scene.fog.color.setRGB(lerp(0.72, 0.07, night), lerp(0.66, 0.08, night), lerp(0.56, 0.12, night));
      const wave = clamp01((t - 45.6) / 2.6) * (maxD + 200);
      winMat.opacity = night; lampMat.opacity = night;
      lightsMat.opacity = night; haloMat.opacity = night * 0.28;
      dcMat.emissiveIntensity = night * 0.55; roofGlow.material.opacity = night * 0.8;
      for (let k = 0; k < lpd.length; k++) { const off = lpd[k] < wave ? 0 : 1; lcol[k * 3] = lcol[k * 3 + 1] = lcol[k * 3 + 2] = off; }
      lgeo.attributes.color.needsUpdate = true;
      houses.forEach((h, k) => wins.setColorAt(k, col.setScalar(dist[k] < wave ? 0 : 1))); wins.instanceColor.needsUpdate = true;
      ldist.forEach((d, k) => lamps.setColorAt(k, col.setScalar(d < wave ? 0 : 1))); lamps.instanceColor.needsUpdate = true;
      const pw = clamp01((Math.log10(P) - 6) / 3);  // 1 MW → 1 GW
      for (const s of steam) { const u = (t * 0.18 + s.userData.ph) % 1; const hgt = 4 + u * (25 + pw * 140);
        s.position.set(s.userData.x + s.userData.dr * u * (1 + pw * 3), dcH + 2.5 + hgt, s.userData.z);
        s.scale.setScalar(5 + u * (12 + pw * 60)); s.material.opacity = (0.25 + pw * 0.5) * Math.sin(u * Math.PI) * (1 - night * 0.6); }
    } };
}


// ---------- The Sun: boiling surface (noise), limb darkening, corona; a tiny Earth for scale ----------
export function makeSun() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 2000);
  const uni = { time: { value: 0 } };
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(100, 128, 128), new THREE.ShaderMaterial({ uniforms: uni,
    vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vW; void main(){ vP=position; vN=normalize(normalMatrix*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: NOISE + `uniform float time; varying vec3 vP; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 p=normalize(vP);
        float g=fbm(p*9.+vec3(0.,time*0.05,0.))*0.5+0.5; float c=fbm(p*30.+vec3(time*0.08))*0.5+0.5;
        vec3 V=normalize(cameraPosition-vW); float mu=max(dot(normalize(vW),V),0.);
        float limb=pow(mu,0.55);
        float gg=smoothstep(0.3,0.75,g*0.7+c*0.3); vec3 col=mix(vec3(0.78,0.26,0.05),vec3(1.0,0.72,0.30),gg)*(0.45+0.7*limb);
        col+=vec3(1.0,0.6,0.25)*pow(1.-mu,3.)*0.35;
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }` }));
  scene.add(sunMesh);
  const glowTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128); gr.addColorStop(0, 'rgba(255,170,80,.55)'); gr.addColorStop(.5, 'rgba(255,120,40,.18)'); gr.addColorStop(1, 'rgba(255,100,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); corona.scale.set(420, 420, 1); scene.add(corona);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(0.92, 32, 32), new THREE.MeshStandardMaterial({ color: 0x2c4a78, roughness: 0.8 }));
  earth.position.set(-60, 30, 140); scene.add(earth);
  const light = new THREE.PointLight(0xffd2a0, 3, 0, 0); scene.add(light); scene.add(new THREE.AmbientLight(0x202020));
  return { scene, camera, update(k, t) {
    uni.time.value = t;
    const d = expLerp(60, 420, ease(k));      // camera pulls away from Earth, the Sun fills the frame
    camera.position.set(-60 + Math.sin(k * 0.6) * 4, 30 + 4, 140 + d * 0.0 + 6 + d * 0.05);
    camera.position.lerp(new THREE.Vector3(-40, 60, 520), ease(k));
    camera.lookAt(new THREE.Vector3(-60, 30, 140).lerp(new THREE.Vector3(0, 0, 0), ease(clamp01(k * 1.4))));
  } };
}
