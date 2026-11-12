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

  let ctx, master, wet, wind;

  function build() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    // "Ледяное" эхо
    const d1 = ctx.createDelay(); d1.delayTime.value = .31;
    const fb = ctx.createGain(); fb.gain.value = .42;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200;
    d1.connect(lp); lp.connect(fb); fb.connect(d1); lp.connect(master);
    wet = d1;

    // Ветер: мягкий шум через фильтр, который медленно "гуляет"
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; data[i] = last * 3.2; } // "коричневый" шум - мягкий
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = .6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = .07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 260; lfo.connect(lfoG); lfoG.connect(bp.frequency);
    wind = ctx.createGain(); wind.gain.value = .0;
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = .045;
    const lfo2G = ctx.createGain(); lfo2G.gain.value = .012; lfo2.connect(lfo2G); lfo2G.connect(wind.gain);
    src.connect(bp); bp.connect(wind); wind.connect(master);
    src.start(); lfo.start(); lfo2.start();
  }

  function fade(to) {
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(to, t + 1.5);
    wind.gain.setValueAtTime(to ? .03 : 0, t);
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

  document.addEventListener("section", chime);
  document.querySelectorAll("a, button, .chips li").forEach(el => el.addEventListener("mouseenter", tick));
})();
