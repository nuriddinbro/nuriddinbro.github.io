// Интерфейс версии 2: появление панелей, вкладки, раскрытие опыта, счетчик раздела.
(function () {
  // Панели появляются, когда видны на экране
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("in"); });
  }, { threshold: .25 });
  document.querySelectorAll(".panel, .intro").forEach(el => io.observe(el));

  // Вкладки в портфолио
  document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => {
    const box = b.closest(".panel");
    box.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
    box.querySelectorAll(".tab").forEach(p => p.classList.toggle("on", p.dataset.pane === b.dataset.tab));
  }));

  // Опыт: по клику раскрывается описание
  document.querySelectorAll(".job").forEach(b => b.addEventListener("click", () => b.parentElement.classList.toggle("open")));

  // Счетчик раздела, полоса прогресса и подсветка пункта меню
  const scenes = [...document.querySelectorAll(".scene")];
  const num = document.getElementById("secNum"), rail = document.getElementById("rail");
  const links = [...document.querySelectorAll(".nav a")];
  function upd() {
    const mid = scrollY + innerHeight / 2;
    let i = 0;
    scenes.forEach((s, k) => { if (s.offsetTop <= mid) i = k; });
    num.textContent = String(i + 1).padStart(2, "0");
    const max = document.documentElement.scrollHeight - innerHeight;
    rail.style.width = (max > 0 ? scrollY / max * 100 : 0) + "%";
    links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + scenes[i].id));
  }
  addEventListener("scroll", upd, { passive: true });
  upd();

  // режим проверки: ?at=N - сразу к экрану N, без заставки
  const at = new URLSearchParams(location.search).get("at");
  if (at !== null) { document.getElementById("veil").remove(); document.querySelectorAll(".panel, .intro").forEach(el => el.classList.add("in"));
    scenes.forEach((s, k) => { if (k < +at) s.style.display = "none"; }); return; }

  // Заставка: счетчик 0-100, потом дымка рассеивается
  const veil = document.getElementById("veil"), vn = document.getElementById("veilNum");
  let n = 0;
  const tick = setInterval(() => {
    n = Math.min(100, n + 4 + Math.random() * 7);
    vn.textContent = String(Math.round(n)).padStart(3, "0");
    if (n >= 100) { clearInterval(tick); setTimeout(() => veil.classList.add("gone"), 200); }
  }, 45);
})();
