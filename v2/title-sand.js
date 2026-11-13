// Песчинки на заголовке: с букв понемногу "сдувает" крошечные песчинки,
// а при наведении курсора на заголовок рядом с ним их становится больше. Текст остается читаемым.
(function () {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const title = document.querySelector(".title");
  if (!title) return;

  const cv = document.createElement("canvas");
  cv.className = "title-sand";
  document.body.appendChild(cv);
  const g = cv.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let box, W, H;
  function size() {
    W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
  }
  size(); addEventListener("resize", size);

  const grains = [];
  let hover = null, visible = true;
  title.addEventListener("pointermove", e => { hover = { x: e.clientX, y: e.clientY }; });
  title.addEventListener("pointerleave", () => { hover = null; });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(title);

  // источники: прямоугольники букв (и слова "портфолио")
  const sources = () => [...title.querySelectorAll(".c, em")].map(el => el.getBoundingClientRect()).filter(r => r.width > 0);

  function spawn(r, near) {
    const x = near ? near.x + (Math.random() - .5) * 60 : r.left + Math.random() * r.width;
    const y = near ? near.y + (Math.random() - .5) * 40 : r.top + r.height * (.35 + Math.random() * .6);
    grains.push({
      x, y,
      vx: .25 + Math.random() * .6 + (near ? (Math.random() - .3) * 1.2 : 0),
      vy: -(.05 + Math.random() * .25) + (near ? (Math.random() - .5) * .8 : 0),
      r: 1 + Math.random() * 1.6, a: .5 + Math.random() * .35, life: 1,
      blue: Math.random() < .35
    });
  }

  let acc = 0;
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible || !title.classList.contains("play")) return;
    // постоянный легкий "ветер": несколько песчинок в секунду
    acc += .6;
    const src = acc >= 1 ? sources() : null;
    while (acc >= 1 && src && src.length) { acc--; spawn(src[(Math.random() * src.length) | 0]); }
    // курсор над заголовком: песок сыплется от точки курсора
    if (hover) for (let k = 0; k < 2; k++) spawn(null, hover);

    g.clearRect(0, 0, W, H);
    for (let i = grains.length - 1; i >= 0; i--) {
      const p = grains[i];
      p.x += p.vx; p.y += p.vy; p.vy += .006; p.life -= .009;
      if (p.life <= 0) { grains.splice(i, 1); continue; }
      g.globalAlpha = p.a * p.life;
      g.fillStyle = p.blue ? "#1c86b5" : "#33414e";
      g.beginPath(); g.arc(p.x * dpr, p.y * dpr, p.r * dpr, 0, 6.283); g.fill();
    }
    if (grains.length > 500) grains.splice(0, grains.length - 500);
  })();
})();
