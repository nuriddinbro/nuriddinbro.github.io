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

    // Фоновая мелодия: тихий "пианино"-перебор по аккордам Am - F - C - G
    music = ctx.createGain(); music.gain.value = 0;
    const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 1900;
    music.connect(tone); tone.connect(master); tone.connect(wet);
    scheduler();
  }

  // Ноты в формате MIDI: 57 = A3, 60 = C4 ...
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const CHORDS = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]];
  const PATTERN = [0, 2, 3, 2, 1, 2, 3, 2];   // перебор: 8 нот на такт
  const STEP = 60 / 66 / 2;                   // темп 66 ударов в минуту, восьмые
  let nextT = 0, step = 0;

  function pianoNote(f, t, vol, len) {
    const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = f * 2; o2.detune.value = 3;
    const g2 = ctx.createGain(); g2.gain.value = .25;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(music);
    o1.start(t); o2.start(t); o1.stop(t + len + .05); o2.stop(t + len + .05);
  }

  function scheduler() {
    setInterval(() => {
      if (!on || !ctx || ctx.state !== "running") { nextT = 0; return; }
      if (!nextT) nextT = ctx.currentTime + .1;
      while (nextT < ctx.currentTime + .35) {
        const bar = Math.floor(step / 8) % CHORDS.length, chord = CHORDS[bar], k = step % 8;
        pianoNote(midi(chord[PATTERN[k]] + 12), nextT, k === 0 ? .05 : .035, 1.8);
        if (k === 0) pianoNote(midi(chord[0] - 12), nextT, .06, 3.2);            // мягкий бас в начале такта
        if (k === 4 && Math.random() < .5) pianoNote(midi(chord[3] + 12), nextT + STEP * .5, .025, 2); // редкое "украшение"
        nextT += STEP; step++;
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

  document.addEventListener("section", chime);
  document.addEventListener("crystal", shatter);
  document.querySelectorAll("a, button, .chips li").forEach(el => el.addEventListener("mouseenter", tick));
})();
