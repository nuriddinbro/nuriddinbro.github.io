// Звуки версии 2 ("мороз"): тихий ветер, стеклянный "дзинь" при смене экрана, легкие щелчки при наведении.
// Включено по умолчанию. Браузеры не дают играть звук до первого клика/касания,
// поэтому звук стартует при первом нажатии где угодно на странице. Кнопка SOUND выключает.
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  const top = document.querySelector(".hud-top .lang");
  if (!AC || !top) return;

  let on = true;
  try { if (localStorage.getItem("snd") === "off") on = false; } catch (e) {}

  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "snd";
  btn.innerHTML = "<i><b></b><b></b><b></b></i><span></span>";
  top.before(btn);
  const label = () => { btn.setAttribute("aria-pressed", String(on)); btn.querySelector("span").textContent = on ? "SOUND ON" : "SOUND OFF"; };
  label();

  let ctx, master, wet, music, track;
  const TRACK_URL = new URL("snowfall.mp3", document.currentScript.src).href;
  const MUSIC_VOL = .16; // тихо: примерно 16% громкости

  function build() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    // "Ледяное" эхо
    const d1 = ctx.createDelay(); d1.delayTime.value = .31;
    const fb = ctx.createGain(); fb.gain.value = .42;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200;
    d1.connect(lp); lp.connect(fb); fb.connect(d1); lp.connect(master);
    wet = d1;

    // Фоновая музыка: трек "Snowfall" - Scott Buckley (CC BY 4.0). Играет тихо, по кругу.
    music = ctx.createGain(); music.gain.value = 0;
    music.connect(master);
    track = new Audio(TRACK_URL);
    track.loop = true; track.preload = "none"; track.crossOrigin = "anonymous";
    ctx.createMediaElementSource(track).connect(music);
  }


  function fade(to) {
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(to, t + 1.5);
    // музыка нарастает очень плавно (6 секунд), чтобы никого не напугать
    music.gain.cancelScheduledValues(t);
    music.gain.setValueAtTime(music.gain.value, t);
    music.gain.linearRampToValueAtTime(to ? MUSIC_VOL : 0, t + (to ? 6 : 1.2));
    if (to) { track.play().catch(() => {}); }
    else setTimeout(() => { if (!on) track.pause(); }, 1300);
  }

  function start() {
    if (!ctx) build();
    ctx.resume();
    if (on) fade(.9);
  }

  // Стеклянный "дзинь": у каждого экрана своя нота
  const NOTES = [659.25, 783.99, 880, 987.77, 1174.66, 1318.51];
  let last = 0;
  function chime(e) {
    if (!on || !ctx || ctx.state !== "running") return;
    const t = ctx.currentTime; if (t - last < .5) return; last = t;
    const f = NOTES[((e && e.detail) || 0) % NOTES.length];
    [[1, .045, 2.4], [2.76, .012, 1.2], [5.4, .006, .6]].forEach(([m, v, l]) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f * m;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + l);
      o.connect(g); g.connect(master); g.connect(wet); o.start(t); o.stop(t + l + .05);
    });
  }

  // Тихий щелчок при наведении
  function tick() {
    if (!on || !ctx || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = 2600;
    const g = ctx.createGain(); g.gain.setValueAtTime(.012, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + .06);
  }

  // Первый клик/касание/клавиша - запускаем звук (если не выключен)
  // Подсказка: если браузер не дал включить звук сам - "нажмите в любом месте"
  const hint = document.createElement("span");
  hint.className = "snd-hint"; hint.setAttribute("data-i18n", "snd_hint");
  hint.textContent = "нажмите в любом месте - включится музыка";
  btn.after(hint);
  const hideHint = () => hint.classList.remove("show");

  const unlock = e => {
    if (e.target.closest && e.target.closest(".snd")) return;
    start(); hideHint();
    ["pointerdown", "keydown", "touchend"].forEach(n => removeEventListener(n, unlock, true));
  };
  ["pointerdown", "keydown", "touchend"].forEach(n => addEventListener(n, unlock, true));

  // Попытка включить музыку сразу при входе (часть браузеров разрешает, если человек уже бывал на сайте)
  if (on) {
    try {
      build();
      ctx.resume().catch(() => {});
      track.preload = "auto";
      track.play().then(() => { if (ctx.state === "running") { fade(.9); ["pointerdown", "keydown", "touchend"].forEach(n => removeEventListener(n, unlock, true)); } }).catch(() => {});
    } catch (e) {}
    setTimeout(() => { if (on && (!ctx || ctx.state !== "running")) hint.classList.add("show"); }, 2600);
  }

  btn.addEventListener("click", () => {
    on = !on; label(); hideHint();
    try { localStorage.setItem("snd", on ? "on" : "off"); } catch (e) {}
    if (!ctx) build();
    ctx.resume();
    fade(on ? .9 : 0);
  });

  // Звон стекла при разлете кристалла: россыпь высоких "дзинь" + легкий хруст
  function shatter() {
    if (!on || !ctx) return;
    ctx.resume();
    const t0 = ctx.currentTime;
    for (let k = 0; k < 9; k++) {
      const t = t0 + k * .035 + Math.random() * .03;
      const f = 1800 + Math.random() * 3400;
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.03 * (1 - k / 12), t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .5 + Math.random() * .6);
      o.connect(g); g.connect(master); g.connect(wet); o.start(t); o.stop(t + 1.2);
    }
    const len = ctx.sampleRate * .25, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    const n = ctx.createBufferSource(); n.buffer = b;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3500;
    const ng = ctx.createGain(); ng.gain.value = .05;
    n.connect(hp); hp.connect(ng); ng.connect(master); n.start(t0);
    // и тихий "собрался обратно" через полсекунды
    setTimeout(() => chime({ detail: 0 }), 650);
  }

  // Смена раздела: тихий мягкий шорох пересыпающегося песка (вместо "дзинь")
  let lastSwish = 0;
  function swish() {
    if (!on || !ctx || ctx.state !== "running") return;
    const t = ctx.currentTime; if (t - lastSwish < 1.2) return; lastSwish = t;
    const len = .9, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < .35 ? 1 : .35); // "зернистый" шум
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = .8;
    bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(900, t + len);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.012, t + .25); g.gain.linearRampToValueAtTime(0, t + len);
    src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(master);
    src.start(t); src.stop(t + len);
  }
  document.addEventListener("section", swish);
  document.addEventListener("crystal", shatter);
  document.querySelectorAll("a, button, .chips li").forEach(el => el.addEventListener("mouseenter", tick));
})();
