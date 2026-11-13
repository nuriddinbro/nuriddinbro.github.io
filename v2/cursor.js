// Курсор версии 2: точка + кольцо и морозный след из снежинок. Только для мышки.
(function () {
  if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement;
  root.classList.add("cur-on");

  const cur = document.createElement("div");
  cur.className = "cur";
  cur.innerHTML = '<i class="cur-dot"></i>';
  document.body.appendChild(cur);
  const dot = cur.querySelector(".cur-dot");

  // Морозный след
  const cv = document.createElement("canvas");
  cv.className = "frost";
  document.body.appendChild(cv);
  const g = cv.getContext("2d");
  let W, H; const dpr = Math.min(devicePixelRatio || 1, 2);
  const size = () => { W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; };
  size(); addEventListener("resize", size);

  const flakes = [];
  let mx = -100, my = -100, rx = -100, ry = -100, lx = 0, ly = 0;
  addEventListener("pointermove", e => {
    mx = e.clientX; my = e.clientY;
    const d = Math.hypot(mx - lx, my - ly);
    if (d > 6) { // чем быстрее движение - тем больше снежинок
      const n = Math.min(3, d / 14 | 0) + 1;
      for (let k = 0; k < n; k++) flakes.push({ x: mx + (Math.random() - .5) * 8, y: my + (Math.random() - .5) * 8, vx: (Math.random() - .5) * .4, vy: Math.random() * .3 + .15, r: Math.random() * 2.6 + 1.4, a: 1, rot: Math.random() * 6.28, star: Math.random() < .45 });
      lx = mx; ly = my;
    }
  }, { passive: true });

  function snowflake(r) { // шестилучевая снежинка
    g.beginPath();
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.stroke();
  }

  (function loop() {
    rx += (mx - rx) * .18; ry += (my - ry) * .18;
    dot.style.transform = `translate(${mx}px, ${my}px)`;

    g.clearRect(0, 0, W, H);
    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i];
      f.x += f.vx; f.y += f.vy; f.a -= .016; f.rot += .02;
      if (f.a <= 0) { flakes.splice(i, 1); continue; }
      g.save();
      g.translate(f.x * dpr, f.y * dpr); g.rotate(f.rot);
      g.globalAlpha = f.a * .9;
      if (f.star) { g.strokeStyle = "rgba(28,134,181,.9)"; g.lineWidth = .9 * dpr; snowflake(f.r * dpr * 1.4); }
      else { g.fillStyle = "rgba(255,255,255,1)"; g.shadowColor = "rgba(28,134,181,.6)"; g.shadowBlur = 4 * dpr; g.beginPath(); g.arc(0, 0, f.r * dpr * .55, 0, 6.28); g.fill(); }
      g.restore();
    }
    requestAnimationFrame(loop);
  })();

  // Кольцо реагирует на кнопки/ссылки и на кристалл
  document.addEventListener("pointerover", e => {
    cur.classList.toggle("hover", !!e.target.closest("a, button, .chips li, .job"));
  });
  document.addEventListener("crystalhover", e => cur.classList.toggle("crystal", e.detail));
  addEventListener("pointerdown", () => cur.classList.add("down"));
  addEventListener("pointerup", () => cur.classList.remove("down"));
  document.addEventListener("mouseleave", () => { mx = my = -100; });
})();
