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

  let ctx, master, wet, music;

  function build() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    // "Ледяное" эхо
    const d1 = ctx.createDelay(); d1.delayTime.value = .31;
    const fb = ctx.createGain(); fb.gain.value = .42;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200;
    d1.connect(lp); lp.connect(fb); fb.connect(d1); lp.connect(master);
    wet = d1;

    // Фоновая музыка: "эмбиент-пианино" в просторном зале (свое синтезированное эхо, без файлов)
    music = ctx.createGain(); music.gain.value = 0;
    const hall = ctx.createConvolver();
    const irLen = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.2); }
    hall.buffer = ir;
    const hallGain = ctx.createGain(); hallGain.gain.value = .55;
    const warm = ctx.createBiquadFilter(); warm.type = "lowpass"; warm.frequency.value = 2600;
    music.connect(warm); warm.connect(master); warm.connect(hall); hall.connect(hallGain); hallGain.connect(master);
    scheduler();
  }

  // Ноты в формате MIDI (60 = до первой октавы)
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  // Аккорды: Am9 - Fmaj7 - Cmaj7 - G6 (спокойно и немного мечтательно)
  const CHORDS = [[45, 57, 60, 64, 71], [41, 57, 60, 64, 65], [36, 55, 59, 64, 67], [43, 55, 59, 62, 64]];
  // Мелодия на 8 тактов (по 4 доли, 0 - пауза)
  const MELODY = [
    [76, 0, 72, 74], [76, 0, 69, 0], [67, 69, 72, 0], [74, 0, 71, 0],
    [72, 74, 76, 79], [77, 0, 76, 72], [74, 0, 72, 67], [69, 0, 0, 0]
  ];
  const BEAT = 60 / 68;                       // темп 68 ударов в минуту
  let nextT = 0, beat = 0;

  // "Пианино": несколько обертонов, верхние гаснут быстрее - звук теплый и мягкий
  function piano(n, t, vol, len) {
    const f = midi(n), out = ctx.createGain();
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vol, t + .008); out.gain.exponentialRampToValueAtTime(.0001, t + len);
    out.connect(music);
    [[1, 1, 1], [2, .32, .55], [3, .12, .35], [4, .05, .22]].forEach(([h, a, l]) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f * h; o.detune.value = (Math.random() - .5) * 4;
      const g = ctx.createGain(); g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(.0001, t + len * l);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + len + .05);
    });
  }

  function scheduler() {
    setInterval(() => {
      if (!on || !ctx || ctx.state !== "running") { nextT = 0; return; }
      if (!nextT) nextT = ctx.currentTime + .15;
      while (nextT < ctx.currentTime + .4) {
        const bar = Math.floor(beat / 4), b = beat % 4;
        const chord = CHORDS[bar % 4], mel = MELODY[bar % 8][b];
        if (b === 0) {                                   // начало такта: бас + мягкий аккорд "волной"
          piano(chord[0], nextT, .05, 4.5);
          chord.slice(1).forEach((n, k) => piano(n, nextT + .06 + k * .05, .018, 3.5));
        }
        if (b === 2) chord.slice(2, 4).forEach((n, k) => piano(n + 12, nextT + k * .04, .01, 2)); // тихие отголоски
        if (mel) piano(mel, nextT + (Math.random() - .5) * .02, .034, 2.8);                   // мелодия
        nextT += BEAT; beat++;
      }
    }, 90);
  }

  function fade(to) {
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(to, t + 1.5);
    // мелодия нарастает очень плавно (4 секунды), чтобы не напугать
    music.gain.cancelScheduledValues(t);
    music.gain.setValueAtTime(music.gain.value, t);
    music.gain.linearRampToValueAtTime(to ? .55 : 0, t + (to ? 4 : 1));
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
  const unlock = e => {
    if (e.target.closest && e.target.closest(".snd")) return;
    start();
    ["pointerdown", "keydown", "touchend"].forEach(n => removeEventListener(n, unlock, true));
  };
  ["pointerdown", "keydown", "touchend"].forEach(n => addEventListener(n, unlock, true));

  btn.addEventListener("click", () => {
    on = !on; label();
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
