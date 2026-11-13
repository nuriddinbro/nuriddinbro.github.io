// Версия 2: светлая морозная 3D-сцена.
// В центре - кристалл из тысяч матовых песчинок (как песчаная скульптура), вокруг - тонкие кольца, туман и снег.
// Прокрутка (родная, без перехвата): песок срывается шлейфом, как на ветру, и собирается в форму раздела:
// кристалл -> кольцо -> двойная спираль -> куб -> планета с кольцом -> снова кристалл.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
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
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.id = "scene";
  document.body.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = FOG.clone();
  scene.fog = new THREE.FogExp2(FOG, .05);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;

  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 100);

  // Свет: мягкий рассеянный + ключевой сверху-справа (дает объем песчинкам)
  scene.add(new THREE.HemisphereLight("#ffffff", "#9fb0bf", 1.1));
  const key = new THREE.DirectionalLight("#ffffff", 2.4); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight("#b8e2f2", 1.0); rim.position.set(-6, -2, -4); scene.add(rim);

  const rnd = (a, b) => a + Math.random() * (b - a);
  const N = isMobile ? 5200 : 14000;

  // ---------- Формы из песка: у каждой песчинки своя точка в каждой форме ----------
  function make(gen) { const a = new Float32Array(N * 3); for (let i = 0; i < N; i++) a.set(gen(i), i * 3); return a; }
  // кристалл: поверхность икосаэдра со "слоем" песка внутрь
  const ico = new THREE.IcosahedronGeometry(1.55, 0).toNonIndexed().attributes.position;
  const faces = ico.count / 3;
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), tmp = new THREE.Vector3();
  function crystalPt() {
    const f = (Math.random() * faces | 0) * 3;
    va.fromBufferAttribute(ico, f); vb.fromBufferAttribute(ico, f + 1); vc.fromBufferAttribute(ico, f + 2);
    let u = Math.random(), v = Math.random(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    tmp.copy(va).addScaledVector(vb.sub(va), u).addScaledVector(vc.sub(va), v);
    const depth = Math.pow(Math.random(), 2.2) * .35; // большинство песчинок у поверхности
    tmp.multiplyScalar(1 - depth / 1.55);
    return [tmp.x, tmp.y * 1.15, tmp.z];
  }
  const shell = (x, y, z, k) => { const d = Math.pow(Math.random(), 2.2) * k; const l = Math.hypot(x, y, z) || 1; return [x * (1 - d / l), y * (1 - d / l), z * (1 - d / l)]; };
  const forms = [
    make(crystalPt),
    make(() => { const a = rnd(0, 6.283), b = rnd(0, 6.283), r = .38 * Math.sqrt(Math.random() * .4 + .6); return [(1.75 + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b), (1.75 + r * Math.cos(b)) * Math.sin(a)]; }),                         // кольцо (тор)
    make(i => { const s = i % 2 ? Math.PI : 0, y = rnd(-1.9, 1.9), a = y * 2.2 + s, b = rnd(0, 6.283), r = .26 * Math.sqrt(Math.random()); return [Math.cos(a) * .95 + Math.cos(b) * r, y, Math.sin(a) * .95 + Math.sin(b) * r]; }),           // двойная спираль
    make(() => { const ax = Math.random() * 3 | 0, sg = Math.random() < .5 ? -1 : 1, p = [rnd(-1.15, 1.15), rnd(-1.15, 1.15), rnd(-1.15, 1.15)]; p[ax] = 1.15 * sg; return shell(p[0], p[1], p[2], .3); }),                          // куб
    make(i => { if (i % 3 === 0) { const a = rnd(0, 6.283), r = Math.sqrt(rnd(2.05 * 2.05, 2.7 * 2.7)); return [Math.cos(a) * r, rnd(-.03, .03), Math.sin(a) * r * .98]; }
      const u = rnd(-1, 1), a = rnd(0, 6.283), s = Math.sqrt(1 - u * u); return shell(1.4 * s * Math.cos(a), 1.4 * u, 1.4 * s * Math.sin(a), .3); }),                                                                              // планета с кольцом
    null
  ];
  forms[5] = forms[0];

  // ---------- Песчинки: InstancedMesh + шейдер, который двигает их на видеокарте ----------
  const grainGeo = new THREE.IcosahedronGeometry(.032, 0);
  const geo = new THREE.InstancedBufferGeometry().copy(grainGeo);
  geo.instanceCount = N;
  const aA = new THREE.InstancedBufferAttribute(forms[0].slice(), 3);
  const aB = new THREE.InstancedBufferAttribute(forms[1].slice(), 3);
  const seed = new Float32Array(N), dir = new Float32Array(N * 3), tint = new Float32Array(N);
  for (let i = 0; i < N; i++) { seed[i] = Math.random(); const u = rnd(-1, 1), a = rnd(0, 6.283), s = Math.sqrt(1 - u * u); dir.set([s * Math.cos(a), u, s * Math.sin(a)], i * 3); tint[i] = Math.random(); }
  geo.setAttribute("aA", aA); geo.setAttribute("aB", aB);
  geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
  geo.setAttribute("aDir", new THREE.InstancedBufferAttribute(dir, 3));
  geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(tint, 1));

  const U = {
    uTime: { value: 0 }, uMix: { value: 0 }, uIntro: { value: reduce ? 1 : 0 },
    uWind: { value: 0 }, uWindDir: { value: new THREE.Vector3(0, 1, 0) },
    uEx: { value: 0 }, uMouse: { value: new THREE.Vector3(99, 99, 99) }, uHover: { value: 0 }
  };
  const mat = new THREE.MeshStandardMaterial({ color: "#f2f6f8", roughness: .82, metalness: 0, envMapIntensity: .6 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = `
      attribute vec3 aA; attribute vec3 aB; attribute float aSeed; attribute vec3 aDir; attribute float aTint;
      uniform float uTime, uMix, uIntro, uWind, uEx, uHover; uniform vec3 uWindDir, uMouse;
      varying float vShade; varying float vTint;
    ` + sh.vertexShader.replace("#include <begin_vertex>", `
      float m = uMix;
      vec3 p = mix(aA, aB, m);
      float bump = 4.0 * m * (1.0 - m);
      vec3 n3 = vec3(sin(uTime * .7 + aSeed * 31.0), cos(uTime * .6 + aSeed * 17.0), sin(uTime * .5 + aSeed * 11.0));
      p += n3 * (0.004 + bump * 0.32 * aSeed);
      // ветер: легкие песчинки срываются и тянутся шлейфом
      float w = uWind * smoothstep(.3, 1.0, aSeed);
      p += uWindDir * w * (0.5 + aSeed * 1.8) + n3 * w * .3;
      // клик: песок разлетается
      p += normalize(p + vec3(.0001)) * uEx * (.4 + aSeed * .9) + n3 * uEx * .3;
      // курсор: песчинки расступаются
      vec3 dm = p - uMouse; float dd = length(dm);
      p += normalize(dm + vec3(.0001)) * smoothstep(.8, .0, dd) * .38 * uHover;
      // появление: песок слетается из облака
      p = mix(aDir * (4.0 + aSeed * 5.0), p, uIntro);
      vShade = clamp(length(mix(aA, aB, m)) / 1.6, .0, 1.0);
      vTint = aTint;
      vec3 transformed = position * (0.7 + aSeed * .7) + p;
    `);
    sh.fragmentShader = `varying float vShade; varying float vTint;
    ` + sh.fragmentShader.replace("#include <color_fragment>", `
      #include <color_fragment>
      diffuseColor.rgb *= mix(.8, 1.0, smoothstep(.55, 1.0, vShade));      // внутри "тень", снаружи светлее
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
  const side = [1, -1, 1, -1, 1, -1];
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
  const cloudMat = (sd, op) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uSeed: { value: sd }, uOp: { value: op } },
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
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
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
  const boom = () => { exV += 5.5; document.dispatchEvent(new CustomEvent("crystal")); };
  addEventListener("pointerdown", e => { if (!overUI(e.target) && hover) boom(); });
  addEventListener("touchend", e => {
    const tch = e.changedTouches[0]; if (!tch || overUI(e.target)) return;
    ndc.set(tch.clientX / innerWidth * 2 - 1, -(tch.clientY / innerHeight) * 2 + 1);
    if (hitCrystal()) boom();
  }, { passive: true });

  // ---------- Цикл ----------
  const clock = new THREE.Clock();
  let prog = progress(), intro = 0, curI = -1, wind = 0, lastProg = prog;
  const sm = x => x * x * (3 - 2 * x);
  const invQ = new THREE.Quaternion(), wdir = new THREE.Vector3();
  const dbg = new URLSearchParams(location.search);

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    const dbgAt = dbg.has("at");
    intro = dbgAt ? 1 : Math.min(1, intro + dt * .4);
    prog = dbgAt ? +dbg.get("at") : prog + (progress() - prog) * Math.min(1, dt * 3.5);
    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;

    // какая пара форм и насколько перетекла
    const i = Math.min(Math.floor(prog), forms.length - 2), f = sm(Math.min(1, prog - i));
    if (i !== curI) { curI = i; aA.array.set(forms[i]); aA.needsUpdate = true; aB.array.set(forms[i + 1]); aB.needsUpdate = true; }
    U.uMix.value = f;
    U.uTime.value = reduce ? 0 : t;
    U.uIntro.value = 1 - Math.pow(1 - intro, 3);

    // ветер от скорости прокрутки: песок срывается шлейфом
    const vel = dt > 0 ? (prog - lastProg) / dt : 0; lastProg = prog;
    wind += (Math.min(1.3, Math.abs(vel) * 1.6) - wind) * Math.min(1, dt * (Math.abs(vel) > .02 ? 6 : 1.6));
    U.uWind.value = reduce ? 0 : wind;
    const sideNow = side[i] + (side[i + 1] - side[i]) * f;
    wdir.set(-sideNow * .55, vel >= 0 ? 1 : -1, .25).normalize();
    invQ.copy(crystal.quaternion).invert(); wdir.applyQuaternion(invQ);
    U.uWindDir.value.copy(wdir);

    // клик: упругая "пружина" возвращает песок на место
    exV += (-ex * 30 - exV * 5) * dt; ex = Math.max(-.08, ex + exV * dt);
    U.uEx.value = ex;

    // курсор над кристаллом: песчинки расступаются вокруг точки курсора
    const h = hitCrystal();
    if (h !== hover) { hover = h; document.dispatchEvent(new CustomEvent("crystalhover", { detail: h })); }
    hoverAmt += ((hover ? 1 : 0) - hoverAmt) * .1;
    U.uHover.value = hoverAmt;
    crystal.getWorldPosition(wp);
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(hitP).negate(), wp);
    if (ray.ray.intersectPlane(plane, hitP)) U.uMouse.value.copy(crystal.worldToLocal(hitP.clone()));

    // положение и вращение
    const e = U.uIntro.value;
    crystal.scale.setScalar(.75 + .25 * e);
    crystal.rotation.y = (reduce ? 0 : t * .1) + prog * .9 + mouse.x * .35;
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

    composer.render();
  });
}
