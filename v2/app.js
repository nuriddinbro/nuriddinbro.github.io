// Версия 2: светлая морозная 3D-сцена.
// В центре - стеклянный кристалл из 80 осколков с преломлением света. Вокруг - туман и снег.
// Прокрутка (родная, без перехвата) ведет камеру, а осколки перестраиваются для каждого раздела:
// кристалл -> кольцо -> спираль -> решетка -> сфера -> снова кристалл.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const isMobile = matchMedia("(max-width: 860px)").matches || matchMedia("(pointer: coarse)").matches;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FOG = new THREE.Color("#dde4ea");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (e) { renderer = null; }
if (renderer) init();

function init() {
  const dpr = Math.min(devicePixelRatio || 1, isMobile ? 1.3 : 1.6);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.id = "scene";
  document.body.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = FOG.clone();
  scene.fog = new THREE.FogExp2(FOG, .055);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;

  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 100);

  // Свет: мягкий ключевой сверху-справа и холодный контровой
  const key = new THREE.DirectionalLight("#ffffff", 2.2); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight("#9fd6ee", 1.6); rim.position.set(-6, -2, -4); scene.add(rim);

  // ---------- Кристалл из осколков ----------
  const crystal = new THREE.Group();
  scene.add(crystal);
  const base = new THREE.IcosahedronGeometry(1.45, 1).toNonIndexed();
  const P = base.attributes.position;
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#ffffff", metalness: 0, roughness: .2, transmission: 1, thickness: .6, ior: 1.45,
    clearcoat: 1, clearcoatRoughness: .1,
    attenuationColor: new THREE.Color("#a9dcef"), attenuationDistance: 1.6,
    envMapIntensity: 1.5, flatShading: true, specularIntensity: 1
  });
  const edgeMat = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: .55 });
  const shards = [];
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let f = 0; f < P.count; f += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(P, f + k);
    const c = new THREE.Vector3().add(v[0]).add(v[1]).add(v[2]).divideScalar(3);
    const inner = c.clone().multiplyScalar(.55); // внутренняя вершина - осколок становится "пирамидкой"
    const pts = [v[0], v[1], v[2], inner].map(p => p.clone().sub(c));
    const g = new THREE.BufferGeometry().setFromPoints([
      pts[0], pts[1], pts[2], pts[0], pts[3], pts[1], pts[1], pts[3], pts[2], pts[2], pts[3], pts[0]
    ]);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, glass);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat));
    m.position.copy(c);
    crystal.add(m);
    shards.push({ m, home: c, rnd: Math.random() });
  }
  const N = shards.length;

  // Свет и частицы внутри кристалла
  const glow = new THREE.PointLight("#5cc8f0", 6, 6, 1.6); crystal.add(glow);
  const sprite = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.4, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const coreGeo = new THREE.BufferGeometry();
  const coreN = 260, coreP = new Float32Array(coreN * 3);
  for (let i = 0; i < coreN; i++) { const r = Math.cbrt(Math.random()) * .9, a = Math.random() * 6.283, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u); coreP.set([r * s * Math.cos(a), r * u, r * s * Math.sin(a)], i * 3); }
  coreGeo.setAttribute("position", new THREE.BufferAttribute(coreP, 3));
  const core = new THREE.Points(coreGeo, new THREE.PointsMaterial({ map: sprite, color: "#7fd6f5", size: .09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  crystal.add(core);

  // ---------- Формы для разделов ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  const forms = [
    shards.map(s => ({ p: s.home.clone(), r: new THREE.Euler() })),                                  // кристалл
    shards.map((s, i) => { const a = i / N * Math.PI * 2; return { p: new THREE.Vector3(Math.cos(a) * 2.1, Math.sin(i * 1.7) * .3, Math.sin(a) * 2.1), r: new THREE.Euler(rnd(-3, 3), rnd(-3, 3), rnd(-3, 3)) }; }), // кольцо
    shards.map((s, i) => { const a = i * .55; return { p: new THREE.Vector3(Math.cos(a) * 1.0, (i / N - .5) * 3.8, Math.sin(a) * 1.0), r: new THREE.Euler(0, -a, rnd(-.4, .4)) }; }),               // спираль
    shards.map((s, i) => ({ p: new THREE.Vector3((i % 5 - 2) * .62, ((i / 5 | 0) % 4 - 1.5) * .62, ((i / 20 | 0) - 1.5) * .62), r: new THREE.Euler(0, 0, 0) })),                                        // решетка
    shards.map(s => ({ p: s.home.clone().normalize().multiplyScalar(1.95), r: new THREE.Euler(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)) })),                                                                  // сфера
    shards.map(s => ({ p: s.home.clone(), r: new THREE.Euler() }))                                     // снова кристалл
  ];
  // Где кристалл на экране (напротив панели) и как стоит камера
  const side = [1, -1, 1, -1, 1, -1];
  const camA = [0, .38, -.32, .28, -.36, .1];   // поворот вокруг
  const camE = [.06, .2, -.06, .36, .1, .04];   // высота
  const camR = [8.2, 7.4, 7.6, 8, 7, 8];        // расстояние

  // ---------- Снег ----------
  const SN = isMobile ? 500 : 1400;
  const snowP = new Float32Array(SN * 3), snowS = new Float32Array(SN);
  for (let i = 0; i < SN; i++) { snowP.set([rnd(-14, 14), rnd(-8, 8), rnd(-14, 6)], i * 3); snowS[i] = rnd(.2, 1); }
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute("position", new THREE.BufferAttribute(snowP, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ map: sprite, color: "#ffffff", size: .07, transparent: true, opacity: .85, depthWrite: false, fog: true }));
  scene.add(snow);

  // ---------- Глубина фона ----------
  // 1) Далекие кристаллы, парящие в тумане
  const farGroup = new THREE.Group(); scene.add(farGroup);
  const farMat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: .25, metalness: 0, clearcoat: 1, envMapIntensity: 1.2, flatShading: true, transparent: true, opacity: .9 });
  const farEdge = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: .4, fog: true });
  const FAR = isMobile ? 10 : 22, far = [];
  for (let k = 0; k < FAR; k++) {
    const g = Math.random() < .5 ? new THREE.OctahedronGeometry(rnd(.25, .8)) : new THREE.IcosahedronGeometry(rnd(.25, .7), 0);
    g.scale(1, rnd(1.2, 2.2), 1); // вытянутые, как ледяные кристаллы
    const m = new THREE.Mesh(g, farMat);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), farEdge));
    m.position.set(rnd(-16, 16), rnd(-5, 6), rnd(-24, -7));
    m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
    farGroup.add(m);
    far.push({ m, y: m.position.y, sp: rnd(.1, .35), ph: rnd(0, 6) });
  }

  // 2) Медленно плывущие слои облаков (процедурный шум)
  const cloudMat = (seed, op) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uOp: { value: op } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime, uSeed, uOp;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = .5; for (int i = 0; i < 5; i++) { v += a * n(p); p *= 2.03; a *= .5; } return v; }
      void main(){
        vec2 p = vUv * vec2(3.0, 1.6) + vec2(uTime * .012, 0.0);
        float c = fbm(p + fbm(p * 1.3 + uTime * .01));
        float edge = smoothstep(0.0, .25, vUv.x) * smoothstep(1.0, .75, vUv.x) * smoothstep(0.0, .3, vUv.y) * smoothstep(1.0, .6, vUv.y);
        gl_FragColor = vec4(vec3(1.0), smoothstep(.45, .85, c) * edge * uOp);
      }`
  });
  const clouds = [[-9, .55, 1.3], [-15, .45, 7.7], [-4.5, .28, 3.1]].map(([z, op, sd]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(46, 16), cloudMat(sd, op));
    m.position.set(0, -2.5 + sd * .3, z); scene.add(m); return m;
  });

  // 3) Мягкие лучи света сверху
  const rayMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime;
      void main(){ float a = smoothstep(0.0, .5, vUv.x) * smoothstep(1.0, .5, vUv.x) * pow(vUv.y, 1.6);
        a *= .5 + .5 * sin(uTime * .35 + vUv.x * 3.0); gl_FragColor = vec4(1.0, 1.0, 1.0, a * .16); }`
  });
  const rays = new THREE.Group(); scene.add(rays);
  [[-3, 1.4, .18], [1.5, 2.4, -.12], [5, 1.8, .22], [8, 2.8, -.05]].forEach(([x, w, rot]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 18), rayMat);
    m.position.set(x, 4, -10); m.rotation.z = rot + .35; rays.add(m);
  });

  // ---------- Постобработка ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .35, .6, .88);
  // свечение не используем: на светлом фоне оно почти незаметно, а битые пиксели раздувало в черные пятна
  composer.addPass(new OutputPass());

  let lastW = 0, lastH = 0;
  function resize() {
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 140 && lastW) return; // адресная строка на телефоне
    lastW = innerWidth; lastH = innerHeight;
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
    composer.render();
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
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  // ---------- Интерактив: наведение и клик по кристаллу ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(9, 9);
  const meshes = shards.map(s => s.m);
  let hover = false, hoverAmt = 0, ex = 0, exV = 0;
  const spin = shards.map(() => new THREE.Vector3((Math.random() - .5) * 2, (Math.random() - .5) * 2, (Math.random() - .5) * 2));
  addEventListener("pointermove", e => { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }, { passive: true });
  const overUI = el => el && el.closest && el.closest("a, button, .panel, .hud, .intro > *, input");
  addEventListener("pointerdown", e => {
    if (overUI(e.target) || !hover) return;
    exV += 6; // осколки разлетаются
    document.dispatchEvent(new CustomEvent("crystal"));
  });
  // на телефоне: тап по пустому месту рядом с кристаллом
  addEventListener("touchend", e => {
    const tch = e.changedTouches[0]; if (!tch || overUI(e.target)) return;
    ndc.set(tch.clientX / innerWidth * 2 - 1, -(tch.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.intersectObjects(meshes, false).length) { exV += 6; document.dispatchEvent(new CustomEvent("crystal")); }
  }, { passive: true });
  addEventListener("pointermove", e => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; }, { passive: true });

  // ---------- Цикл ----------
  const clock = new THREE.Clock();
  let prog = progress(), intro = 0, slow = 0, bloomOn = !isMobile;
  const sm = x => x * x * (3 - 2 * x);
  const tmpQ = new THREE.Quaternion(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    if (t > 3 && bloomOn) { slow = dt > .045 ? slow + 1 : Math.max(0, slow - 1); if (slow > 40) { bloom.enabled = false; bloomOn = false; } }
    const dbgAt = location.search.includes("at=");
    intro = dbgAt ? 1 : Math.min(1, intro + dt * .45);
    prog = dbgAt ? +new URLSearchParams(location.search).get("at") : prog + (progress() - prog) * Math.min(1, dt * 4);
    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;

    const i = Math.min(Math.floor(prog), forms.length - 2), f = sm(Math.min(1, prog - i));
    const burst = Math.sin(f * Math.PI); // в середине перехода осколки чуть разлетаются

    // осколки
    for (let k = 0; k < N; k++) {
      const s = shards[k], A = forms[i][k], B = forms[i + 1][k];
      s.m.position.lerpVectors(A.p, B.p, f).addScaledVector(s.home, burst * .15 * (1 + s.rnd) + hoverAmt * .09 + ex * (.45 + s.rnd * .6));
      qA.setFromEuler(A.r); qB.setFromEuler(B.r);
      s.m.quaternion.copy(tmpQ.slerpQuaternions(qA, qB, f));
      if (ex > .002) { s.m.rotateX(spin[k].x * ex * 2.5); s.m.rotateY(spin[k].y * ex * 2.5); } // осколки кружатся при разлете
      if (!reduce) s.m.position.y += Math.sin(t * .8 + k) * .02 * (i > 0 || f > 0 ? 1 : .3);
    }
    // появление кристалла
    const e = 1 - Math.pow(1 - intro, 3);
    crystal.scale.setScalar(.6 + .4 * e);

    // наведение: луч из курсора в кристалл
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(meshes, false).length > 0;
    if (h !== hover) { hover = h; document.dispatchEvent(new CustomEvent("crystalhover", { detail: h })); }
    hoverAmt += ((hover ? 1 : 0) - hoverAmt) * .08;
    // разлет по клику: упругая "пружина" возвращает осколки на место
    exV += (-ex * 38 - exV * 5.5) * dt;
    ex = Math.max(-.1, ex + exV * dt);

    crystal.rotation.y = (reduce ? 0 : t * .12) + prog * .9 + mouse.x * .4;
    crystal.rotation.x = mouse.y * .2;
    const sx = side[i] + (side[i + 1] - side[i]) * f;
    const wide = camera.aspect > 1.1;
    crystal.position.x = wide ? sx * Math.min(2.4, camera.aspect * 1.25) : 0;
    crystal.position.y = wide ? 0 : 1.1;
    glow.intensity = 4 + Math.sin(t * 1.4) * 1.2 + burst * 4 + hoverAmt * 3 + ex * 14;
    core.rotation.y = t * .2;

    // камера
    const L = arr => arr[i] + (arr[i + 1] - arr[i]) * f;
    const a = L(camA) + mouse.x * .12, el = L(camE) - mouse.y * .08, r = L(camR) + (1 - e) * 4;
    camera.position.set(Math.sin(a) * Math.cos(el) * r, Math.sin(el) * r, Math.cos(a) * Math.cos(el) * r);
    camera.lookAt(crystal.position.x * .35, crystal.position.y * .5, 0);

    // фон: далекие кристаллы покачиваются, облака плывут, лучи дышат
    if (!reduce) {
      far.forEach(o => { o.m.position.y = o.y + Math.sin(t * o.sp + o.ph) * .4; o.m.rotation.y += dt * o.sp * .3; });
      clouds.forEach(c => { c.material.uniforms.uTime.value = t; });
      rayMat.uniforms.uTime.value = t;
    }
    farGroup.rotation.y = prog * .12 + mouse.x * .06;
    clouds.forEach((c, k) => { c.position.x = -prog * (.6 + k * .3) + mouse.x * (k + 1) * .4; });

    // снег медленно падает
    if (!reduce) {
      const p = snowGeo.attributes.position.array;
      for (let k = 0; k < SN; k++) {
        p[k * 3 + 1] -= dt * .25 * snowS[k];
        p[k * 3] += Math.sin(t * .5 + k) * dt * .05;
        if (p[k * 3 + 1] < -8) p[k * 3 + 1] = 8;
      }
      snowGeo.attributes.position.needsUpdate = true;
    }

    if (bloomOn || !isMobile) composer.render(); else composer.render();
  });
}
