// おおきな木のふもとで（試作）
import * as THREE from 'three';
import { mergeGeometries } from './lib/BufferGeometryUtils.js';

const W = 1280, H = 720;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('wrap').prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0c1a, 0.012);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 400);

// ---------- テクスチャの道具 ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const glowTex = canvasTex(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const dotTex = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
function glowSprite(color, size, opacity) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1); return s;
}

// ---------- 空 ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `varying vec3 vP; void main(){ float y = clamp(vP.y,0.0,1.0);
    vec3 top = vec3(0.012,0.016,0.045); vec3 hor = vec3(0.06,0.05,0.11);
    vec3 c = mix(hor, top, pow(y,0.45)); gl_FragColor = vec4(c,1.0);} `,
}));
scene.add(sky);
{
  const r = rng(11), pos = [];
  for (let i = 0; i < 900; i++) {
    const th = r() * Math.PI * 2, y = 0.08 + r() * 0.92, rr = Math.sqrt(1 - y * y);
    pos.push(Math.cos(th) * rr * 280, y * 280, Math.sin(th) * rr * 280);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, size: 1.6, color: 0xdfe6ff, transparent: true,
    opacity: 0.7, depthWrite: false, fog: false, sizeAttenuation: true })));
}
const moon = glowSprite(0xf2f0ff, 22, 0.9); moon.position.set(-40, 120, -180); scene.add(moon);
const moonCore = glowSprite(0xffffff, 8, 1); moonCore.position.copy(moon.position); scene.add(moonCore);

// ---------- 地面 ----------
const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.MeshBasicMaterial({ color: 0x0d140f }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);
const warmTex = canvasTex(256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,150,70,0.85)'); gr.addColorStop(0.4, 'rgba(200,90,40,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const warm = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ map: warmTex, transparent: true,
  blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
warm.rotation.x = -Math.PI / 2; warm.position.y = 0.01; scene.add(warm);

// ---------- 光る木（東京タワーの形をした、大きな木） ----------
const tree = new THREE.Group(); scene.add(tree);
const TH = 26;
const barkTex = canvasTex(128, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, '#d9561c'); gr.addColorStop(0.5, '#ff8a36'); gr.addColorStop(1, '#d9561c');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(8);
  for (let k = 0; k < 14; k++) {
    let x = r() * w; g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= h; y += 16) { x += (r() - 0.5) * 7; g.lineTo(x, y); }
    g.strokeStyle = r() < 0.6 ? 'rgba(130,40,10,0.55)' : 'rgba(255,200,120,0.45)';
    g.lineWidth = 2 + r() * 3; g.stroke();
  }
});
barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping; barkTex.repeat.set(2, 0.12);
const barkMat = new THREE.MeshBasicMaterial({ map: barkTex });
const vineMat = new THREE.MeshBasicMaterial({ color: 0xc8501c });
const SX = [1, -1, -1, 1], SZ = [1, 1, -1, -1];
// 四本の幹が、ねじれながら一本にまとまっていく
function legP(i, h) {
  const half = lerp(3.0, 0.3, Math.pow(h, 0.62));
  const a0 = Math.atan2(SZ[i], SX[i]) + h * 0.9;            // ねじれ
  const wob = Math.sin(h * 9 + i * 1.7) * 0.18 * (1 - h);
  const rr = half * Math.SQRT2 + wob;
  return new THREE.Vector3(Math.cos(a0) * rr, h * TH, Math.sin(a0) * rr);
}
// 太さが変わる枝（短い円柱をつないで、つなぎ目に球）
function taper(pts, r0, r1, mat, parent = tree, sides = 9) {
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    const ra = lerp(r0, r1, k / (pts.length - 1)), rb = lerp(r0, r1, (k + 1) / (pts.length - 1));
    const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, len, sides), mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    parent.add(m);
    const j = new THREE.Mesh(new THREE.SphereGeometry(rb, sides, 6), mat); j.position.copy(b); parent.add(j);
  }
}
for (let i = 0; i < 4; i++) {
  const pts = []; for (let k = 0; k <= 26; k++) pts.push(legP(i, k / 26 * 0.92));
  taper(pts, 0.5, 0.14, barkMat);
}
// 真ん中の幹と、てっぺんの若い芽
{
  const pts = []; for (let k = 0; k <= 14; k++) { const h = 0.45 + k / 14 * 0.6; pts.push(new THREE.Vector3(Math.sin(h * 7) * 0.08, h * TH, Math.cos(h * 6) * 0.08)); }
  taper(pts, 0.42, 0.06, barkMat);
  const bud = glowSprite(0xfff0b0, 1.6, 0.9); bud.position.set(0, TH * 1.06, 0); tree.add(bud);
}
// 筋交いのかわりに、幹と幹をつなぐ、たれさがるつると枝
const vineLeafPos = [];
{
  const r = rng(31);
  const levels = [0.1, 0.2, 0.3, 0.41, 0.52, 0.64, 0.76];
  levels.forEach((h, li) => {
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const a = legP(i, h + (r() - 0.5) * 0.03), b = legP(j, h + 0.02 + (r() - 0.5) * 0.03);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const out = new THREE.Vector3(mid.x, 0, mid.z).normalize().multiplyScalar(0.25);
      const sag = lerp(1.6, 0.4, h);
      const pts = [];
      for (let q = 0; q <= 10; q++) {
        const u = q / 10;
        const p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * sag; p.addScaledVector(out, Math.sin(u * Math.PI));
        pts.push(p);
      }
      tree.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, lerp(0.07, 0.04, h), 5), vineMat));
      for (let q = 1; q < 10; q++) if (r() < 0.6) { const p = pts[q]; vineLeafPos.push(p.x + (r() - 0.5) * 0.3, p.y - r() * 0.3, p.z + (r() - 0.5) * 0.3); }
      // たれさがる細いつる
      if (r() < 0.5) {
        const p = pts[3 + Math.floor(r() * 5)]; const L = 0.8 + r() * 1.8;
        const hang = [p.clone(), p.clone().add(new THREE.Vector3(0.05, -L * 0.5, 0.05)), p.clone().add(new THREE.Vector3(-0.05, -L, 0))];
        tree.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hang), 8, 0.025, 4), vineMat));
        vineLeafPos.push(hang[2].x, hang[2].y, hang[2].z);
      }
    }
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vineLeafPos, 3));
  tree.add(new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, size: 0.28, color: 0xffd27a, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
}
// 根っこ
{
  const r = rng(5);
  for (let i = 0; i < 4; i++) {
    const base = legP(i, 0.0);
    const dirA = Math.atan2(base.z, base.x);
    for (let k = 0; k < 3; k++) {
      const a = dirA + (k - 1) * 0.55 + (r() - 0.5) * 0.25;
      const L = 4 + r() * 5;
      const pts = [];
      for (let q = 0; q <= 9; q++) {
        const u = q / 9;
        const aa = a + Math.sin(u * 5 + i * 2 + k) * 0.1 * u;
        pts.push(new THREE.Vector3(base.x * (1 - u * 0.1) + Math.cos(aa) * L * u, lerp(0.5, 0.02, Math.pow(u, 0.45)), base.z * (1 - u * 0.1) + Math.sin(aa) * L * u));
      }
      taper(pts, k === 1 ? 0.42 : 0.3, 0.04, barkMat, tree, 7);
    }
  }
}
// 木のまわりの光
[[2, 9, 0.5], [6, 12, 0.35], [11.5, 13, 0.4], [20, 9, 0.45], [26, 4, 0.5]].forEach(([y, s, o]) => {
  const g = glowSprite(0xff8a3a, s, o); g.position.set(0, y, 0); tree.add(g);
});
// 光る葉の冠（二段）：ふっくらした葉のかたまりが輪になって並ぶ
const crowns = [];
const canopyMat = new THREE.MeshBasicMaterial({ color: 0xb0501a, transparent: true, opacity: 0.35, depthWrite: false });
function crown(y, R, n, seed) {
  const r = rng(seed), pos = [], col = [];
  const grp = new THREE.Group(); grp.position.y = y; tree.add(grp);
  const lobes = 9;
  const centers = [];
  for (let l = 0; l < lobes; l++) {
    const th = l / lobes * Math.PI * 2 + r() * 0.2;
    const c = new THREE.Vector3(Math.cos(th) * R * 0.68, (r() - 0.5) * 0.3, Math.sin(th) * R * 0.68);
    centers.push([c, R * (0.38 + r() * 0.1)]);
  }
  centers.push([new THREE.Vector3(0, 0.35, 0), R * 0.55]);
  for (const [c, s] of centers) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 14, 10), canopyMat);
    m.position.copy(c); m.scale.y = 0.55; grp.add(m);
  }
  for (let i = 0; i < n; i++) {
    const [c, s] = centers[Math.floor(r() * centers.length)];
    const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), rr = s * Math.cbrt(0.55 + r() * 0.45);
    pos.push(c.x + Math.sin(ph) * Math.cos(th) * rr, c.y + Math.cos(ph) * rr * 0.55, c.z + Math.sin(ph) * Math.sin(th) * rr);
    const cc = new THREE.Color().setHSL(0.08 + r() * 0.07, 1, 0.55 + r() * 0.25);
    col.push(cc.r, cc.g, cc.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, size: 0.34, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  grp.add(p); crowns.push(grp);
  const gl = glowSprite(0xffb050, R * 3.2, 0.45); gl.position.y = y; tree.add(gl);
}
crown(11.5, 4.4, 3600, 21);
crown(20.5, 2.7, 2000, 22);


// ---------- まわりの森：ビルの木 ----------
// 幹はビルのように窓が灯り、てっぺんに葉の冠、足元に根っこ
function windowTex(cols, rows, seed) {
  const r = rng(seed);
  return canvasTex(cols * 16, rows * 22, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#141a30'); gr.addColorStop(1, '#0d1122');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // 木の皮のすじ
    g.strokeStyle = 'rgba(40,50,80,0.5)'; g.lineWidth = 2;
    for (let x = 0; x < w; x += 7) { g.beginPath(); g.moveTo(x + r() * 3, 0); g.lineTo(x + r() * 6 - 3, h); g.stroke(); }
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      const on = r();
      if (on < 0.42) continue;
      const warmC = ['#ffd27a', '#ffc35c', '#ffe3a6', '#f6b44e', '#cfe0ff'][Math.floor(r() * 5)];
      g.fillStyle = warmC; g.globalAlpha = 0.55 + r() * 0.45;
      // 丸い窓（木のうろのように）
      g.beginPath(); g.roundRect(cx * 16 + 4, cy * 22 + 5, 8, 12, 4); g.fill();
    }
    g.globalAlpha = 1;
  });
}
const winTexs = [windowTex(12, 30, 3), windowTex(12, 44, 4), windowTex(12, 60, 5)];
const forestLeafPos = [], forestLeafCol = [];
{
  const r = rng(99);
  const crownMat = [0x17283a, 0x1a2e3c, 0x142236].map(c => new THREE.MeshBasicMaterial({ color: c }));
  const rootMat = new THREE.MeshBasicMaterial({ color: 0x141a2e });
  for (let i = 0; i < 120; i++) {
    const a = r() * Math.PI * 2, d = 15 + Math.pow(r(), 0.8) * 55;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (z > 0 && Math.abs(x) < 4.5) continue;
    const hh = 5 + r() * 8 + (d > 35 ? 3 : 0);
    const rad = 1.0 + r() * 1.3;
    const tex = winTexs[hh < 8 ? 0 : hh < 11 ? 1 : 2];
    const sides = r() < 0.65 ? 4 : 6;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.78, rad * 1.12, hh, sides, 1, true),
      new THREE.MeshBasicMaterial({ map: tex }));
    trunk.position.set(x, hh / 2, z); trunk.rotation.y = r() * Math.PI; scene.add(trunk);
    // 葉の冠
    const cr = rad * (1.6 + r() * 0.9), top = hh;
    const blobs = 3 + Math.floor(r() * 3);
    for (let k = 0; k < blobs; k++) {
      const s = cr * (0.6 + r() * 0.5);
      const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), crownMat[k % 3]);
      const ang = r() * Math.PI * 2, off = k === 0 ? 0 : cr * 0.55;
      m.position.set(x + Math.cos(ang) * off, top + s * 0.55 + (k === 0 ? cr * 0.35 : 0), z + Math.sin(ang) * off);
      m.scale.y = 0.8 + r() * 0.3; scene.add(m);
      // 冠に灯る葉
      const n = 28 + Math.floor(r() * 24);
      for (let q = 0; q < n; q++) {
        const th = r() * Math.PI * 2, ph = r() * Math.PI * 0.75;
        forestLeafPos.push(m.position.x + Math.cos(th) * Math.sin(ph) * s * 1.02,
          m.position.y + Math.cos(ph) * s * m.scale.y * 1.02, m.position.z + Math.sin(th) * Math.sin(ph) * s * 1.02);
        const c = new THREE.Color().setHSL(0.09 + r() * 0.06, 0.9, 0.5 + r() * 0.2); forestLeafCol.push(c.r, c.g, c.b);
      }
    }
    // 枝（屋上から張り出す）
    for (let k = 0; k < 2; k++) {
      const ang = r() * Math.PI * 2;
      const pts = [new THREE.Vector3(x, top - 0.5, z), new THREE.Vector3(x + Math.cos(ang) * cr * 0.6, top + 0.6, z + Math.sin(ang) * cr * 0.6),
        new THREE.Vector3(x + Math.cos(ang) * cr * 1.1, top + 1.4, z + Math.sin(ang) * cr * 1.1)];
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.18, 5), rootMat));
    }
    // 根っこ
    const nr = 3 + Math.floor(r() * 3);
    for (let k = 0; k < nr; k++) {
      const ang = (k / nr) * Math.PI * 2 + r() * 0.5;
      const L = rad * (1.5 + r() * 1.2);
      const pts = [];
      for (let q = 0; q <= 5; q++) {
        const u = q / 5;
        pts.push(new THREE.Vector3(x + Math.cos(ang) * (rad * 0.9 + L * u), lerp(1.4, 0.03, Math.pow(u, 0.6)), z + Math.sin(ang) * (rad * 0.9 + L * u)));
      }
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.22 * rad, 5), rootMat));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(forestLeafPos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(forestLeafCol, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, size: 0.5, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 })));
}

// ---------- こぼれる光る葉 ----------
const LEAVES = 220;
const leafGeo = new THREE.BufferGeometry();
leafGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(LEAVES * 3), 3));
const leafPts = new THREE.Points(leafGeo, new THREE.PointsMaterial({ map: dotTex, size: 0.14, color: 0xffc261,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
scene.add(leafPts);
const leafP = [];
{
  const r = rng(321);
  for (let i = 0; i < LEAVES; i++) {
    const tier = r() < 0.7 ? 0 : 1;
    const R = tier ? 2.7 : 4.4;
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R;
    leafP.push({ x: Math.cos(a) * d, z: Math.sin(a) * d + (r() < 0.25 ? 2.5 + r() * 2 : 0), top: tier ? 20 : 11.2,
      P: 9 + r() * 7, off: r() * 20, f: 0.6 + r() * 0.8, ph: r() * 6, amp: 0.3 + r() * 0.6, dx: (r() - 0.5) * 2 });
  }
}
// 地面に落ちた葉
{
  const r = rng(77), pos = [];
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2, d = 1 + Math.pow(r(), 0.7) * 9;
    pos.push(Math.cos(a) * d, 0.03, Math.sin(a) * d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, size: 0.09, color: 0xffa040, transparent: true,
    opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })));
}

// ---------- 平面の妖精たち ----------
const OUTLINE = 'rgba(45,26,30,0.95)';
function eggPath(g, w, h, m) {
  const cx = w / 2;
  g.beginPath();
  g.moveTo(cx, m);
  g.bezierCurveTo(cx + w * 0.36, m, w - m, h * 0.62, w - m * 1.3, h * 0.79);
  g.bezierCurveTo(w - m * 2, h - m, m * 2, h - m, m * 1.3, h * 0.79);
  g.bezierCurveTo(m, h * 0.62, cx - w * 0.36, m, cx, m);
  g.closePath();
}
const bodyTex = canvasTex(256, 320, (g, w, h) => {
  eggPath(g, w, h, 12);
  const gr = g.createRadialGradient(w * 0.4, h * 0.35, 10, w * 0.5, h * 0.55, h * 0.6);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c9c2c6');
  g.fillStyle = gr; g.fill();
  g.lineWidth = 8; g.strokeStyle = OUTLINE; g.stroke();
  g.fillStyle = 'rgba(255,120,130,0.45)';
  g.beginPath(); g.ellipse(76, 200, 20, 11, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(180, 200, 20, 11, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = OUTLINE; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.arc(128, 196, 10, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
});
const eyesTex = canvasTex(256, 128, (g) => {
  for (const x of [86, 170]) {
    g.fillStyle = '#2b1b2a'; g.beginPath(); g.ellipse(x, 64, 17, 25, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 6, 54, 7, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x + 6, 74, 3, 0, Math.PI * 2); g.fill();
  }
});
const armTex = canvasTex(64, 128, (g) => {
  g.beginPath(); g.roundRect(10, 6, 44, 116, 22);
  g.fillStyle = '#ece6e8'; g.fill(); g.lineWidth = 7; g.strokeStyle = OUTLINE; g.stroke();
});
const footTex = canvasTex(96, 64, (g) => {
  g.beginPath(); g.ellipse(48, 32, 40, 24, 0, 0, Math.PI * 2);
  g.fillStyle = '#b8adb2'; g.fill(); g.lineWidth = 6; g.strokeStyle = OUTLINE; g.stroke();
});
function leafShape(g, w, h, c1, c2, vein) {
  g.beginPath(); g.moveTo(6, h / 2);
  g.quadraticCurveTo(w * 0.45, -h * 0.15, w - 6, h / 2);
  g.quadraticCurveTo(w * 0.45, h * 1.15, 6, h / 2); g.closePath();
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fill(); g.lineWidth = 6; g.strokeStyle = OUTLINE; g.stroke();
  g.strokeStyle = vein; g.lineWidth = 3;
  g.beginPath(); g.moveTo(14, h / 2); g.lineTo(w - 20, h / 2); g.stroke();
  for (let k = 1; k < 5; k++) { const x = w * k / 5.5; g.beginPath(); g.moveTo(x, h / 2); g.lineTo(x + 16, h / 2 - 16); g.moveTo(x, h / 2); g.lineTo(x + 16, h / 2 + 16); g.stroke(); }
}
const hatLocalTex = canvasTex(256, 140, (g, w, h) => leafShape(g, w, h, '#a6d65a', '#4f9a3a', 'rgba(40,80,30,0.7)'));
const hatTravTex = canvasTex(320, 120, (g, w, h) => {
  // 旅の子の笠：大きくて平たい、月の色の葉
  g.beginPath(); g.moveTo(8, h * 0.72);
  g.quadraticCurveTo(w * 0.5, -h * 0.25, w - 8, h * 0.72);
  g.quadraticCurveTo(w * 0.5, h * 0.95, 8, h * 0.72); g.closePath();
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d6f0ff'); gr.addColorStop(1, '#7fb2d8');
  g.fillStyle = gr; g.fill(); g.lineWidth = 6; g.strokeStyle = OUTLINE; g.stroke();
  g.strokeStyle = 'rgba(40,70,110,0.55)'; g.lineWidth = 3;
  for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(w / 2, h * 0.08); g.lineTo(w / 2 + k * 42, h * 0.78); g.stroke(); }
});
const goldLeafTex = canvasTex(128, 80, (g, w, h) => leafShape(g, w, h, '#fff1a8', '#ffb43a', 'rgba(170,90,20,0.7)'));
const bundleTex = canvasTex(160, 160, (g) => {
  g.strokeStyle = OUTLINE; g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(20, 150); g.lineTo(140, 30); g.stroke();
  g.strokeStyle = '#8a6a48'; g.lineWidth = 4; g.beginPath(); g.moveTo(20, 150); g.lineTo(140, 30); g.stroke();
  g.beginPath(); g.arc(122, 52, 30, 0, Math.PI * 2);
  g.fillStyle = '#3f5c9a'; g.fill(); g.lineWidth = 6; g.strokeStyle = OUTLINE; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  for (const [x, y] of [[110, 40], [132, 58], [116, 66], [136, 38]]) { g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.moveTo(122, 22); g.lineTo(112, 10); g.lineTo(132, 12); g.closePath(); g.fillStyle = '#3f5c9a'; g.fill();
});
const shadowTex = canvasTex(128, 64, (g) => {
  const gr = g.createRadialGradient(64, 32, 0, 64, 32, 60); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 64);
});

function part(tex, w, h, ox, oy, order, tintable = true) {
  const geo = new THREE.PlaneGeometry(w, h); geo.translate(ox, oy, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  m.renderOrder = order; m.userData.ro = order; m.userData.tint = tintable; return m;
}
function makeFairy(kind) {
  const root = new THREE.Group();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.22), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.015; root.add(shadow);
  const face = new THREE.Group(); root.add(face);       // カメラの方を向く
  const pose = new THREE.Group(); face.add(pose);       // 弾む・傾く
  const BW = 0.5, BH = 0.625;
  const body = part(bodyTex, BW, BH, 0, BH / 2, 20); body.position.y = 0.05; pose.add(body);
  const eyes = part(eyesTex, BW * 0.95, BW * 0.475, 0, 0, 23, false); eyes.position.set(0, 0.05 + 0.33, 0.01); pose.add(eyes);
  const armL = part(armTex, 0.085, 0.17, 0, -0.07, 19); armL.position.set(-0.2, 0.05 + 0.25, -0.005); pose.add(armL);
  const armR = part(armTex, 0.085, 0.17, 0, -0.07, 19); armR.position.set(0.2, 0.05 + 0.25, -0.005); pose.add(armR);
  const footL = part(footTex, 0.12, 0.08, 0, 0.04, 18); footL.position.set(-0.1, 0, 0); face.add(footL);
  const footR = part(footTex, 0.12, 0.08, 0, 0.04, 18); footR.position.set(0.1, 0, 0); face.add(footR);
  let hat;
  if (kind === 'trav') {
    hat = part(hatTravTex, 0.62, 0.23, 0, 0.06, 24, false); hat.position.set(0, 0.05 + 0.56, 0.015);
  } else {
    hat = part(hatLocalTex, 0.3, 0.165, 0.11, 0.0, 24, false); hat.position.set(0.0, 0.05 + 0.6, 0.015); hat.rotation.z = 0.55;
  }
  pose.add(hat);
  const f = { root, face, pose, body, eyes, armL, armR, footL, footR, hat, kind, tintParts: [body, armL, armR, footL, footR] };
  if (kind === 'trav') {
    const bundle = part(bundleTex, 0.42, 0.42, 0, 0, 17, false); bundle.position.set(-0.14, 0.05 + 0.5, -0.02); bundle.rotation.z = -0.15;
    pose.add(bundle); f.bundle = bundle;
    const lantern = new THREE.Group();
    const lcore = glowSprite(0xcfe8ff, 0.12, 1); const lglow = glowSprite(0x8fc4ff, 0.6, 0.7);
    lcore.userData.ro = 26; lglow.userData.ro = 25; lantern.add(lcore, lglow); lantern.position.set(0, -0.17, 0.02); armR.add(lantern); f.lantern = lantern; f.lglow = lglow;
  }
  scene.add(root);
  return f;
}
function tint(f, c) { for (const p of f.tintParts) p.material.color.copy(c); }

const local = makeFairy('local');
const trav = makeFairy('trav');
for (const f of [local, trav]) f.root.traverse(o => { if (o.material) o.material.depthTest = false; });
tint(local, new THREE.Color(1.0, 0.82, 0.62));
tint(trav, new THREE.Color(0.68, 0.84, 1.0));
local.root.position.set(-0.85, 0, 4.6);

// ふもとの小さなおうち（平面）
const hutTex = canvasTex(256, 256, (g) => {
  g.beginPath(); g.roundRect(70, 120, 116, 124, 18); g.fillStyle = '#6b4a3a'; g.fill(); g.lineWidth = 7; g.strokeStyle = OUTLINE; g.stroke();
  g.beginPath(); g.moveTo(20, 140); g.quadraticCurveTo(128, -40, 236, 140); g.quadraticCurveTo(128, 120, 20, 140); g.closePath();
  const gr = g.createLinearGradient(0, 20, 0, 140); gr.addColorStop(0, '#d9a24a'); gr.addColorStop(1, '#9a5a24');
  g.fillStyle = gr; g.fill(); g.stroke();
  g.beginPath(); g.arc(128, 196, 26, Math.PI, 0); g.lineTo(154, 244); g.lineTo(102, 244); g.closePath();
  g.fillStyle = '#ffd27a'; g.fill(); g.lineWidth = 6; g.stroke();
  g.beginPath(); g.arc(90, 160, 11, 0, Math.PI * 2); g.fillStyle = '#ffe2a0'; g.fill(); g.stroke();
});
const huts = [];
for (const [x, z, s] of [[-2.9, 1.9, 1.0], [3.8, 2.2, 0.9], [-0.6, 0.5, 0.8], [4.6, -1.0, 0.85]]) {
  const grp = new THREE.Group();
  const m = part(hutTex, 1.0 * s, 1.0 * s, 0, 0.5 * s, 10, false); grp.add(m);
  const gl = glowSprite(0xffb860, 1.3 * s, 0.5); gl.position.set(0, 0.25 * s, 0.05); grp.add(gl);
  grp.position.set(x, 0, z); scene.add(grp); huts.push(grp);
}

// つかまえる葉っぱ
const caught = new THREE.Group();
const caughtLeaf = part(goldLeafTex, 0.2, 0.125, 0, 0, 26, false);
const caughtGlow = glowSprite(0xffc060, 0.55, 0.85);
caught.add(caughtLeaf, caughtGlow); scene.add(caught);

// ---------- 足元のふしぎな植物（平面） ----------
const plantTex = {
  mush: canvasTex(128, 128, (g) => {
    g.beginPath(); g.moveTo(52, 70); g.quadraticCurveTo(46, 110, 50, 124); g.lineTo(78, 124); g.quadraticCurveTo(82, 110, 76, 70); g.closePath();
    g.fillStyle = '#f3e6d0'; g.fill(); g.lineWidth = 5; g.strokeStyle = OUTLINE; g.stroke();
    g.beginPath(); g.moveTo(8, 76); g.quadraticCurveTo(64, -28, 120, 76); g.quadraticCurveTo(64, 92, 8, 76); g.closePath();
    const gr = g.createLinearGradient(0, 10, 0, 80); gr.addColorStop(0, '#9be7ff'); gr.addColorStop(1, '#3a8fd0');
    g.fillStyle = gr; g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y, rr] of [[40, 50, 7], [70, 34, 9], [94, 56, 6], [60, 62, 5]]) { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
  }),
  mush2: canvasTex(128, 128, (g) => {
    g.beginPath(); g.moveTo(56, 64); g.quadraticCurveTo(50, 110, 54, 124); g.lineTo(74, 124); g.quadraticCurveTo(78, 110, 72, 64); g.closePath();
    g.fillStyle = '#f3e6d0'; g.fill(); g.lineWidth = 5; g.strokeStyle = OUTLINE; g.stroke();
    g.beginPath(); g.moveTo(18, 68); g.quadraticCurveTo(64, -10, 110, 68); g.quadraticCurveTo(64, 80, 18, 68); g.closePath();
    const gr = g.createLinearGradient(0, 10, 0, 70); gr.addColorStop(0, '#f0b8ff'); gr.addColorStop(1, '#9a5ad6');
    g.fillStyle = gr; g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (const [x, y, rr] of [[48, 44, 6], [76, 36, 7], [86, 56, 5]]) { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
  }),
  fern: canvasTex(128, 192, (g) => {
    g.lineCap = 'round';
    const draw = (col, lw) => {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(64, 190); g.quadraticCurveTo(54, 120, 70, 70);
      let a = 0, rr = 30, cx = 52, cy = 52;
      for (let k = 0; k < 60; k++) { a += 0.16; rr *= 0.965; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      g.stroke();
    };
    draw(OUTLINE, 15); draw('#6fcf73', 9);
    g.fillStyle = '#6fcf73'; g.strokeStyle = OUTLINE; g.lineWidth = 4;
    for (const [x, y, s] of [[60, 150, 1], [62, 118, -1], [60, 96, 1]]) { g.beginPath(); g.ellipse(x + s * 16, y, 16, 7, s * -0.5, 0, Math.PI * 2); g.fill(); g.stroke(); }
  }),
  lantern: canvasTex(160, 208, (g) => {
    g.lineCap = 'round';
    const stem = () => { g.beginPath(); g.moveTo(80, 206); g.quadraticCurveTo(70, 80, 110, 30); g.quadraticCurveTo(130, 14, 140, 30); };
    g.strokeStyle = OUTLINE; g.lineWidth = 11; stem(); g.stroke(); g.strokeStyle = '#4c9a5a'; g.lineWidth = 6; stem(); g.stroke();
    for (const [x, y] of [[138, 56], [96, 80], [118, 112]]) {
      g.strokeStyle = '#4c9a5a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x, y - 12); g.stroke();
      g.beginPath(); g.moveTo(x - 14, y + 12); g.quadraticCurveTo(x - 16, y - 16, x, y - 14); g.quadraticCurveTo(x + 16, y - 16, x + 14, y + 12);
      g.quadraticCurveTo(x, y + 18, x - 14, y + 12); g.closePath();
      const gr = g.createRadialGradient(x, y, 2, x, y, 18); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(1, '#ffb347');
      g.fillStyle = gr; g.fill(); g.lineWidth = 4; g.strokeStyle = OUTLINE; g.stroke();
    }
    g.fillStyle = '#4c9a5a'; g.strokeStyle = OUTLINE; g.lineWidth = 4;
    g.beginPath(); g.ellipse(64, 160, 24, 10, 0.5, 0, Math.PI * 2); g.fill(); g.stroke();
  }),
  puff: canvasTex(96, 192, (g) => {
    g.strokeStyle = OUTLINE; g.lineWidth = 8; g.beginPath(); g.moveTo(48, 190); g.quadraticCurveTo(40, 110, 48, 60); g.stroke();
    g.strokeStyle = '#7ab08a'; g.lineWidth = 4; g.beginPath(); g.moveTo(48, 190); g.quadraticCurveTo(40, 110, 48, 60); g.stroke();
    const gr = g.createRadialGradient(48, 42, 2, 48, 42, 36); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(200,235,255,0.85)'); gr.addColorStop(1, 'rgba(160,210,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(48, 42, 36, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5;
    for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; g.beginPath(); g.moveTo(48, 42); g.lineTo(48 + Math.cos(a) * 30, 42 + Math.sin(a) * 30); g.stroke(); }
  }),
  grass: canvasTex(160, 96, (g) => {
    g.lineCap = 'round';
    const blades = [[20, -0.6, 60], [45, -0.3, 80], [70, -0.05, 90], [95, 0.25, 78], [120, 0.5, 64], [140, 0.7, 48]];
    for (const pass of [[OUTLINE, 11], ['#3f8f5a', 6]]) {
      g.strokeStyle = pass[0]; g.lineWidth = pass[1];
      for (const [x, a, L] of blades) { g.beginPath(); g.moveTo(80, 94); g.quadraticCurveTo(80 + Math.sin(a) * L * 0.4, 94 - L * 0.6, x, 94 - L); g.stroke(); }
    }
  }),
  leafy: canvasTex(160, 128, (g) => {
    for (const [x, y, a, s] of [[50, 80, -0.5, 1], [110, 78, 0.5, 1], [80, 56, 0, 1.15]]) {
      g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
      g.beginPath(); g.ellipse(0, 0, 34, 26, 0, 0, Math.PI * 2);
      const gr = g.createLinearGradient(-30, -26, 30, 26); gr.addColorStop(0, '#5fe0c0'); gr.addColorStop(1, '#2a8a86');
      g.fillStyle = gr; g.fill(); g.lineWidth = 5; g.strokeStyle = OUTLINE; g.stroke();
      g.strokeStyle = 'rgba(20,70,70,0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.stroke();
      g.restore();
    }
    g.fillStyle = '#2a8a86'; g.strokeStyle = OUTLINE; g.lineWidth = 5; g.beginPath(); g.roundRect(74, 90, 12, 36, 5); g.fill(); g.stroke();
  }),
};
const PLANT_KINDS = [
  ['mush', 0.42, 0.42, 0x8fd8ff], ['mush2', 0.36, 0.36, 0xe0a8ff], ['fern', 0.45, 0.68, 0],
  ['lantern', 0.6, 0.78, 0xffc66a], ['puff', 0.3, 0.6, 0xd8eeff], ['grass', 0.6, 0.36, 0], ['leafy', 0.6, 0.48, 0],
];
const plants = [];
function addPlant(kindIdx, x, z, s, r) {
  const [key, w, h, glowC] = PLANT_KINDS[kindIdx];
  const grp = new THREE.Group();
  const sway = new THREE.Group(); grp.add(sway);
  const m = part(plantTex[key], w * s, h * s, 0, h * s / 2, 15, false);
  m.material.depthWrite = false; sway.add(m);
  if (glowC) {
    const gl = glowSprite(glowC, Math.max(w, h) * s * 1.6, 0.45);
    gl.position.set(0, h * s * (key === 'lantern' ? 0.6 : key === 'puff' ? 0.78 : 0.62), 0.02); sway.add(gl);
  }
  grp.position.set(x, 0, z); scene.add(grp);
  plants.push({ grp, sway, f: 0.6 + r() * 0.8, ph: r() * 6, amp: key === 'grass' || key === 'puff' || key === 'lantern' ? 0.09 : 0.03 });
}
// ---------- コケのかたまり ----------
{
  const r = rng(808);
  const mossMat = [0x1c3826, 0x234430, 0x183020].map(c => new THREE.MeshBasicMaterial({ color: c }));
  const spores = [];
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = 1.5 + Math.pow(r(), 0.7) * 11;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (z > 3.2 && z < 5.8 && x > -2.0 && x < 4.8) continue;
    if (z > 5.4 && Math.abs(x) < 2.4) continue;
    if (Math.abs(x - 1.9) < 1.4 && Math.abs(z - 2.6) < 0.9) continue;
    if (z > 1.0 && Math.abs(x) < 5.0) continue;
    const s = 0.25 + r() * 0.7;
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mossMat[i % 3]);
    m.scale.y = 0.45; m.position.set(x, 0, z); scene.add(m);
    for (let k = 0; k < 6; k++) { const th = r() * 6.28, ph = r() * 1.3; spores.push(x + Math.cos(th) * Math.sin(ph) * s, Math.cos(ph) * s * 0.45 + 0.03, z + Math.sin(th) * Math.sin(ph) * s); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(spores, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, size: 0.09, color: 0xc8ff9a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
}
// ---------- 植物（ふもとをいっぱいに、森の入り口にも） ----------
{
  const r = rng(404);
  let placed = 0, tries = 0;
  const weights = [0, 1, 2, 3, 4, 5, 5, 5, 6, 6, 2];
  while (placed < 300 && tries < 5000) {
    tries++;
    const a = r() * Math.PI * 2, d = 1.0 + Math.pow(r(), 0.75) * 12;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (z > 3.4 && z < 5.6 && x > -1.9 && x < 4.6) continue;   // 妖精たちの舞台
    if (z > 5.6 && Math.abs(x) < 2.3) continue;                // カメラの前
    if (Math.abs(x - 1.9) < 1.3 && Math.abs(z - 2.6) < 0.75) continue; // 追いかけっこの輪
    if (Math.abs(z - 1.25) < 0.3 && Math.abs(x) < 5) continue;  // 葉っぱを運ぶ子の道
    if (z > 7.5) continue;
    const front = z > 0.8 && Math.abs(x) < 4.6;
    const k = front ? [0, 1, 5, 4, 0][Math.floor(r() * 5)] : weights[Math.floor(r() * weights.length)];
    addPlant(k, x, z, front ? 0.55 + r() * 0.35 : (d < 4.5 ? 0.9 : 1.15) + r() * 0.8, r);
    placed++;
  }
  addPlant(3, -2.6, 6.0, 1.3, r); addPlant(1, -2.2, 6.3, 1.0, r); addPlant(5, -3.0, 6.4, 1.4, r);
  addPlant(2, 2.9, 6.1, 1.3, r); addPlant(0, 2.5, 6.4, 1.1, r); addPlant(4, 3.3, 5.9, 1.2, r);
  addPlant(6, -3.6, 5.6, 1.4, r); addPlant(5, 3.9, 5.5, 1.5, r);
  for (const [x, z] of [[-1.8, 2.4], [0.4, 2.0], [-3.4, 3.0], [3.2, 3.4]]) {
    for (let k = 0; k < 3; k++) addPlant(r() < 0.5 ? 0 : 1, x + (r() - 0.5) * 0.7, z + (r() - 0.5) * 0.4, 0.7 + r() * 0.5, r);
  }
  // 森の入り口の小道のわき
  for (let i = 0; i < 90; i++) {
    const z = 22 + r() * 20, side = r() < 0.5 ? -1 : 1, x = side * (0.9 + Math.pow(r(), 0.6) * 4);
    if (z > 35.0 && Math.abs(x) < 2.6) continue;
    addPlant(weights[Math.floor(r() * weights.length)], x, z, 1.0 + r() * 0.9, r);
  }
}

// ---------- 登場する妖精たち ----------
const bodyBackTex = canvasTex(256, 320, (g, w, h) => {
  eggPath(g, w, h, 12);
  const gr = g.createRadialGradient(w * 0.55, h * 0.35, 10, w * 0.5, h * 0.55, h * 0.6);
  gr.addColorStop(0, '#f2eef0'); gr.addColorStop(1, '#b9b1b6');
  g.fillStyle = gr; g.fill(); g.lineWidth = 8; g.strokeStyle = OUTLINE; g.stroke();
});
const bigLeafTex = canvasTex(256, 140, (g, w, h) => leafShape(g, w, h, '#ffd27a', '#e07a2a', 'rgba(150,60,20,0.7)'));
function cast(x, z, s, c) { const f = makeFairy('local'); tint(f, c); f.root.scale.setScalar(s); f.root.position.set(x, 0, z); return f; }
const chasers = [cast(1.9, 2.6, 0.8, new THREE.Color(1.0, 0.8, 0.66)), cast(1.9, 2.6, 0.72, new THREE.Color(1.0, 0.9, 0.7))];
const carrier = cast(-4, 1.25, 0.85, new THREE.Color(0.98, 0.8, 0.62));
const carryLeaf = part(bigLeafTex, 0.62, 0.34, 0, 0, 25, false); carryLeaf.position.set(0, 0.78, 0.02); carrier.pose.add(carryLeaf);
carrier.hat.visible = false;
const waver = cast(-2.1, 2.3, 0.8, new THREE.Color(1.0, 0.84, 0.7));
// ブランコ
const swingPivot = new THREE.Group(); swingPivot.position.set(-2.3, 6.2, 3.0); scene.add(swingPivot);
{
  const ropeMat = new THREE.MeshBasicMaterial({ color: 0x7a4a2a });
  for (const dx of [-0.17, 0.17]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 5.4, 4), ropeMat); rope.position.set(dx, -2.7, 0); swingPivot.add(rope);
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.16), new THREE.MeshBasicMaterial({ color: 0x8a5a32 })); seat.position.set(0, -5.4, 0); swingPivot.add(seat);
}
const swinger = cast(0, 0, 0.75, new THREE.Color(1.0, 0.86, 0.72));
swinger.root.children[0].visible = false; // 影なし
const allFairies = [local, trav, ...chasers, carrier, waver, swinger];

// ---------- 降ってくる光の粒 ----------
const SH = 1100;
const shGeo = new THREE.BufferGeometry(); shGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SH * 3), 3));
const shMat = new THREE.PointsMaterial({ map: dotTex, size: 0.16, color: 0xfff0c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
scene.add(new THREE.Points(shGeo, shMat));
const SH2 = 200;
const sh2Geo = new THREE.BufferGeometry(); sh2Geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SH2 * 3), 3));
const sh2Mat = new THREE.PointsMaterial({ map: glowTex, size: 0.7, color: 0xffd890, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
scene.add(new THREE.Points(sh2Geo, sh2Mat));
const shP = [];
{ const r = rng(5150); for (let i = 0; i < SH + SH2; i++) shP.push({ x: (r() - 0.5) * 10, z: 1 + r() * 6.2, P: 3 + r() * 3.5, off: r() * 10, f: 0.8 + r(), ph: r() * 6, tw: r() * 6 }); }

// ---------- 動かない部品をまとめて、軽くする ----------
{
  const groups = new Map();
  scene.updateMatrixWorld(true);
  const cands = [];
  for (const parent of [scene, tree]) for (const m of parent.children) {
    if (!m.isMesh || !m.material || !m.material.isMeshBasicMaterial || m.material.transparent) continue;
    if (m === ground) continue;
    cands.push(m);
  }
  for (const m of cands) {
    const g = m.geometry.index ? m.geometry : m.geometry;
    const geo = g.clone().applyMatrix4(m.matrixWorld);
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    const key = m.material.uuid;
    if (!groups.has(key)) groups.set(key, { mat: m.material, geos: [] });
    groups.get(key).geos.push(geo.index ? geo : geo);
    m.parent.remove(m);
  }
  for (const { mat, geos } of groups.values()) {
    const idx = geos.filter(g => g.index), non = geos.filter(g => !g.index);
    for (const list of [idx, non]) if (list.length) {
      const merged = mergeGeometries(list, false);
      if (merged) scene.add(new THREE.Mesh(merged, mat));
    }
  }
}

// ---------- テロップ ----------
const TELOPS = [
  [0.8, 5.3, '森の中に、一本の巨木がありました。'],
  [6.6, 11.6, '巨木のふもとには、\n妖精たちが暮らしています。'],
  [14.0, 19.0, 'ある夜、森の入り口に\n旅の妖精がやってきました。'],
  [20.4, 24.4, '巨木のふもとで、\nふもとの妖精と出会いました。'],
  [25.6, 29.2, '光のつぶが、\nきらきらと降ってきました。'],
  [32.0, 35.8, 'おおきな木の、ある森'],
];
const telopEl = document.getElementById('telop');
const blackEl = document.getElementById('black');

// ---------- 動き ----------
function faceCamera(f) {
  const p = new THREE.Vector3(); f.root.getWorldPosition(p);
  f.face.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
}
function blink(f, t, seed) {
  const period = 3.1 + seed * 0.7;
  const u = ((t + seed * 1.3) % period);
  const s = u < 0.13 ? Math.abs(Math.cos(u / 0.13 * Math.PI)) : 1;
  f.eyes.scale.y = Math.max(0.08, s);
}
function walkPose(f, phase, amount) {
  const s = Math.sin(phase);
  f.pose.position.y = Math.abs(s) * 0.045 * amount;
  f.pose.rotation.z = s * 0.06 * amount;
  f.footL.position.y = Math.max(0, s) * 0.05 * amount;
  f.footR.position.y = Math.max(0, -s) * 0.05 * amount;
  f.footL.position.x = -0.1 + s * 0.03 * amount;
  f.footR.position.x = 0.1 + s * 0.03 * amount;
}
function resetPose(f) {
  f.pose.position.set(0, 0, 0); f.pose.rotation.set(0, 0, 0); f.pose.scale.set(1, 1, 1);
  f.footL.position.set(-0.1, 0, 0); f.footR.position.set(0.1, 0, 0);
  f.armL.rotation.z = -0.4; f.armR.rotation.z = 0.4; f.eyes.position.set(0, 0.38, 0.01); f.face.scale.x = 1;
}
function hop(t, a, len, h) { return t > a && t < a + len ? Math.sin((t - a) / len * Math.PI) * h : 0; }
function showBack(f, back) {
  f.body.material.map = back ? bodyBackTex : bodyTex; f.eyes.visible = !back;
  if (f.bundle) { f.bundle.userData.ro = back ? 21 : 17; f.bundle.position.set(back ? 0.04 : -0.14, 0.05 + (back ? 0.36 : 0.5), back ? 0.02 : -0.02); f.bundle.rotation.z = back ? 0.25 : -0.15; }
}

const BLUE = new THREE.Color(0.68, 0.84, 1.0), WARMT = new THREE.Color(0.98, 0.86, 0.74);
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
const AERIAL = { pos: [20, 62, 78], look: [0, 6, 0] };

function groundCam(t, t0) {
  const u = smooth(t0, t0 + 8, t);
  camera.position.set(lerp(-0.5, 0.3, u), 0.78, lerp(8.7, 7.9, u));
  return [lerp(-0.2, 0.1, u), 0.95, 2.5];
}

window.renderAt = function (t) {
  // ---- 場面 ----
  const scene1 = t < 6.0, scene2 = t >= 6.0 && t < 13.5, scene3 = t >= 13.5 && t < 19.5, scene4 = t >= 19.5;
  let look;
  if (scene1) {
    const u = smooth(0, 6.2, t);
    camera.position.set(lerp(20, 7, u), lerp(62, 16, u), lerp(78, 26, u));
    look = [0, lerp(6, 10, u), 0];
  } else if (scene2) {
    look = groundCam(t, 6.0);
  } else if (scene3) {
    const u = smooth(13.5, 19.5, t);
    camera.position.set(lerp(0.9, 0.7, u), 0.5, lerp(38.4, 37.6, u));
    look = [lerp(-0.1, 0, u), lerp(3.6, 5.2, smooth(16, 18.5, t)), 0];
  } else {
    look = groundCam(t, 19.5);
    const upS = smooth(25.0, 28.6, t);
    look[1] = lerp(0.95, 1.45, upS);
    camera.position.y = lerp(0.78, 0.74, upS);
    const pull = smooth(29.0, 35.0, t);
    if (pull > 0) {
      camera.position.set(lerp(camera.position.x, AERIAL.pos[0], Math.pow(pull, 1.2)), lerp(camera.position.y, AERIAL.pos[1], Math.pow(pull, 0.7)), lerp(camera.position.z, AERIAL.pos[2], Math.pow(pull, 1.2)));
      look = [lerp(look[0], 0, pull), lerp(look[1], 6, Math.pow(pull, 0.8)), lerp(look[2], 0, pull)];
    }
  }
  camera.lookAt(...look);
  if (window.camOverride) { const o = window.camOverride; camera.position.set(...o.pos); camera.lookAt(...o.look); }
  camera.updateMatrixWorld();

  crowns[0].rotation.y = t * 0.03; crowns[1].rotation.y = -t * 0.04;

  // こぼれる葉
  const arr = leafGeo.attributes.position.array;
  for (let i = 0; i < LEAVES; i++) {
    const L = leafP[i]; const u = ((t + L.off) / L.P) % 1; const y = L.top - u * (L.top + 0.3);
    arr[i * 3] = L.x + Math.sin(t * L.f + L.ph) * L.amp + L.dx * u; arr[i * 3 + 1] = Math.max(0.03, y);
    arr[i * 3 + 2] = L.z + Math.cos(t * L.f * 0.8 + L.ph) * L.amp * 0.6;
  }
  leafGeo.attributes.position.needsUpdate = true;

  // 光の粒
  const shOn = smooth(24.6, 25.8, t) * (1 - smooth(31, 33.5, t));
  shMat.opacity = shOn; sh2Mat.opacity = shOn * 0.75;
  const a1 = shGeo.attributes.position.array, a2 = sh2Geo.attributes.position.array;
  for (let i = 0; i < SH + SH2; i++) {
    const p = shP[i]; const u = ((t + p.off) / p.P) % 1;
    const x = p.x + Math.sin(t * p.f + p.ph) * 0.35, y = 9 - u * 9.2, z = p.z;
    const tgt = i < SH ? a1 : a2, j = i < SH ? i : i - SH;
    tgt[j * 3] = x; tgt[j * 3 + 1] = Math.max(0.02, y); tgt[j * 3 + 2] = z;
  }
  shGeo.attributes.position.needsUpdate = true; sh2Geo.attributes.position.needsUpdate = true;
  shMat.size = 0.16 * (0.85 + 0.25 * Math.sin(t * 9)); sh2Mat.size = 0.7 * (0.8 + 0.3 * Math.sin(t * 5.3 + 1));

  for (const f of allFairies) { resetPose(f); f.root.visible = true; }

  // ---- ふもとの子（主役） ----
  const lf = local;
  lf.root.visible = !scene3;
  blink(lf, t, 0.2);
  let leafWorld = null, leafRot = 0, leafOn = true;
  if (scene1 || scene2) {
    lf.root.position.set(-0.85, 0, 4.6);
    const catchT = 9.4;
    const raise = smooth(8.5, 9.35, t) * (1 - smooth(10.3, 11.1, t));
    const holdFront = smooth(10.3, 11.1, t);
    const idle = Math.sin(t * 3.1);
    lf.pose.position.y = (t < catchT ? Math.abs(idle) * 0.015 : 0) + hop(t, catchT, 0.6, 0.08) + hop(t, catchT + 0.7, 0.45, 0.05);
    lf.pose.scale.set(1, 1 + 0.03 * Math.sin(t * 3.1), 1);
    lf.armL.rotation.z = lerp(lerp(-0.4 + idle * 0.08, -2.55, raise), 0.75, holdFront);
    lf.armR.rotation.z = lerp(lerp(0.4 - idle * 0.08, 2.55, raise), -0.75, holdFront);
    lf.eyes.position.y = 0.38 + 0.03 * raise + 0.03 * (t < 8.5 ? smooth(7, 8.2, t) : 0);
    if (t < catchT) {
      const u = smooth(6.6, catchT, t);
      leafWorld = tmpA.set(-0.85 + Math.sin(t * 2.4) * 0.45 * (1 - u) + 0.05, lerp(4.6, 0.72, u), 4.62);
      leafRot = Math.sin(t * 3) * 0.6; leafOn = t > 6.4;
    } else {
      leafWorld = 'local'; leafRot = lerp(0.3, -0.2, holdFront);
      lf.__hold = lerp(0.72, 0.2, holdFront);
    }
  } else if (scene4) {
    const wk = smooth(21.3, 23.0, t);
    lf.root.position.set(lerp(-0.85, -0.2, wk), 0, 4.6);
    const moving = t > 21.3 && t < 23.0 ? 1 : 0;
    walkPose(lf, t * 7.5, moving);
    const offer = smooth(23.4, 24.0, t) * (1 - smooth(24.8, 25.3, t));
    lf.armL.rotation.z = lerp(0.75, 1.3, offer); lf.armR.rotation.z = lerp(-0.75, 0.3, offer);
    if (t > 25.0) { lf.armL.rotation.z = lerp(0.75, -0.5, smooth(25.0, 25.4, t)); lf.armR.rotation.z = lerp(-0.75, 0.5, smooth(25.0, 25.4, t)); }
    lf.eyes.position.x = lerp(0.035, 0, smooth(25.4, 26, t));
    lf.eyes.position.y = 0.38 + 0.045 * smooth(25.4, 26.2, t);
    lf.pose.position.y += hop(t, 24.9, 0.5, 0.09) + hop(t, 25.5, 0.4, 0.05);
    leafWorld = t < 24.0 ? 'local' : t < 24.8 ? 'pass' : 'trav';
    lf.__hold = lerp(0.2, 0.3, offer);
    leafRot = -0.2;
  }
  faceCamera(lf);

  // ---- 旅の子 ----
  const tr = trav;
  tr.root.visible = scene3 || scene4;
  blink(tr, t, 0.9);
  showBack(tr, scene3);
  if (scene3) {
    const wu = smooth(13.5, 16.0, t);
    tr.root.position.set(lerp(0.3, 0.15, wu), 0, lerp(36.2, 35.5, wu));
    const moving = t < 15.8 ? 1 - smooth(15.3, 15.8, t) : 0;
    walkPose(tr, t * 7, moving);
    tr.armL.rotation.z = -0.35 + Math.sin(t * 7) * 0.3 * moving;
    tr.armR.rotation.z = 0.55;
    const lk = smooth(16.2, 17.4, t);
    tr.hat.position.y = 0.05 + 0.56 + 0.04 * lk; tr.hat.rotation.z = 0.08 * lk;
    tr.pose.scale.set(1 - 0.02 * lk, 1 + 0.04 * lk, 1);
    tint(tr, BLUE);
  } else if (scene4) {
    const wu = smooth(19.5, 22.6, t);
    tr.root.position.set(lerp(3.9, 0.75, wu), 0, lerp(4.6, 4.45, wu));
    const moving = t < 22.6 ? (1 - smooth(22.1, 22.6, t)) : 0;
    walkPose(tr, t * 7, moving);
    tr.face.scale.x = 1;
    tr.armL.rotation.z = -0.35 + Math.sin(t * 7) * 0.35 * moving;
    tr.armR.rotation.z = 0.55;
    tr.eyes.position.x = lerp(-0.035, 0, smooth(25.4, 26, t));
    const got = smooth(24.6, 25.0, t);
    tr.armL.rotation.z = lerp(tr.armL.rotation.z, 0.75, got); tr.armR.rotation.z = lerp(0.55, -0.6, got);
    const lk = smooth(25.4, 26.4, t);
    tr.eyes.position.y = 0.38 + 0.045 * lk; tr.hat.position.y = 0.05 + 0.56 + 0.025 * lk;
    tr.pose.scale.set(1 - 0.02 * lk, 1 + 0.04 * lk, 1);
    tr.pose.position.y += hop(t, 24.95, 0.5, 0.07);
    tint(tr, BLUE.clone().lerp(WARMT, smooth(24.8, 28.5, t) * 0.75));
  }
  tr.lglow.material.opacity = 0.6 + 0.12 * Math.sin(t * 4.3);
  faceCamera(tr);
  tr.root.updateMatrixWorld(true); lf.root.updateMatrixWorld(true);

  // ---- 光る葉っぱの位置 ----
  caught.visible = leafOn && !scene3 && !(scene1 && t < 6.4);
  if (scene1) caught.visible = false;
  if (leafWorld === 'local' || leafWorld === 'pass' || leafWorld === 'trav') {
    tmpA.set(0, lf.__hold ?? 0.2, 0.03).applyMatrix4(lf.face.matrixWorld);
    tmpB.set(0, 0.24, 0.03).applyMatrix4(tr.face.matrixWorld);
    if (leafWorld === 'local') caught.position.copy(tmpA);
    else if (leafWorld === 'trav') caught.position.copy(tmpB);
    else { const u = smooth(24.0, 24.8, t); caught.position.lerpVectors(tmpA, tmpB, u); caught.position.y += Math.sin(u * Math.PI) * 0.25; }
  } else if (leafWorld) caught.position.copy(leafWorld);
  caughtLeaf.rotation.z = leafRot;
  caught.quaternion.copy(camera.quaternion);
  caughtGlow.material.opacity = 0.75 + 0.15 * Math.sin(t * 5);

  // ---- ふもとの暮らし ----
  const life = !scene3;
  // 追いかけっこ
  chasers.forEach((f, i) => {
    f.root.visible = life;
    const ang = t * 1.6 + i * 1.1;
    f.root.position.set(1.9 + Math.cos(ang) * 0.95, 0, 2.6 + Math.sin(ang) * 0.42);
    walkPose(f, t * 10 + i, 1.2);
    f.armL.rotation.z = -0.9 + Math.sin(t * 10) * 0.4; f.armR.rotation.z = 0.9 - Math.sin(t * 10) * 0.4;
    f.face.scale.x = Math.sin(ang) > 0 ? -1 : 1;
    f.pose.position.y += Math.abs(Math.sin(t * 5 + i)) * 0.04;
    blink(f, t, 1.4 + i);
    faceCamera(f);
  });
  // 葉っぱを運ぶ子
  carrier.root.visible = life;
  const cu = ((t - 6.0) / 9) % 1;
  carrier.root.position.set(lerp(-4.2, 4.2, cu), 0, 1.25);
  walkPose(carrier, t * 6, 0.9);
  carrier.armL.rotation.z = -2.7; carrier.armR.rotation.z = 2.7;
  carryLeaf.rotation.z = Math.sin(t * 6) * 0.05;
  blink(carrier, t, 2.2); faceCamera(carrier);
  // 手をふる子
  waver.root.visible = life;
  waver.armR.rotation.z = 2.4 + Math.sin(t * 8) * 0.35; waver.armL.rotation.z = -0.4;
  waver.pose.position.y = hop(t % 2.4, 0.2, 0.4, 0.05);
  waver.eyes.position.x = 0.02;
  blink(waver, t, 3.1); faceCamera(waver);
  // ブランコ
  swinger.root.visible = life;
  swingPivot.visible = life;
  swingPivot.rotation.z = Math.sin(t * 1.4) * 0.32;
  swingPivot.updateMatrixWorld(true);
  tmpA.set(0, -5.4 + 0.02, 0).applyMatrix4(swingPivot.matrixWorld);
  swinger.root.position.copy(tmpA);
  swinger.pose.rotation.z = swingPivot.rotation.z * 0.6;
  swinger.armL.rotation.z = -2.9; swinger.armR.rotation.z = 2.9;
  swinger.footL.position.y = 0.04 + Math.max(0, Math.cos(t * 1.4)) * 0.03; swinger.footR.position.y = swinger.footL.position.y;
  blink(swinger, t, 0.6); faceCamera(swinger);

  for (const p of plants) {
    p.grp.rotation.y = Math.atan2(camera.position.x - p.grp.position.x, camera.position.z - p.grp.position.z);
    p.sway.rotation.z = Math.sin(t * p.f + p.ph) * p.amp;
  }
  for (const h of huts) h.rotation.y = Math.atan2(camera.position.x - h.position.x, camera.position.z - h.position.z);

  // 重なりの順番：カメラから遠い子から、その子の部品をまとめて描く
  {
    const wp = new THREE.Vector3();
    const list = allFairies.filter(f => f.root.visible).map(f => { f.root.getWorldPosition(wp); return { f, d: wp.distanceToSquared(camera.position) }; });
    list.sort((a, b) => b.d - a.d);
    list.forEach((o, i) => {
      const base = 100 + i * 40; o.f.__base = base;
      o.f.root.traverse(m => { if (m.isMesh || m.isSprite) m.renderOrder = base + (m.userData.ro ?? 0); });
    });
    const holder = leafWorld === 'trav' || (leafWorld === 'pass' && t > 24.4) ? trav : local;
    const hb = holder.__base ?? 100;
    caughtLeaf.renderOrder = hb + 27; caughtGlow.renderOrder = hb + 28;
  }

  // テロップと暗転
  let txt = '', op = 0;
  for (const [a, b, s] of TELOPS) if (t >= a - 0.1 && t <= b + 0.1) { txt = s; op = smooth(a, a + 0.6, t) * (1 - smooth(b - 0.6, b, t)); }
  telopEl.textContent = txt; telopEl.style.opacity = op;
  const dip = (c) => 1 - smooth(0, 0.45, Math.abs(t - c));
  blackEl.style.opacity = Math.max(1 - smooth(0, 0.8, t), dip(6.0), dip(13.5), dip(19.5), smooth(36.2, 37.0, t));

  renderer.render(scene, camera);
};

// ---------- 再生 ----------
const DURATION = 37.0;
const wrap = document.getElementById('wrap');
const startEl = document.getElementById('start'), endEl = document.getElementById('end');
function fit() {
  const sc = Math.min(window.innerWidth / W, window.innerHeight / H);
  wrap.style.transform = `scale(${sc})`;
  renderer.setPixelRatio(Math.min(2, Math.max(1, (window.devicePixelRatio || 1) * sc)));
  renderer.setSize(W, H, false);
}
window.addEventListener('resize', fit); fit();
let audio = null;
const audioReady = fetch('music.mp3').then(r => r.blob()).then(b => { audio = new Audio(URL.createObjectURL(b)); }).catch(() => {});
let playing = false, t0 = 0;
async function play() {
  startEl.classList.add('hide'); endEl.classList.add('hide');
  await audioReady;
  playing = true; t0 = performance.now();
  if (audio) { try { audio.currentTime = 0; await audio.play(); t0 = performance.now(); } catch (e) {} }
}
document.getElementById('playBtn').addEventListener('click', play);
document.getElementById('againBtn').addEventListener('click', play);
function loop() {
  requestAnimationFrame(loop);
  if (!playing) {
    window.renderAt(3.2);
    telopEl.style.opacity = 0; blackEl.style.opacity = 0.35;
    return;
  }
  const t = (performance.now() - t0) / 1000;
  if (t >= DURATION) { playing = false; endEl.classList.remove('hide'); window.renderAt(DURATION - 0.01); return; }
  window.renderAt(t);
}
loop();

