// Версия 2: светлая морозная 3D-сцена.
// В центре - кристалл из тысяч матовых песчинок (как песчаная скульптура), вокруг - тонкие кольца, туман и снег.
// Прокрутка (родная, без перехвата): песок срывается шлейфом, как на ветру, и собирается в форму раздела:
// кристалл -> кольцо -> двойная спираль -> куб -> планета с кольцом -> снова кристалл.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const isMobile = matchMedia("(max-width: 860px)").matches || matchMedia("(pointer: coarse)").matches;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FOG = new THREE.Color("#dde4ea");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
} catch (e) { renderer = null; }
if (renderer) init();

function init() {
  let dpr = Math.min(devicePixelRatio || 1, isMobile ? 1.2 : 1.4);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.id = "scene";
  document.body.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = FOG.clone();
  scene.fog = new THREE.FogExp2(FOG, .03);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;

  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 100);

  // Свет: мягкий рассеянный + ключевой сверху-справа (дает объем песчинкам)
  scene.add(new THREE.HemisphereLight("#ffffff", "#9fb0bf", 1.1));
  const key = new THREE.DirectionalLight("#ffffff", 3.2); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight("#b8e2f2", 1.0); rim.position.set(-6, -2, -4); scene.add(rim);

  const rnd = (a, b) => a + Math.random() * (b - a);
  const N = isMobile ? 4500 : 12000;

  // ---------- Формы из песка: у каждой песчинки своя точка в каждой форме ----------
  // шапка - шар, опыт - силуэт, портфолио - щит с галочкой, навыки - гарнитура, языки - Сатурн, контакты - конверт
  function make(gen) { const a = new Float32Array(N * 3); for (let i = 0; i < N; i++) a.set(gen(i), i * 3); return a; }
  const shellIn = (x, y, z, k) => { const d = Math.pow(Math.random(), 2.2) * k, l = Math.hypot(x, y, z) || 1; return [x * (1 - d / l), y * (1 - d / l), z * (1 - d / l)]; };
  const ball = (R, k) => { const u = rnd(-1, 1), a = rnd(0, 6.283), s = Math.sqrt(1 - u * u); return shellIn(R * s * Math.cos(a), R * u, R * s * Math.sin(a), k); };
  const jit = (p, r) => [p[0] + rnd(-r, r), p[1] + rnd(-r, r), p[2] + rnd(-r, r)];
  function polyline(pts) { // случайная точка на ломаной
    const lens = []; let tot = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); lens.push(l); tot += l; }
    return () => { let r = Math.random() * tot, i = 0; while (r > lens[i] && i < lens.length - 1) { r -= lens[i]; i++; } const t = r / lens[i];
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t, (pts[i][2] || 0) + ((pts[i + 1][2] || 0) - (pts[i][2] || 0)) * t]; };
  }
  // шар
  const fSphere = make(() => ball(1.55, .32));
  // щит с галочкой: заполненный щит + объемная галочка поверх
  const shW = y => y > .55 ? 1.35 - (y - .55) * .22 : 1.35 * Math.sqrt(Math.max(0, (y + 1.85) / 2.4));
  const check = polyline([[-.7, .05, .22], [-.15, -.55, .22], [.85, .75, .22]]);
  const fShield = make(() => {
    if (Math.random() < .3) return jit(check(), .1);
    let x, y; do { y = rnd(-1.85, 1.75); x = rnd(-1.4, 1.4); } while (Math.abs(x) > shW(y));
    const edge = 1 - Math.abs(x) / Math.max(.01, shW(y));
    return [x, y, rnd(-.12, .12) + Math.sqrt(Math.max(0, edge)) * .12];
  });
  // гарнитура: дуга + две чашки + микрофон
  const mic = polyline([[-1.5, -.55, .25], [-1.15, -1.2, .45], [-.45, -1.5, .5]]);
  const fHeadset = make(() => {
    const r = Math.random();
    if (r < .38) { const a = rnd(0, Math.PI), b = rnd(0, 6.283), t = .16 * Math.sqrt(Math.random()); return [Math.cos(a) * (1.5 + Math.cos(b) * t), Math.sin(a) * 1.45 + .05 + Math.sin(b) * t, Math.cos(b) * t * .8]; }
    if (r < .86) { const sd = Math.random() < .5 ? -1 : 1, a = rnd(0, 6.283), rr = .55 * Math.sqrt(Math.random()); return [sd * (1.5 + rnd(-.22, .22)), -.15 + Math.sin(a) * rr, Math.cos(a) * rr]; }
    if (r < .97) return jit(mic(), .06);
    return jit([-.45, -1.5, .5], .15);
  });
  // Сатурн: шар + плоское кольцо
  const fSaturn = make(i => {
    if (i % 3 === 0) { const a = rnd(0, 6.283), r = Math.sqrt(rnd(1.75 * 1.75, 2.55 * 2.55)); return [Math.cos(a) * r, rnd(-.035, .035), Math.sin(a) * r]; }
    return ball(1.25, .28);
  });
  // конверт: плотная рамка + клапан (V) + нижние линии, все объемное
  const ew = 1.75, eh = 1.15;
  const frame = polyline([[-ew, eh], [ew, eh], [ew, -eh], [-ew, -eh], [-ew, eh]]);
  const flap = polyline([[-ew, eh, .1], [0, -.15, .2], [ew, eh, .1]]);
  const low1 = polyline([[-ew, -eh], [-.45, .2]]), low2 = polyline([[ew, -eh], [.45, .2]]);
  const fEnvelope = make(() => {
    const r = Math.random();
    if (r < .38) return jit(frame(), .08);
    if (r < .68) return jit(flap(), .08);
    if (r < .8) return jit(Math.random() < .5 ? low1() : low2(), .06);
    return [rnd(-ew, ew), rnd(-eh, eh), rnd(-.06, .06)];
  });
  const forms = [fSphere, fSphere, fShield, fHeadset, fSaturn, fEnvelope];
  // силуэт (из фото без фона) подставляется, когда картинка загрузится
  (async () => {
    try {
      const img = new Image(); img.src = new URL("../sil.png", import.meta.url).href; await img.decode();
      const W = 110, H = Math.round(W * img.height / img.width);
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0, W, H);
      const d = g.getImageData(0, 0, W, H).data, cells = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 140) cells.push([x, y]);
      if (!cells.length) return;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      cells.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
      const sc = 3.9 / (y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      forms[1] = make(() => {
        const [x, y] = cells[(Math.random() * cells.length) | 0];
        const px = (x + Math.random() - cx) * sc, py = -(y + Math.random() - cy) * sc;
        const bulge = Math.sqrt(Math.max(0, 1 - (px / 1.25) ** 2)) * .42;
        return [px, py, rnd(-bulge, bulge)];
      });
      aF[1].array.set(forms[1]); aF[1].needsUpdate = true; // силуэт загружен - один раз обновляем
    } catch (e) {}
  })();

  // ---------- Песчинки: InstancedMesh + шейдер, который двигает их на видеокарте ----------
  const grainGeo = new THREE.OctahedronGeometry(.046, 0); // 8 граней вместо 20 - в 2,5 раза легче
  const geo = new THREE.InstancedBufferGeometry().copy(grainGeo);
  geo.instanceCount = N;
  // все 6 фигур загружаются в видеокарту один раз - дальше только смешиваются (без лагов)
  const aF = forms.map(fm => new THREE.InstancedBufferAttribute(fm.slice(), 3));
  const seed = new Float32Array(N), dir = new Float32Array(N * 3), tint = new Float32Array(N);
  for (let i = 0; i < N; i++) { seed[i] = Math.random(); const u = rnd(-1, 1), a = rnd(0, 6.283), s = Math.sqrt(1 - u * u); dir.set([s * Math.cos(a), u, s * Math.sin(a)], i * 3); tint[i] = Math.random(); }
  aF.forEach((at, k) => geo.setAttribute("aF" + k, at));
  geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
  geo.setAttribute("aDir", new THREE.InstancedBufferAttribute(dir, 3));
  geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(tint, 1));

  const U = {
    uTime: { value: 0 }, uMix: { value: 0 }, uIntro: { value: reduce ? 1 : 0 },
    uWind: { value: 0 }, uWindDir: { value: new THREE.Vector3(0, 1, 0) },
    uEx: { value: 0 }, uMouse: { value: new THREE.Vector3(99, 99, 99) }, uHover: { value: 0 },
    uW: { value: [1, 0, 0, 0, 0, 0] }, uView: { value: new THREE.Vector3(0, 0, -1) },
    uTrail: { value: Array.from({ length: 8 }, () => new THREE.Vector4(99, 99, 99, 0)) }
  };
  const mat = new THREE.MeshStandardMaterial({ color: "#a9bccb", roughness: .78, metalness: 0, envMapIntensity: .45 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = `
      attribute vec3 aF0; attribute vec3 aF1; attribute vec3 aF2; attribute vec3 aF3; attribute vec3 aF4; attribute vec3 aF5;
      attribute float aSeed; attribute vec3 aDir; attribute float aTint;
      uniform float uW[6]; uniform vec4 uTrail[8]; uniform vec3 uView;
      uniform float uTime, uMix, uIntro, uWind, uEx, uHover; uniform vec3 uWindDir, uMouse;
      varying float vShade; varying float vTint;
    ` + sh.vertexShader.replace("#include <begin_vertex>", `
      float m = uMix;
      vec3 shape = aF0 * uW[0] + aF1 * uW[1] + aF2 * uW[2] + aF3 * uW[3] + aF4 * uW[4] + aF5 * uW[5];
      vec3 p = shape;
      float bump = pow(sin(m * 3.14159), 2.0);
      vec3 n3 = vec3(sin(uTime * .7 + aSeed * 31.0), cos(uTime * .6 + aSeed * 17.0), sin(uTime * .5 + aSeed * 11.0));
      p += n3 * (0.002 + bump * (0.22 + aSeed * .5)) + normalize(p + vec3(.0001)) * bump * (.2 + aSeed * .35);
      // ветер: легкие песчинки срываются и тянутся шлейфом
      float w = uWind * smoothstep(.3, 1.0, aSeed);
      p += uWindDir * w * (0.5 + aSeed * 1.8) + n3 * w * .3;
      // клик: песок разлетается
      p += normalize(p + vec3(.0001)) * uEx * (.4 + aSeed * .9) + n3 * uEx * .3;
      // курсор: песчинки расступаются
      // расстояние считаем "как на экране" (вдоль взгляда не учитываем) - курсор достает и до середины фигуры
      vec3 dm = p - uMouse; dm -= dot(dm, uView) * uView; float dd = length(dm);
      p += normalize(dm + vec3(.0001)) * pow(smoothstep(.7, .0, dd), 1.6) * .14 * uHover;
      // след курсора: песчинки вдоль пути разлетаются и плавно оседают
      for (int k = 0; k < 8; k++) {
        vec4 tp = uTrail[k];
        vec3 dv = p - tp.xyz; dv -= dot(dv, uView) * uView; float dk = length(dv);
        float kk = tp.w * pow(smoothstep(.8, .0, dk), 1.6);
        p += normalize(dv + vec3(.0001)) * kk * .34 + n3 * kk * .18 - uView * kk * .22;
      }
      // появление: песок слетается из облака
      p = mix(aDir * (4.0 + aSeed * 5.0), p, uIntro);
      vShade = clamp(length(shape) / 1.6, .0, 1.0);
      vTint = aTint;
      vec3 transformed = position * (0.7 + aSeed * .7) + p;
    `);
    sh.fragmentShader = `varying float vShade; varying float vTint;
    ` + sh.fragmentShader.replace("#include <color_fragment>", `
      #include <color_fragment>
      diffuseColor.rgb *= mix(.72, 1.0, smoothstep(.55, 1.0, vShade));      // внутри "тень", снаружи светлее
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.86, .93, 1.0), step(.7, vTint)); // часть песчинок с голубым оттенком
    `);
  };
  const sand = new THREE.Mesh(geo, mat);
  sand.frustumCulled = false;
  const crystal = new THREE.Group();
  crystal.add(sand);
  scene.add(crystal);

  // Тонкие кольца вокруг (как орбиты)
  const ringMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .4, metalness: 0, transparent: true, opacity: .7 });
  const rings = [[2.45, .006, .35, .1], [2.95, .004, -.25, .5], [3.5, .003, .1, -.4]].map(([r, tube, rx, rz]) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 160), ringMat);
    m.rotation.set(Math.PI / 2 + rx, 0, rz); crystal.add(m); return m;
  });

  // Где кристалл на экране (напротив панели) и как стоит камера
  const side = [1.35, -1, 1, -1, 1, -1];
  const camA = [0, .38, -.32, .28, -.36, .1];
  const camE = [.06, .2, -.06, .36, .1, .04];
  const camR = [8.2, 7.6, 7.8, 8.2, 7.4, 8];

  // ---------- Снег ----------
  const sprite = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.4, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const SN = isMobile ? 500 : 1400;
  const snowP = new Float32Array(SN * 3), snowS = new Float32Array(SN);
  for (let i = 0; i < SN; i++) { snowP.set([rnd(-14, 14), rnd(-8, 8), rnd(-14, 6)], i * 3); snowS[i] = rnd(.2, 1); }
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute("position", new THREE.BufferAttribute(snowP, 3));
  scene.add(new THREE.Points(snowGeo, new THREE.PointsMaterial({ map: sprite, color: "#ffffff", size: .07, transparent: true, opacity: .85, depthWrite: false, fog: true })));

  // ---------- Глубина фона ----------
  const farGroup = new THREE.Group(); scene.add(farGroup);
  const farMat = new THREE.MeshStandardMaterial({ color: "#f4f7f9", roughness: .5, metalness: 0, flatShading: true, envMapIntensity: .8 });
  const farEdge = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: .4, fog: true });
  const FAR = isMobile ? 10 : 22, far = [];
  for (let k = 0; k < FAR; k++) {
    const g = Math.random() < .5 ? new THREE.OctahedronGeometry(rnd(.25, .8)) : new THREE.IcosahedronGeometry(rnd(.25, .7), 0);
    g.scale(1, rnd(1.2, 2.2), 1);
    const m = new THREE.Mesh(g, farMat);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), farEdge));
    m.position.set(rnd(-16, 16), rnd(-5, 6), rnd(-24, -7));
    m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
    farGroup.add(m);
    far.push({ m, y: m.position.y, sp: rnd(.1, .35), ph: rnd(0, 6) });
  }
  // облака: шум рисуется ОДИН раз в картинку, дальше картинка просто медленно плывет (почти без нагрузки)
  const cloudTex = (() => {
    const S = 256, c = document.createElement("canvas"); c.width = S; c.height = S;
    const g = c.getContext("2d"), img = g.createImageData(S, S);
    const h = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
    const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
      const X = v => ((v % 8) + 8) % 8; // бесшовно по краям
      const a = h(X(xi), X(yi)), b = h(X(xi + 1), X(yi)), cc = h(X(xi), X(yi + 1)), d = h(X(xi + 1), X(yi + 1));
      return a + (b - a) * u + (cc - a) * w + (a - b - cc + d) * u * w; };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let v = 0, amp = .5, fx = x / S * 8, fy = y / S * 8;
      for (let o = 0; o < 4; o++) { v += amp * n(fx * (1 << o), fy * (1 << o)); amp *= .5; }
      const al = Math.max(0, Math.min(1, (v - .42) / .38)) * 255, i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = al;
    }
    g.putImageData(img, 0, 0);
    const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; return tx;
  })();
  const cloudMat = (sd, op) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uSeed: { value: sd }, uOp: { value: op }, uTex: { value: cloudTex } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime, uSeed, uOp; uniform sampler2D uTex;
      void main(){
        float c = texture2D(uTex, vUv * vec2(1.8, .8) + vec2(uTime * .006 + uSeed, uSeed * .37)).a;
        float edge = smoothstep(0.0, .25, vUv.x) * smoothstep(1.0, .75, vUv.x) * smoothstep(0.0, .3, vUv.y) * smoothstep(1.0, .6, vUv.y);
        gl_FragColor = vec4(vec3(1.0), c * edge * uOp);
      }`
  });  const clouds = [[-9, .55, 1.3], [-15, .45, 7.7], [-4.5, .28, 3.1]].map(([z, op, sd]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(46, 16), cloudMat(sd, op));
    m.position.set(0, -2.5 + sd * .3, z); scene.add(m); return m;
  });
  const rayMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime;
      void main(){ float a = smoothstep(0.0, .5, vUv.x) * smoothstep(1.0, .5, vUv.x) * pow(vUv.y, 1.6);
        a *= .5 + .5 * sin(uTime * .35 + vUv.x * 3.0); gl_FragColor = vec4(1.0, 1.0, 1.0, a * .16); }`
  });
  [[-3, 1.4, .18], [1.5, 2.4, -.12], [5, 1.8, .22], [8, 2.8, -.05]].forEach(([x, w, rot]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 18), rayMat);
    m.position.set(x, 4, -10); m.rotation.z = rot + .35; scene.add(m);
  });

  // ---------- Рендер ----------
  // рисуем сразу на экран (без лишнего прохода обработки)

  let lastW = 0, lastH = 0;
  function resize() {
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 140 && lastW) return; // адресная строка на телефоне
    lastW = innerWidth; lastH = innerHeight;
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.render(scene, camera);
  }
  resize(); addEventListener("resize", resize);

  // ---------- Прокрутка -> положение в истории (0..5) ----------
  const scenes = [...document.querySelectorAll(".scene")];
  function progress() {
    const y = scrollY + innerHeight / 2;
    const mids = scenes.map(s => s.offsetTop + s.offsetHeight / 2);
    if (y <= mids[0]) return 0;
    for (let i = 0; i < mids.length - 1; i++) if (y < mids[i + 1]) return i + (y - mids[i]) / (mids[i + 1] - mids[i]);
    return mids.length - 1;
  }

  // ---------- Мышь и клик ----------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(9, 9), plane = new THREE.Plane(), hitP = new THREE.Vector3(), wp = new THREE.Vector3();
  let hover = false, hoverAmt = 0, ex = 0, exV = 0;
  addEventListener("pointermove", e => {
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5;
  }, { passive: true });
  const overUI = el => el && el.closest && el.closest("a, button, .panel, .hud, .intro > *, input");
  const hitCrystal = () => { ray.setFromCamera(ndc, camera); crystal.getWorldPosition(wp); return ray.ray.distanceToPoint(wp) < 1.75 * crystal.scale.x; };
  const boom = () => { exV += 3.6; document.dispatchEvent(new CustomEvent("crystal")); };
  addEventListener("pointerdown", e => { if (!overUI(e.target) && hover) boom(); });
  addEventListener("touchend", e => {
    const tch = e.changedTouches[0]; if (!tch || overUI(e.target)) return;
    ndc.set(tch.clientX / innerWidth * 2 - 1, -(tch.clientY / innerHeight) * 2 + 1);
    if (hitCrystal()) boom();
  }, { passive: true });

  // ---------- Цикл ----------
  const clock = new THREE.Clock();
  let prog = progress(), intro = 0, wind = 0, lastProg = prog, trI = 0, lowered = false, frames = 0, ftime = 0, progV = 0, rotY = 0;
  const trAge = new Array(8).fill(99);
  const sm = x => x * x * x * (x * (x * 6 - 15) + 10); // очень плавная кривая (без рывков в начале и в конце)
  const invQ = new THREE.Quaternion(), wdir = new THREE.Vector3();
  const dbg = new URLSearchParams(location.search);

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    const dbgAt = dbg.has("at");
    intro = dbgAt ? 1 : Math.min(1, intro + dt * .4);
    if (dbgAt) prog = +dbg.get("at"); else { const tg = progress(); progV += ((tg - prog) * 10 - progV * 6.3) * dt; prog += progV * dt; if (Math.abs(tg - prog) < .0005 && Math.abs(progV) < .001) { prog = tg; progV = 0; } }
    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;

    // какая пара форм и насколько перетекла
    const i = Math.min(Math.floor(prog), forms.length - 2), f = sm(Math.min(1, prog - i));
    for (let k = 0; k < 6; k++) U.uW.value[k] = 0;
    U.uW.value[i] += 1 - f; U.uW.value[i + 1] += f;
    U.uMix.value = f;
    U.uTime.value = reduce ? 0 : t;
    U.uIntro.value = 1 - Math.pow(1 - intro, 3);

    // ветер от скорости прокрутки: песок срывается шлейфом
    const vel = dt > 0 ? (prog - lastProg) / dt : 0; lastProg = prog;
    wind += (Math.min(.9, Math.abs(vel) * 1.2) - wind) * Math.min(1, dt * (Math.abs(vel) > .02 ? 2.2 : 1.1));
    U.uWind.value = reduce ? 0 : wind;
    const sideNow = side[i] + (side[i + 1] - side[i]) * f;
    wdir.set(-sideNow * .55, vel >= 0 ? 1 : -1, .25).normalize();
    invQ.copy(crystal.quaternion).invert(); wdir.applyQuaternion(invQ);
    U.uWindDir.value.copy(wdir);

    // клик: упругая "пружина" возвращает песок на место
    exV += (-ex * 18 - exV * 8) * dt; ex = Math.max(0, ex + exV * dt);
    U.uEx.value = ex;

    // курсор над кристаллом: песчинки расступаются вокруг точки курсора
    const h = hitCrystal();
    if (h !== hover) { hover = h; document.dispatchEvent(new CustomEvent("crystalhover", { detail: h })); }
    hoverAmt += ((hover ? 1 : 0) - hoverAmt) * Math.min(1, dt * 2.5);
    U.uHover.value = hoverAmt;
    // след курсора по шару: новые точки, старые плавно "гаснут"
    const tr = U.uTrail.value;
    for (let k = 0; k < 8; k++) { trAge[k] += dt; const ag = trAge[k]; tr[k].w = ag < .28 ? sm(ag / .28) : Math.max(0, 1 - sm(Math.min(1, (ag - .28) / 1.9))); }
    crystal.getWorldPosition(wp);
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(hitP).negate(), wp);
    { const vd = camera.getWorldDirection(new THREE.Vector3()); invQ.copy(crystal.quaternion).invert(); U.uView.value.copy(vd.applyQuaternion(invQ)).normalize(); }
    if (ray.ray.intersectPlane(plane, hitP)) {
      const loc = crystal.worldToLocal(hitP.clone());
      U.uMouse.value.copy(loc);
      const lastT = tr[trI];
      if (hover && Math.hypot(loc.x - lastT.x, loc.y - lastT.y, loc.z - lastT.z) > .16) { trI = (trI + 1) % 8; tr[trI].set(loc.x, loc.y, loc.z, 0); trAge[trI] = 0; }
    }

    // положение и вращение
    const e = U.uIntro.value;
    crystal.scale.setScalar(.75 + .25 * e);
    // фигура смотрит на зрителя (на камеру) и лишь мягко покачивается; при перетекании делает пол-оборота
    const camAz = camA[i] + (camA[i + 1] - camA[i]) * f;
    const rotTarget = camAz + (reduce ? 0 : Math.sin(t * .25) * .32) + Math.sin(f * Math.PI) * .7 + mouse.x * .35;
    rotY += (rotTarget - rotY) * Math.min(1, dt * 2.4);
    crystal.rotation.y = rotY;
    crystal.rotation.x = mouse.y * .18;
    const wide = camera.aspect > 1.1;
    crystal.position.x = wide ? sideNow * Math.min(2.4, camera.aspect * 1.25) : 0;
    crystal.position.y = wide ? 0 : 1.1;
    rings.forEach((r, k) => { r.rotation.z += dt * (.05 + k * .03) * (k % 2 ? -1 : 1); });

    // камера
    const L = arr => arr[i] + (arr[i + 1] - arr[i]) * f;
    const a = L(camA) + mouse.x * .12, el = L(camE) - mouse.y * .08, r = L(camR) + (1 - e) * 4;
    camera.position.set(Math.sin(a) * Math.cos(el) * r, Math.sin(el) * r, Math.cos(a) * Math.cos(el) * r);
    camera.lookAt(crystal.position.x * .35, crystal.position.y * .5, 0);

    // фон
    if (!reduce) {
      far.forEach(o => { o.m.position.y = o.y + Math.sin(t * o.sp + o.ph) * .4; o.m.rotation.y += dt * o.sp * .3; });
      clouds.forEach(c => { c.material.uniforms.uTime.value = t; });
      rayMat.uniforms.uTime.value = t;
      const p = snowGeo.attributes.position.array;
      for (let k = 0; k < SN; k++) { p[k * 3 + 1] -= dt * .25 * snowS[k]; p[k * 3] += Math.sin(t * .5 + k) * dt * .05; if (p[k * 3 + 1] < -8) p[k * 3 + 1] = 8; }
      snowGeo.attributes.position.needsUpdate = true;
    }
    farGroup.rotation.y = prog * .12 + mouse.x * .06;
    clouds.forEach((c, k) => { c.position.x = -prog * (.6 + k * .3) + mouse.x * (k + 1) * .4; });

    renderer.render(scene, camera);

    // автоподстройка: если кадры долгие - меньше песчинок и четкость
    if (t > 2.5 && !lowered) { frames++; ftime += dt; if (frames >= 90) { if (ftime / frames > .022) { lowered = true; renderer.setPixelRatio(1); } frames = 0; ftime = 0; } }
  });
}
