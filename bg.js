// Живой фон: плавающие цветные пятна + сетка точек, которая светится рядом с курсором.
(function () {
  const c = document.getElementById("bg");
  if (!c) return;
  const ctx = c.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w, h, dots = [], t = 0, running = true;
  const mouse = { x: -999, y: -999, tx: -999, ty: -999 };
  const GAP = 34;

  // Цветные пятна: лайм, бирюза, фиолетовый
  const blobs = [
    { c: [79, 216, 255], r: .45, x: .80, y: .20, sx: .00021, sy: .00017, p: 0 },
    { c: [59, 108, 255], r: .40, x: .10, y: .70, sx: .00016, sy: .00023, p: 2 },
    { c: [124, 92, 255], r: .38, x: .55, y: .95, sx: .00019, sy: .00014, p: 4 }
  ];

  function resize() {
    w = c.width = innerWidth;
    h = c.height = innerHeight;
    dots = [];
    for (let y = GAP / 2; y < h; y += GAP)
      for (let x = GAP / 2; x < w; x += GAP) dots.push(x, y);
  }

  function frame(now) {
    if (!running) return;
    t = now || 0;
    mouse.x += (mouse.tx - mouse.x) * .08;
    mouse.y += (mouse.ty - mouse.y) * .08;

    ctx.fillStyle = "#0a0d12";
    ctx.fillRect(0, 0, w, h);

    // Пятна
    const sh = Math.sin(scrollY * .0012) * .12; // пятна смещаются при прокрутке
    ctx.globalCompositeOperation = "lighter";
    for (const b of blobs) {
      const x = (b.x + Math.sin(t * b.sx + b.p) * .18) * w;
      const y = (b.y + Math.cos(t * b.sy + b.p) * .15 + sh) * h;
      const r = b.r * Math.max(w, h);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${b.c},.16)`);
      g.addColorStop(1, `rgba(${b.c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = "source-over";

    // Сетка точек (при 3D-сцене не рисуем, чтобы не было каши)
    if (document.documentElement.classList.contains("webgl")) { if (!reduce) requestAnimationFrame(frame); return; }
    const R = 160;
    for (let i = 0; i < dots.length; i += 2) {
      const x = dots[i], y = dots[i + 1];
      const d = Math.hypot(x - mouse.x, y - mouse.y);
      if (d < R) {
        const k = 1 - d / R;
        ctx.fillStyle = `rgba(79,216,255,${.15 + k * .75})`;
        const push = k * 6;
        ctx.beginPath();
        ctx.arc(x + (x - mouse.x) / (d || 1) * push, y + (y - mouse.y) / (d || 1) * push, 1 + k * 1.8, 0, 6.283);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,255,255,.07)";
        ctx.fillRect(x - .75, y - .75, 1.5, 1.5);
      }
    }
    if (!reduce) requestAnimationFrame(frame);
  }

  addEventListener("resize", resize);
  addEventListener("mousemove", e => { mouse.tx = e.clientX; mouse.ty = e.clientY; }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running && !reduce) requestAnimationFrame(frame);
  });
  resize();
  requestAnimationFrame(frame);
})();
