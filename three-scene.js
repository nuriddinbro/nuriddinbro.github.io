// 3D-сцена из светящихся частиц (Three.js).
// Частицы собираются в силуэт, а при прокрутке перетекают в фигуру каждого раздела:
// силуэт -> гарнитура -> щит с галочкой -> терминал -> глобус -> конверт.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";


const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = matchMedia("(max-width: 760px)").matches || matchMedia("(pointer: coarse)").matches;

// Проверка WebGL: если нет - остается обычная голограмма
const canvas = document.createElement("canvas");
canvas.id = "scene3d";
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
} catch (e) { renderer = null; }

if (renderer) start();

async function start() {
  const N = isMobile ? 4500 : 11000;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- Фигуры ----------
  // Каждая функция возвращает N точек (x, y, z), высота фигуры примерно 4 единицы.
  function fill(gen) {
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const p = gen(i);
      arr[i * 3] = p[0]; arr[i * 3 + 1] = p[1]; arr[i * 3 + 2] = p[2];
    }
    return arr;
  }
  const tube = (p, r) => [p[0] + rnd(-r, r), p[1] + rnd(-r, r), p[2] + rnd(-r, r)];
  const onSeg = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * t];
  function polyline(pts) { // случайная точка на ломаной
    const lens = []; let total = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); lens.push(l); total += l; }
    return () => {
      let r = Math.random() * total, i = 0;
      while (r > lens[i] && i < lens.length - 1) { r -= lens[i]; i++; }
      return onSeg(pts[i], pts[i + 1], r / lens[i]);
    };
  }

  // 1. Силуэт: берем контур из фото без фона (sil.png, прозрачный фон)
  async function silhouette() {
    const img = new Image();
    img.src = "sil.png";
    await img.decode();
    const W = 120, H = Math.round(W * img.height / img.width);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    const cells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 140) {
        cells.push([x, y]);
        // край фигуры - добавляем еще раз, чтобы контур был ярче
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (d[((y + dy) * W + x + dx) * 4 + 3] || 0) < 140);
        if (edge) { cells.push([x, y]); cells.push([x, y]); }
      }
    }
    if (!cells.length) return null;
    // нормализуем: высота 4.4, центр по X
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    cells.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
    const s = 4.4 / (maxY - minY), cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return fill(() => {
      const [x, y] = cells[(Math.random() * cells.length) | 0];
      const px = (x + Math.random() - cx) * s, py = -(y + Math.random() - cy) * s;
      const halfW = 1.3;
      const bulge = Math.sqrt(Math.max(0, 1 - (px / halfW) ** 2)) * .35;
      return [px, py, rnd(-bulge, bulge)];
    });
  }

  // 2. Гарнитура оператора
  function headset() {
    const R = 1.55;
    const mic = polyline([[-1.55, -0.55, .3], [-1.2, -1.25, .5], [-0.45, -1.55, .55]]);
    return fill(() => {
      const r = Math.random();
      if (r < .4) { const a = rnd(0, Math.PI); return tube([Math.cos(a) * R, Math.sin(a) * R * .95 + .05, 0], .09); }
      if (r < .85) {
        const side = Math.random() < .5 ? -1 : 1, a = rnd(0, Math.PI * 2), rr = Math.sqrt(Math.random()) * .62;
        return [side * (R + rnd(-.18, .18)), -0.15 + Math.sin(a) * rr, Math.cos(a) * rr];
      }
      if (r < .97) return tube(mic(), .05);
      return tube([-0.45, -1.55, .55], .14);
    });
  }

  // 3. Щит с галочкой (контроль качества)
  function shield() {
    const w = y => y > .55 ? 1.45 - (y - .55) * .25 : 1.45 * Math.sqrt(Math.max(0, (y + 2) / 2.55));
    const check = polyline([[-0.75, 0.05], [-0.15, -0.6], [0.9, 0.75]]);
    return fill(() => {
      const r = Math.random();
      if (r < .45) { const y = rnd(-2, 1.85); const s = Math.random() < .5 ? -1 : 1; return tube([s * w(y), y, 0], .05); }
      if (r < .55) { const x = rnd(-1.24, 1.24); return tube([x, 1.85 + Math.cos(x * 1.2) * .12, 0], .05); }
      if (r < .65) { let y, x; do { y = rnd(-1.9, 1.8); x = rnd(-1.4, 1.4); } while (Math.abs(x) > w(y) * .92); return [x, y, rnd(-.3, .3)]; }
      return tube(check(), .1);
    });
  }

  // 4. Терминал с "кодом"
  function terminal() {
    const lines = [];
    for (let row = 0; row < 11; row++) {
      let x = -1.65 + (row % 3 === 0 ? 0 : .3);
      while (x < 1.4 && Math.random() > .12) { const len = rnd(.2, .8); if (x + len > 1.7) break; lines.push([x, 1.0 - row * .25, len]); x += len + rnd(.12, .25); }
    }
    const frame = polyline([[-2.1, 1.75], [2.1, 1.75], [2.1, -1.95], [-2.1, -1.95], [-2.1, 1.75]]);
    return fill(() => {
      const r = Math.random();
      if (r < .28) return tube([...frame(), 0], .04);
      if (r < .34) return tube([rnd(-2.1, 2.1), 1.42, 0], .03);
      if (r < .38) return [rnd(-1.65, -1.4), rnd(-1.85, -1.6), rnd(-.05, .05)];
      const [x, y, len] = lines[(Math.random() * lines.length) | 0];
      return [x + Math.random() * len, y + rnd(-.04, .04), rnd(-.08, .08)];
    });
  }

  // 5. Глобус (языки)
  function globe() {
    const R = 1.95;
    return fill(() => {
      const r = Math.random();
      if (r < .3) { const u = rnd(-1, 1), a = rnd(0, Math.PI * 2), s = Math.sqrt(1 - u * u); return [R * s * Math.cos(a), R * u, R * s * Math.sin(a)]; }
      if (r < .65) { const lat = (((Math.random() * 7) | 0) - 3) * .4, a = rnd(0, Math.PI * 2); return tube([R * Math.cos(lat) * Math.cos(a), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(a)], .02); }
      const lon = ((Math.random() * 8) | 0) * Math.PI / 8, t = rnd(-Math.PI / 2, Math.PI / 2);
      return tube([R * Math.cos(t) * Math.cos(lon), R * Math.sin(t), R * Math.cos(t) * Math.sin(lon)], .02);
    });
  }

  // 6. Конверт (контакты)
  function envelope() {
    const w = 2.1, h = 1.4;
    const frame = polyline([[-w, h], [w, h], [w, -h], [-w, -h], [-w, h]]);
    const flap = polyline([[-w, h], [0, -0.15], [w, h]]);
    const bottom = polyline([[-w, -h], [-0.6, 0.25]]);
    const bottom2 = polyline([[w, -h], [0.6, 0.25]]);
    return fill(() => {
      const r = Math.random();
      if (r < .4) return tube([...frame(), 0], .05);
      if (r < .7) return tube([...flap(), .05], .05);
      if (r < .8) return tube([...(Math.random() < .5 ? bottom() : bottom2()), 0], .04);
      return [rnd(-w, w), rnd(-h, h), rnd(-.12, .12)];
    });
  }

  const sil = await silhouette().catch(() => null);
  const shapes = [sil || headset(), headset(), shield(), terminal(), globe(), envelope()];
  const anchors = [".hero", "#experience", "#portfolio", "#skills", "#languages", "#contacts"]
    .map(s => document.querySelector(s));

  // ---------- Сцена ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .1, 100);
  camera.position.z = 11;
  const dpr = Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x0a0d12, 1);

  // ---------- Фон: живая туманность (вместо плоского 2D-фона) ----------
  const bgMat = new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false,
    uniforms: { uTime: { value: 0 }, uScroll: { value: 0 }, uMouse: { value: new THREE.Vector2() }, uAspect: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime, uScroll, uAspect; uniform vec2 uMouse;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n(p); p *= 2.02; a *= 0.5; } return v; }
      void main(){
        vec2 uv = vUv; vec2 p = vec2(uv.x * uAspect, uv.y) * 2.2;
        p.y += uScroll * 0.6;
        float t = uTime * 0.03;
        float q = fbm(p + vec2(t, -t) + uMouse * 0.15);
        float r = fbm(p * 1.4 + q * 1.8 - vec2(t * 1.3, t * 0.7));
        vec3 base = vec3(0.039, 0.051, 0.071);
        vec3 cyan = vec3(0.31, 0.85, 1.0), violet = vec3(0.55, 0.48, 1.0);
        vec3 col = base + cyan * pow(r, 3.0) * 0.3 + violet * pow(q, 3.0) * 0.26;
        float vig = smoothstep(1.25, 0.25, length(uv - 0.5) * 1.6);
        gl_FragColor = vec4(col * (0.55 + 0.45 * vig), 1.0);
      }`
  });
  const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
  bgQuad.frustumCulled = false; bgQuad.renderOrder = -1;
  scene.add(bgQuad);

  // ---------- Пыль в глубине: ощущение пространства ----------
  const DUST = isMobile ? 700 : 1800;
  const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { dustPos.set([rnd(-16, 16), rnd(-12, 12), rnd(-22, 4)], i * 3); dustSeed[i] = Math.random(); }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("seed", new THREE.BufferAttribute(dustSeed, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: 1.6 * dpr } },
    vertexShader: `attribute float seed; uniform float uTime, uSize; varying float vA;
      void main(){ vec3 p = position; p.y += sin(uTime * .1 + seed * 20.0) * .4; p.x += cos(uTime * .08 + seed * 13.0) * .4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = uSize * (0.5 + seed) * (8.0 / -mv.z); gl_Position = projectionMatrix * mv;
        vA = (0.25 + 0.75 * abs(sin(uTime * .5 + seed * 30.0))) * smoothstep(-24.0, -2.0, mv.z) * 0.6; }`,
    fragmentShader: `varying float vA; void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; gl_FragColor = vec4(0.55, 0.85, 1.0, smoothstep(.5, 0., r) * vA); }`
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  const geo = new THREE.BufferGeometry();
  const posA = new THREE.BufferAttribute(shapes[0].slice(), 3);
  const posB = new THREE.BufferAttribute(shapes[1].slice(), 3);
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) seeds[i] = Math.random();
  geo.setAttribute("position", posA); // нужен для bounding sphere
  geo.setAttribute("posA", posA);
  geo.setAttribute("posB", posB);
  geo.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  const dirs = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const u = rnd(-1, 1), a = rnd(0, Math.PI * 2), s = Math.sqrt(1 - u * u); dirs.set([s * Math.cos(a), u, s * Math.sin(a)], i * 3); }
  geo.setAttribute("dir", new THREE.BufferAttribute(dirs, 3));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uMix: { value: 0 }, uAssemble: { value: reduce ? 1 : 0 },
      uSize: { value: (isMobile ? 2.6 : 2.3) * dpr }, uOpacity: { value: 1 },
      uMouse: { value: new THREE.Vector3(99, 99, 0) },
      uColorA: { value: new THREE.Color("#4fd8ff") }, uColorB: { value: new THREE.Color("#8b7bff") }
    },
    vertexShader: `
      attribute vec3 posA; attribute vec3 posB; attribute float seed; attribute vec3 dir;
      uniform float uTime, uMix, uAssemble, uSize, uOpacity; uniform vec3 uMouse;
      varying float vAlpha; varying float vSeed;
      void main() {
        float m = smoothstep(0.0, 1.0, uMix);
        vec3 p = mix(posA, posB, m);
        float bump = 4.0 * m * (1.0 - m);
        vec3 n = vec3(sin(uTime * .6 + seed * 12.0), cos(uTime * .5 + seed * 7.0), sin(uTime * .45 + seed * 3.0));
        p += n * (0.025 + bump * 0.55);
        vec3 far = dir * (6.0 + seed * 8.0);
        p = mix(far, p, uAssemble);
        vec2 d = p.xy - uMouse.xy;
        float dist = length(d);
        p.xy += normalize(d + vec2(.0001)) * smoothstep(1.3, 0.0, dist) * 0.55;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (0.55 + seed * 0.9) * (11.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
        vAlpha = uOpacity * (0.65 + 0.35 * sin(uTime * 1.5 + seed * 40.0));
        vSeed = seed;
      }`,
    fragmentShader: `
      uniform vec3 uColorA, uColorB;
      varying float vAlpha; varying float vSeed;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        float a = smoothstep(0.5, 0.0, r);
        vec3 col = mix(uColorA, uColorB, step(0.72, vSeed));
        gl_FragColor = vec4(col * 1.25, a * vAlpha * 0.9);
      }`
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  document.body.prepend(canvas);
  root.classList.add("webgl");

  // ---------- Постобработка: свечение + "пленка" (виньетка, цветной сдвиг по краям, зерно) ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), isMobile ? .9 : 1.1, .45, .2);
  composer.addPass(bloom);
  const film = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uShift: { value: .0015 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uTime, uShift; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 d = vUv - .5; float e = dot(d, d);
        vec2 off = d * uShift * (1.0 + e * 8.0);
        vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
        c *= 1.0 - e * 0.9;
        c += (h(vUv * 900.0 + fract(uTime)) - .5) * .035;
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  composer.addPass(film);

  let useComposer = true;

  // ---------- Раскладка ----------
  let viewW, viewH;
  function layout() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    composer.setPixelRatio(dpr);
    bgMat.uniforms.uAspect.value = camera.aspect;
    viewH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    viewW = viewH * camera.aspect;
  }
  layout();
  addEventListener("resize", layout);

  // ---------- Прокрутка: какая фигура и насколько перетекла ----------
  let curIndex = -1;
  const chapters = [...document.querySelectorAll(".chapter")];
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const sstep = (a, b, v) => { const x = clamp01((v - a) / (b - a)); return x * x * (3 - 2 * x); };
  // Главы: фигура перетекает при входе в главу и выходит крупно в центр, пока глава на экране
  function scrollState() {
    const y = scrollY, vh = innerHeight;
    let c = null;
    for (const ch of chapters) { const top = ch.getBoundingClientRect().top + y; if (top <= y + vh * .6) c = { el: ch, top, h: ch.offsetHeight }; }
    if (!c) return { i: 0, f: 0, focus: 0, hero: y < vh * .6 };
    const s = +c.el.dataset.shape;
    const f = clamp01((y + vh * .6 - c.top) / (vh * .9));
    const p = (y - c.top) / Math.max(1, c.h - vh);
    const focus = sstep(-.35, .05, p) * (1 - sstep(.72, 1.02, p));
    return { i: s - 1, f, focus, hero: false };
  }

  // ---------- Мышь ----------
  const mouse = { x: 0, y: 0, nx: 0, ny: 0 };
  addEventListener("pointermove", e => {
    mouse.nx = e.clientX / innerWidth * 2 - 1;
    mouse.ny = -(e.clientY / innerHeight) * 2 + 1;
  }, { passive: true });
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();

  // ---------- Цикл ----------
  const clock = new THREE.Clock();
  let assembleStart = null, smoothMix = 0, gx = 0, gy = 0, gs = 1, op = 1;
  let running = true;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; });

  // защита от тормозов: если кадры долгие - отключаем тяжелые эффекты
  let slowFrames = 0, lastT = 0, spin = 0;

  renderer.setAnimationLoop(() => {
    if (!running) return;
    const t = clock.getElapsedTime();
    const dt = t - lastT; lastT = t;
    if (t > 3 && useComposer) { slowFrames = dt > .045 ? slowFrames + 1 : Math.max(0, slowFrames - 1); if (slowFrames > 40) useComposer = false; }
    mat.uniforms.uTime.value = reduce ? 0 : t;
    dustMat.uniforms.uTime.value = reduce ? 0 : t;
    bgMat.uniforms.uTime.value = reduce ? 0 : t;
    film.uniforms.uTime.value = t;
    bgMat.uniforms.uScroll.value = scrollY / innerHeight * .12;
    bgMat.uniforms.uMouse.value.set(mouse.x, mouse.y);

    // сборка частиц после заставки
    if (!reduce && mat.uniforms.uAssemble.value < 1 && !document.getElementById("loader")) {
      if (assembleStart === null) assembleStart = t;
      const k = Math.min(1, (t - assembleStart) / 2.4);
      mat.uniforms.uAssemble.value = 1 - Math.pow(1 - k, 3);
    }

    // фигуры по прокрутке
    const dbg = new URLSearchParams(location.search).get("shape");
    const st = dbg !== null ? { i: Math.min(+dbg, shapes.length - 2), f: +dbg > shapes.length - 2 ? 1 : 0 } : scrollState();
    if (dbg !== null) mat.uniforms.uAssemble.value = 1;
    if (st.i !== curIndex) {
      curIndex = st.i;
      posA.array.set(shapes[st.i]); posA.needsUpdate = true;
      posB.array.set(shapes[st.i + 1]); posB.needsUpdate = true;
    }
    smoothMix = dbg !== null ? st.f : smoothMix + (st.f - smoothMix) * .08;
    mat.uniforms.uMix.value = smoothMix;

    // положение: в шапке справа и ярко, дальше - сбоку и мягче
    const inHero = dbg !== null ? +dbg === 0 : st.hero;
    const fo = dbg !== null ? (+dbg > 0 ? 1 : 0) : (st.focus || 0);
    const L = (a, b) => a + (b - a) * fo;
    let tx, ty, ts, to;
    if (isMobile || camera.aspect < .9) {
      tx = 0; ty = inHero ? viewH * .17 : L(0, viewH * .08); ts = inHero ? .62 : L(.7, .9); to = inHero ? .55 : L(.28, .85);
    } else {
      tx = inHero ? viewW * .22 : L(viewW * .26, viewW * .12); ty = inHero ? -.1 : L(0, .55); ts = inHero ? 1 : L(.85, 1.1); to = inHero ? 1 : L(.4, 1);
    }
    const k = dbg !== null ? 1 : .05;
    gx += (tx - gx) * k; gy += (ty - gy) * k; gs += (ts - gs) * k; op += (to - op) * k;
    group.position.set(gx, gy, 0);
    group.scale.setScalar(gs);
    mat.uniforms.uOpacity.value = op;

    // плавный поворот за мышкой + легкое покачивание
    mouse.x += (mouse.nx - mouse.x) * .05; mouse.y += (mouse.ny - mouse.y) * .05;
    // кино-камера: при перетекании фигура делает оборот, а камера мягко подлетает ближе
    const eased = smoothMix * smoothMix * (3 - 2 * smoothMix);
    const targetSpin = (curIndex + eased) * Math.PI * 2;
    spin = dbg !== null ? targetSpin : spin + (targetSpin - spin) * .06;
    const bump = 4 * eased * (1 - eased);
    group.rotation.y = spin + mouse.x * .45 + (reduce ? 0 : Math.sin(t * .25) * .18);
    group.rotation.x = -mouse.y * .18 + bump * .25;
    camera.position.z = 11 - bump * 2.2;
    camera.position.x = mouse.x * .35; camera.position.y = mouse.y * .25;
    camera.lookAt(0, 0, 0);
    bloom.strength = (isMobile ? .9 : 1.1) + bump * .6;
    film.uniforms.uShift.value = .0015 + bump * .004;

    // пыль: параллакс при прокрутке
    dust.position.y = scrollY / innerHeight * 1.4;
    dust.rotation.y = mouse.x * .08;

    // частицы разлетаются от курсора
    ray.setFromCamera({ x: mouse.nx, y: mouse.ny }, camera);
    if (ray.ray.intersectPlane(plane, hit)) {
      const local = group.worldToLocal(hit.clone());
      mat.uniforms.uMouse.value.copy(local);
    }

    if (useComposer) composer.render(); else renderer.render(scene, camera);
    if (location.search.includes("debug3d")) root.dataset.s3d = [!!sil, mat.uniforms.uAssemble.value.toFixed(2), op.toFixed(2), gx.toFixed(2), t.toFixed(1)].join("|");
  });
}
