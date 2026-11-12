// Звук сайта: тихий фоновый эмбиент + мягкий "вжух" при смене главы + тихий щелчок при наведении.
// Все синтезируется в браузере (Web Audio), без аудиофайлов. По умолчанию выключено.
(function () {
  const tools = document.querySelector(".pill-tools");
  if (!tools || !(window.AudioContext || window.webkitAudioContext)) return;

  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "snd"; btn.setAttribute("aria-pressed", "false");
  btn.setAttribute("aria-label", "Звук");
  btn.innerHTML = '<i><b></b><b></b><b></b></i><span>SOUND</span>';
  tools.prepend(btn);

  let ctx, master, on = false;

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

    // Мягкое "эхо" для глубины
    const delay = ctx.createDelay(); delay.delayTime.value = .38;
    const fb = ctx.createGain(); fb.gain.value = .35;
    delay.connect(fb); fb.connect(delay); delay.connect(master);

    master.delay = delay;

    // Фон: "музыкальная шкатулка" - редкие тихие ноты в случайном порядке, без гула
    const SCALE = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    (function loop() {
      if (on) {
        const t = ctx.currentTime;
        const n = SCALE[(Math.random() * SCALE.length) | 0];
        softNote(n, t, .028);
        if (Math.random() < .3) softNote(n * 1.5 > 1100 ? n / 2 : n * 1.5, t + .25, .018);
      }
      setTimeout(loop, 1800 + Math.random() * 2400);
    })();
  }

  function softNote(f, t, vol) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .04); g.gain.exponentialRampToValueAtTime(.0001, t + 3.2);
    o.connect(lp); lp.connect(g); g.connect(master); g.connect(master.delay);
    o.start(t); o.stop(t + 3.3);
  }

  // Хрустальный "дзинь": у каждой главы своя нота (пентатоника по восходящей)
  const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0];
  let lastChime = 0;
  function chime(e) {
    if (!on) return;
    const t = ctx.currentTime;
    if (t - lastChime < .6) return; // не чаще раза в полсекунды
    lastChime = t;
    const f = NOTES[((e && e.detail) || 0) % NOTES.length];
    [[1, .07, 2.6], [2.01, .025, 1.6], [3.0, .012, 1.0]].forEach(([mult, vol, len]) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + len);
      o.connect(g); g.connect(master); g.connect(master.delay);
      o.start(t); o.stop(t + len + .05);
    });
  }

  function tick() {
    if (!on) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.frequency.value = 1800; o.type = "sine";
    const g = ctx.createGain(); g.gain.setValueAtTime(.035, t); g.gain.exponentialRampToValueAtTime(.0001, t + .06);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + .07);
  }

  btn.addEventListener("click", () => {
    if (!ctx) init();
    on = !on;
    btn.setAttribute("aria-pressed", String(on));
    if (on) ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(on ? .55 : 0, ctx.currentTime + 1.2);
  });
  document.addEventListener("chapter", chime);
  document.querySelectorAll("a, button, .pf").forEach(el => el.addEventListener("mouseenter", tick));
})();
