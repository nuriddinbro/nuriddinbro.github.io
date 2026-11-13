// Интерфейс версии 2: появление панелей, вкладки, раскрытие опыта, счетчик раздела.
(function () {
  // Панели появляются, когда видны на экране
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("in"); });
  }, { threshold: .25 });
  document.querySelectorAll(".panel, .intro").forEach(el => io.observe(el));

  // Заголовок: буквы "намерзают" по одной (слова не разрываются при переносе)
  function splitTitle() {
    let i = 0;
    document.querySelectorAll(".title [data-i18n]:not(em)").forEach(el => {
      const words = el.textContent.split(" ");
      el.innerHTML = words.map(w => '<span class="w">' + [...w].map(ch => '<span class="c" style="--i:' + (i++) + '">' + ch + "</span>").join("") + "</span>").join(" ");
    });
    const em = document.querySelector(".title em");
    if (em) em.style.setProperty("--i", i);
    const t = document.querySelector(".title");
    t.classList.remove("play"); void t.offsetWidth;
    const veil = document.getElementById("veil");
    if (!veil || veil.classList.contains("gone")) t.classList.add("play"); // иначе - после заставки
  }
  splitTitle();
  document.addEventListener("langchange", splitTitle);

  // Вкладки в портфолио
  document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => {
    const box = b.closest(".panel");
    box.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
    box.querySelectorAll(".tab").forEach(p => p.classList.toggle("on", p.dataset.pane === b.dataset.tab));
  }));

  // Кнопки Наверх / Вниз: сразу в самый верх или в самый низ страницы
  document.querySelectorAll("[data-jump]").forEach(b => b.addEventListener("click", () => {
    scrollTo({ top: b.dataset.jump === "top" ? 0 : document.documentElement.scrollHeight, behavior: "smooth" });
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
    if (num.textContent !== String(i + 1).padStart(2, "0") && upd.ready) document.dispatchEvent(new CustomEvent("section", { detail: i }));
    upd.ready = true;
    num.textContent = String(i + 1).padStart(2, "0");
    const max = document.documentElement.scrollHeight - innerHeight;
    rail.style.width = (max > 0 ? scrollY / max * 100 : 0) + "%";
    // в самом верху прячем "Наверх", в самом низу - "Вниз"
    document.querySelectorAll("[data-jump]").forEach(b => b.classList.toggle("off", b.dataset.jump === "top" ? scrollY < 60 : scrollY > max - 60));
    links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + scenes[i].id));
  }
  addEventListener("scroll", upd, { passive: true });
  upd();

  // режим проверки: ?at=N - сразу к экрану N, без заставки
  const at = new URLSearchParams(location.search).get("at");
  if (at !== null) { document.getElementById("veil").remove(); document.querySelector(".title").classList.add("play"); document.querySelectorAll(".panel, .intro").forEach(el => el.classList.add("in"));
    scenes.forEach((s, k) => { if (k < +at) s.style.display = "none"; }); return; }

  // Заставка: счетчик 0-100, потом дымка рассеивается
  const veil = document.getElementById("veil"), vn = document.getElementById("veilNum");
  let n = 0;
  const tick = setInterval(() => {
    n = Math.min(100, n + 4 + Math.random() * 7);
    vn.textContent = String(Math.round(n)).padStart(3, "0");
    if (n >= 100) { clearInterval(tick); setTimeout(() => { veil.classList.add("gone"); document.querySelector(".title").classList.add("play"); }, 200); }
  }, 45);
})();
