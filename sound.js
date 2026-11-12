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

    // Эмбиент: аккорд из тихих синусов через фильтр, который медленно "дышит"
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 700; filter.Q.value = .7;
    const lfo = ctx.createOscillator(); lfo.frequency.value = .05;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 350;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start();
    const pad = ctx.createGain(); pad.gain.value = .5;
    filter.connect(pad); pad.connect(master); pad.connect(delay);
    [110, 164.81, 246.94, 329.63].forEach((f, i) => {
      [-4, 4].forEach(det => {
        const o = ctx.createOscillator(); o.type = i % 2 ? "triangle" : "sine";
        o.frequency.value = f; o.detune.value = det;
        const g = ctx.createGain(); g.gain.value = .06 / (i + 1);
        o.connect(g); g.connect(filter); o.start();
      });
    });
    master.delay = delay;
  }

  function whoosh() {
    if (!on) return;
    const t = ctx.currentTime, len = 1.4;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(250, t); bp.frequency.exponentialRampToValueAtTime(2400, t + len * .6); bp.frequency.exponentialRampToValueAtTime(600, t + len);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.28, t + len * .45); g.gain.linearRampToValueAtTime(0, t + len);
    src.connect(bp); bp.connect(g); g.connect(master); g.connect(master.delay);
    src.start(t); src.stop(t + len);
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
  document.addEventListener("chapter", whoosh);
  document.querySelectorAll("a, button, .pf").forEach(el => el.addEventListener("mouseenter", tick));
})();
