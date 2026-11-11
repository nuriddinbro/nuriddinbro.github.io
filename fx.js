// Анимации сайта: заставка, плавная прокрутка (Lenis), появление блоков (GSAP + ScrollTrigger).
(function () {
  const root = document.documentElement;
  const loader = document.getElementById("loader");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progressEl = document.getElementById("progress");

  // Процент прокрутки в меню
  function updateProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = Math.round(max > 0 ? (scrollY / max) * 100 : 0);
    progressEl.textContent = p + "%";
    document.querySelector(".topbar").style.setProperty("--p", p + "%");
  }
  addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  // Текст "О себе" разбиваем на слова, чтобы они загорались при прокрутке
  const bigText = document.getElementById("bigText");
  function splitWords() {
    const words = bigText.textContent.trim().split(/\s+/);
    bigText.innerHTML = words.map(w => '<span class="w">' + w.replace(/</g, "&lt;") + "</span>").join(" ");
  }

  // Если библиотеки не загрузились или пользователь отключил анимации - просто показываем сайт
  if (reduce || !window.gsap || !window.ScrollTrigger) {
    if (loader) loader.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("anim");
  splitWords();

  // Плавная прокрутка
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  // Ссылки на разделы - плавно
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      const target = id === "#top" ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -80 });
      else if (target === 0) window.scrollTo({ top: 0, behavior: "smooth" });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });

  // ===== Заставка =====
  // Строки "загрузки" появляются по очереди, потом заставка гаснет
  const intro = gsap.timeline();
  intro
    .to(".boot p", { opacity: 1, duration: .05, stagger: .22 })
    .to("#bootBar", { width: "100%", duration: 1, ease: "power2.inOut" }, 0)
    .to(loader, { opacity: 0, duration: .5, ease: "power2.out" }, "+=.15")
    .add(() => { loader.remove(); if (lenis) lenis.start(); })
    .to(".hero .line > span", { y: 0, duration: 1.1, ease: "power4.out", stagger: .1 }, "-=.3")
    .to(".hero .reveal", { opacity: 1, y: 0, duration: .9, ease: "power3.out", stagger: .1 }, "-=.8")
    // Голограмма "включается"
    .from(".holo", { scaleY: .02, opacity: 0, duration: .9, ease: "expo.out" }, "-=1");

  // Голограмма уходит вверх при прокрутке и слегка поворачивается за мышкой
  gsap.to(".holo-img", { yPercent: -12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  if (matchMedia("(pointer: fine)").matches) {
    const holo = document.querySelector(".holo-img");
    gsap.set(holo, { transformPerspective: 800 });
    const ry = gsap.quickTo(holo, "rotateY", { duration: 1, ease: "power3" });
    const rx = gsap.quickTo(holo, "rotateX", { duration: 1, ease: "power3" });
    addEventListener("mousemove", e => {
      ry((e.clientX / innerWidth - .5) * 16);
      rx(-(e.clientY / innerHeight - .5) * 10);
    });
  }

  // ===== Появление блоков при прокрутке =====
  gsap.utils.toArray(".reveal").forEach(el => {
    if (el.closest(".hero")) return;
    gsap.to(el, {
      opacity: 1, y: 0, duration: .9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" }
    });
  });

  // Заголовок "Давайте работать вместе"
  gsap.to(".cta .line > span", {
    y: 0, duration: 1.1, ease: "power4.out", stagger: .12,
    scrollTrigger: { trigger: ".cta", start: "top 85%" }
  });

  // Слова "О себе" загораются по мере прокрутки
  let wordsTween;
  function animateWords() {
    if (wordsTween) { wordsTween.scrollTrigger && wordsTween.scrollTrigger.kill(); wordsTween.kill(); }
    wordsTween = gsap.to(bigText.querySelectorAll(".w"), {
      opacity: 1, stagger: .1, ease: "none",
      scrollTrigger: { trigger: bigText, start: "top 80%", end: "bottom 45%", scrub: true }
    });
  }
  animateWords();
  document.addEventListener("langchange", () => {
    splitWords(); animateWords(); ScrollTrigger.refresh();
  });

  // Счетчики цифр
  document.querySelectorAll(".count").forEach(el => {
    const to = +el.dataset.to, o = { v: 0 };
    gsap.to(o, {
      v: to, duration: 1.6, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => { el.textContent = Math.round(o.v); }
    });
  });

  // Линия таймлайна рисуется при прокрутке
  gsap.to("#tlFill", {
    height: "100%", ease: "none",
    scrollTrigger: { trigger: "#timeline", start: "top 70%", end: "bottom 60%", scrub: true }
  });

  // Полоски языков
  gsap.to(".langs b", {
    scaleX: 1, duration: 1.2, ease: "power3.out", stagger: .12,
    scrollTrigger: { trigger: ".langs", start: "top 85%" }
  });

  // Бегущая строка слегка ускоряется от прокрутки
  gsap.to(".marquee", {
    xPercent: -4, ease: "none",
    scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: true }
  });

  // ===== Портфолио: анимация содержимого при раскрытии =====
  // Каждый пример - своя анимация (timeline). Навели - играет, убрали - быстро откатывается.
  function buildQA(card) {
    const rows = card.querySelectorAll(".sc li");
    const bad = card.querySelector(".sc-bad");
    const flash = document.createElement("i"); flash.className = "sc-flash"; bad.appendChild(flash);
    const was = card.querySelector(".was"), now = card.querySelector(".now"), type = card.querySelector(".type");
    const strike = document.createElement("i"); strike.className = "strike"; was.appendChild(strike);
    const count = card.querySelector(".hcount"), bar = card.querySelector(".score-bar i");
    const typer = { n: 0 }; let full = "";
    const tl = gsap.timeline({ paused: true });
    tl.from(card.querySelector(".demo-head"), { opacity: 0, x: -14, duration: .3 }, .25)
      .from(rows, { opacity: 0, x: -20, duration: .3, stagger: .12 }, .35)
      .from(card.querySelectorAll(".sc b"), { scale: 0, duration: .35, ease: "back.out(3)", stagger: .12 }, .5)
      .to(flash, { opacity: 1, duration: .12, repeat: 3, yoyo: true }, 1.15)
      .fromTo(bad, { x: 0 }, { x: 5, duration: .05, repeat: 5, yoyo: true }, 1.15)
      .from(was, { opacity: 0, y: 12, duration: .35 }, 1.45)
      .to(strike, { scaleX: 1, duration: .4, ease: "power2.inOut" }, 1.85)
      .to(was, { opacity: .55, duration: .3 }, 2.2)
      .add(() => { if (tl.reversed()) return; full = type.textContent; type.textContent = ""; type.classList.add("typing"); }, 2.1)
      .from(now, { opacity: 0, y: 12, duration: .35 }, 2.15)
      .to(typer, { n: 1, duration: 2.2, ease: "none", onUpdate: () => { if (full) type.textContent = full.slice(0, Math.round(full.length * typer.n)); } }, 2.3)
      .add(() => type.classList.remove("typing"), 4.5)
      .from(card.querySelector(".score"), { opacity: 0, y: 10, duration: .3 }, 4.4)
      .fromTo(bar, { width: 0 }, { width: "80%", duration: .9, ease: "power3.out" }, 4.5)
      .fromTo(count, { textContent: 0 }, { textContent: 80, duration: .9, snap: { textContent: 1 }, ease: "power3.out" }, 4.5);
    tl.eventCallback("onReverseComplete", () => { if (full) type.textContent = full; type.classList.remove("typing"); });
    return tl;
  }
  function buildMod(card) {
    const rows = [...card.querySelectorAll(".mod li")];
    const cnt = card.querySelector(".mcount"); const c = { v: 0 };
    const tl = gsap.timeline({ paused: true });
    tl.from(card.querySelector(".demo-head"), { opacity: 0, x: -14, duration: .3 }, .25);
    rows.forEach((li, i) => {
      const beam = document.createElement("i"); beam.className = "scan-beam"; li.appendChild(beam);
      const t = .45 + i * .55;
      tl.from(li, { opacity: 0, y: 14, duration: .3 }, t)
        .fromTo(beam, { xPercent: -100, opacity: 1 }, { xPercent: 260, duration: .45, ease: "power1.inOut" }, t + .1)
        .set(beam, { opacity: 0 }, t + .55)
        .from(li.querySelector("small"), { opacity: 0, duration: .25 }, t + .35)
        .from(li.querySelector(".st"), { scale: 2.4, rotate: -14, opacity: 0, duration: .35, ease: "back.out(2.5)" }, t + .4)
        .to(c, { v: i + 1, duration: .01, onUpdate: () => { cnt.textContent = Math.round(c.v); } }, t + .4);
    });
    return tl;
  }
  function buildSteps(card) {
    const ol = card.querySelector(".steps");
    const line = document.createElement("span"); line.className = "steps-line"; ol.prepend(line);
    const items = [...ol.querySelectorAll("li")];
    const tl = gsap.timeline({ paused: true });
    tl.add(() => {}, 0);
    items.forEach((li, i) => {
      const t = .35 + i * .45;
      tl.from(li.querySelector("b"), { opacity: 0, x: -16, duration: .3 }, t)
        .from(li.querySelector("span"), { opacity: 0, x: -16, duration: .3 }, t + .1)
        .add(() => li.classList.add("lit"), t)
        .add(() => li.classList.remove("lit"), t - .001);
    });
    const lastTop = () => items[items.length - 1].offsetTop;
    tl.fromTo(line, { height: 0 }, { height: () => lastTop(), duration: .45 * (items.length - 1), ease: "none" }, .35);
    tl.eventCallback("onReverseComplete", () => items.forEach(li => li.classList.remove("lit")));
    return tl;
  }
  document.querySelectorAll(".pf").forEach(card => {
    const tl = card.querySelector(".sc") ? buildQA(card) : card.querySelector(".mod") ? buildMod(card) : buildSteps(card);
    const play = () => tl.timeScale(1).play(0);
    const back = () => tl.timeScale(3).reverse();
    card.addEventListener("mouseenter", () => { if (matchMedia("(hover: hover)").matches) play(); });
    card.addEventListener("mouseleave", () => { if (matchMedia("(hover: hover)").matches) back(); });
    card.addEventListener("click", () => {
      if (matchMedia("(hover: hover)").matches) return;
      card.classList.toggle("open");
      card.classList.contains("open") ? play() : back();
    });
  });

  // ===== Заголовок: глитч-слои и 3D-наклон =====
  const head = document.querySelector(".headline");
  function makeGlitch() {
    head.querySelectorAll(".glitch-layer").forEach(l => l.remove());
    const base = head.innerHTML;
    ["glitch-a", "glitch-b"].forEach(cls => {
      const l = document.createElement("span");
      l.className = "glitch-layer " + cls;
      l.setAttribute("aria-hidden", "true");
      l.innerHTML = base;
      l.querySelectorAll("[data-i18n]").forEach(n => n.removeAttribute("data-i18n"));
      head.appendChild(l);
    });
  }
  intro.add(makeGlitch);
  document.addEventListener("langchange", () => { if (!document.getElementById("loader")) makeGlitch(); });
  setInterval(() => { head.classList.add("is-glitch"); setTimeout(() => head.classList.remove("is-glitch"), 260); }, 3800);
  if (matchMedia("(pointer: fine)").matches) {
    gsap.set(head, { transformPerspective: 900, transformOrigin: "left center" });
    const hy = gsap.quickTo(head, "rotateY", { duration: 1.2, ease: "power3" });
    const hx = gsap.quickTo(head, "rotateX", { duration: 1.2, ease: "power3" });
    addEventListener("mousemove", e => {
      hy((e.clientX / innerWidth - .5) * 14);
      hx(-(e.clientY / innerHeight - .5) * 10);
    });
  }

  // ===== Терминал навыков: строки печатаются по очереди =====
  const syncGl = () => document.querySelectorAll(".gl").forEach(g => g.dataset.text = g.textContent);
  syncGl();
  document.addEventListener("langchange", syncGl);
  // Вопрос работодателя печатается, затем терминал отвечает: группы навыков вылетают по очереди
  const term = document.querySelector(".term-full");
  if (term) {
    const ps = [...term.querySelectorAll(":scope > p")];
    const tq = term.querySelector(".tq");
    const typ = { n: 0 }; let qFull = "";
    const tl = gsap.timeline({ scrollTrigger: { trigger: term, start: "top 75%" } });
    tl.set(ps[0], { opacity: 1 })
      .add(() => { qFull = tq.textContent; tq.textContent = ""; })
      .to(typ, { n: 1, duration: 1.2, ease: "none", onUpdate: () => { if (qFull) tq.textContent = qFull.slice(0, Math.round(qFull.length * typ.n)); } })
      .set(ps[1], { opacity: 1 }, "+=.35");
    term.querySelectorAll(".t-group").forEach(g => {
      tl.to(g.querySelector(".t-label"), { opacity: 1, duration: .1 }, "+=.25")
        .fromTo(g.querySelectorAll("li"), { opacity: 0, y: 10, scale: .8 }, { opacity: 1, y: 0, scale: 1, duration: .3, ease: "back.out(2)", stagger: .06 });
    });
    ps.slice(2).forEach(p => tl.set(p, { opacity: 1 }, "+=.45"));
  }

  // ===== Эффекты для мышки =====
  if (matchMedia("(pointer: fine)").matches) {
    // Свой курсор
    const cur = document.querySelector(".cursor");
    const dot = cur.querySelector(".cursor-dot"), ring = cur.querySelector(".cursor-ring");
    const dx = gsap.quickTo(dot, "x", { duration: .1 }), dy = gsap.quickTo(dot, "y", { duration: .1 });
    const rx = gsap.quickTo(ring, "x", { duration: .45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: .45, ease: "power3" });
    addEventListener("mousemove", e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.querySelectorAll("a, button, .card, .pf, .tags li").forEach(el => {
      el.addEventListener("mouseenter", () => cur.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cur.classList.remove("is-hover"));
    });

    // Подсветка карточек за мышкой
    document.querySelectorAll(".card, .pf, .stat, .skill-groups > div, .contact").forEach(el => {
      el.classList.add("spot");
      el.addEventListener("mousemove", e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", e.clientX - r.left + "px");
        el.style.setProperty("--my", e.clientY - r.top + "px");
      });
    });

    // Кнопки притягиваются к мышке
    document.querySelectorAll(".btn, .pill-logo").forEach(el => {
      const mx = gsap.quickTo(el, "x", { duration: .5, ease: "power3" }), my = gsap.quickTo(el, "y", { duration: .5, ease: "power3" });
      el.addEventListener("mousemove", e => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * .3); my((e.clientY - r.top - r.height / 2) * .4);
      });
      el.addEventListener("mouseleave", () => { mx(0); my(0); });
    });

    // Карточки портфолио наклоняются в 3D
    document.querySelectorAll(".pf").forEach(el => {
      gsap.set(el, { transformPerspective: 900 });
      el.addEventListener("mousemove", e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        gsap.to(el, { rotateY: px * 12, rotateX: -py * 12, y: -6, duration: .5, ease: "power2.out" });
      });
      el.addEventListener("mouseleave", () => gsap.to(el, { rotateY: 0, rotateX: 0, y: 0, duration: .7, ease: "elastic.out(1, .5)" }));
    });
  }

  addEventListener("load", () => ScrollTrigger.refresh());
})();
