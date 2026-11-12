// 3D-сцена из светящихся частиц (Three.js).
// Частицы собираются в силуэт, а при прокрутке перетекают в фигуру каждого раздела:
// силуэт -> гарнитура -> щит с галочкой -> терминал -> глобус -> конверт.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = matchMedia("(max-width: 760px)").matches || matchMedia("(pointer: coarse)").matches;

// Проверка WebGL: если нет - остается обычная голограмма
const canvas = document.createElement("canvas");
canvas.id = "scene3d";
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
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
  renderer.setClearColor(0x000000, 0);

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
        gl_FragColor = vec4(col, a * vAlpha * 0.85);
      }`
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  document.body.prepend(canvas);
  root.classList.add("webgl");

  // ---------- Раскладка ----------
  let viewW, viewH;
  function layout() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    viewH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    viewW = viewH * camera.aspect;
  }
  layout();
  addEventListener("resize", layout);

  // ---------- Прокрутка: какая фигура и насколько перетекла ----------
  let curIndex = -1;
  function scrollState() {
    const y = scrollY + innerHeight * .5;
    const tops = anchors.map(a => a ? a.getBoundingClientRect().top + scrollY : Infinity);
    let i = 0;
    while (i < tops.length - 1 && y >= tops[i + 1]) i++;
    if (i >= shapes.length - 1) return { i: shapes.length - 2, f: 1, last: true };
    const len = tops[i + 1] - tops[i];
    const frac = Math.min(1, Math.max(0, (y - tops[i]) / len));
    const f = Math.min(1, Math.max(0, (frac - .6) / .4)); // перетекает в конце раздела
    return { i, f };
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

  renderer.setAnimationLoop(() => {
    if (!running) return;
    const t = clock.getElapsedTime();
    mat.uniforms.uTime.value = reduce ? 0 : t;

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
    const inHero = curIndex === 0 && st.f < .05 && scrollY < innerHeight * .6;
    let tx, ty, ts, to;
    if (isMobile || camera.aspect < .9) {
      tx = 0; ty = inHero ? viewH * .17 : 0; ts = inHero ? .62 : .7; to = inHero ? .55 : .3;
    } else {
      tx = viewW * (inHero ? .22 : .26); ty = inHero ? -.1 : 0; ts = inHero ? 1 : .85; to = inHero ? 1 : .42;
    }
    const k = dbg !== null ? 1 : .05;
    gx += (tx - gx) * k; gy += (ty - gy) * k; gs += (ts - gs) * k; op += (to - op) * k;
    group.position.set(gx, gy, 0);
    group.scale.setScalar(gs);
    mat.uniforms.uOpacity.value = op;

    // плавный поворот за мышкой + легкое покачивание
    mouse.x += (mouse.nx - mouse.x) * .05; mouse.y += (mouse.ny - mouse.y) * .05;
    group.rotation.y = mouse.x * .45 + (reduce ? 0 : Math.sin(t * .25) * .18);
    group.rotation.x = -mouse.y * .18;

    // частицы разлетаются от курсора
    ray.setFromCamera({ x: mouse.nx, y: mouse.ny }, camera);
    if (ray.ray.intersectPlane(plane, hit)) {
      const local = group.worldToLocal(hit.clone());
      mat.uniforms.uMouse.value.copy(local);
    }

    renderer.render(scene, camera);
    if (location.search.includes("debug3d")) root.dataset.s3d = [!!sil, mat.uniforms.uAssemble.value.toFixed(2), op.toFixed(2), gx.toFixed(2), t.toFixed(1)].join("|");
  });
}
