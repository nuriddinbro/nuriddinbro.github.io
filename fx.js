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
    // Плавающая панель видна, как только начали прокручивать
    const dock = document.getElementById("dock");
    if (dock) {
      dock.classList.toggle("show", scrollY > 300);
      document.getElementById("dockRing").style.strokeDashoffset = 138.2 * (1 - p / 100);
    }
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
  // Плавное появление строк больших заголовков: разворот из глубины + фокус
  const LINE_FROM = { yPercent: 0, y: 26, opacity: 0, filter: "blur(8px)" };
  const LINE_TO = { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.8, ease: "power2.out", clearProps: "filter" };

  // Строки "загрузки" появляются по очереди, потом заставка гаснет
  const intro = gsap.timeline();
  intro
    .to(".boot p", { opacity: 1, duration: .05, stagger: .22 })
    .to("#bootBar", { width: "100%", duration: 1, ease: "power2.inOut" }, 0)
    .to(loader, { opacity: 0, duration: .5, ease: "power2.out" }, "+=.15")
    .add(() => { loader.remove(); if (lenis) lenis.start(); })
    .fromTo(".hero .line > span", LINE_FROM, { ...LINE_TO, stagger: .13 }, "-=.3")
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
      if (root.classList.contains("webgl")) return; // при 3D-сцене плоская голограмма скрыта
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
  // "Давайте работать вместе." - строки плавно проявляются слева направо, затем светится линия
  const cta = document.querySelector(".cta");
  const ctaBar = document.createElement("span"); ctaBar.className = "cta-bar"; cta.appendChild(ctaBar);
  gsap.timeline({ scrollTrigger: { trigger: cta, start: "top 80%" } })
    .fromTo(".cta .line > span",
      { opacity: 0, clipPath: "inset(0 100% 0 0)", x: -20, filter: "blur(6px)" },
      { opacity: 1, clipPath: "inset(0 0% 0 0)", x: 0, filter: "blur(0px)", duration: 1.6, ease: "power3.inOut", stagger: .35, clearProps: "filter,clipPath" })
    .fromTo(ctaBar, { width: 0, opacity: 0 }, { width: "min(260px, 50%)", opacity: 1, duration: 1.2, ease: "power2.out" }, "-=.6");

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
  const fill = document.getElementById("tlFill");
  const jobs = [...document.querySelectorAll(".job")];
  gsap.to("#tlFill", {
    height: "100%", ease: "none",
    // Когда линия доходит до ромбика - он загорается зеленым
    onUpdate: () => {
      const bottom = fill.parentElement.offsetTop + fill.offsetHeight;
      jobs.forEach(j => j.classList.toggle("lit", bottom >= j.offsetTop + 14));
    },
    scrollTrigger: { trigger: "#timeline", start: "top 70%", end: "bottom 60%", scrub: true }
  });

  // Полоски языков заполняются сегментами, проценты считаются
  gsap.to(".langs b", {
    scaleX: 1, duration: 1.4, ease: "power3.out", stagger: .15,
    scrollTrigger: { trigger: ".langs", start: "top 85%" }
  });
  document.querySelectorAll(".lcount").forEach((el, i) => {
    gsap.fromTo(el, { textContent: 0 }, {
      textContent: +el.dataset.to, duration: 1.4, delay: i * .15, ease: "power3.out", snap: { textContent: 1 },
      scrollTrigger: { trigger: ".langs", start: "top 85%" }
    });
  });
  // На телефоне приветствие показывается по нажатию
  document.querySelectorAll(".lng").forEach(li => li.addEventListener("click", () => li.classList.toggle("hi")));
  // Кольца языков заполняются до своего уровня
  document.querySelectorAll(".lng").forEach((li, i) => {
    const p = +getComputedStyle(li).getPropertyValue("--p");
    gsap.to(li.querySelector(".ring-fg"), {
      strokeDashoffset: 326.7 * (1 - p / 100), duration: 1.6, delay: i * .12, ease: "power3.out",
      scrollTrigger: { trigger: ".lng-grid", start: "top 85%" }
    });
  });

  // Бегущая строка слегка ускоряется от прокрутки
  gsap.to(".marquee", {
    xPercent: -4, ease: "none",
    scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: true }
  });

  // ===== Заголовок: мягкие "живые" анимации слов, редко и плавно =====
  let wordTls = [];
  function splitChars(el) {
    el.innerHTML = [...el.textContent].map(ch => ch === " " ? " " : '<span class="ch">' + ch + "</span>").join("");
    return el.querySelectorAll(".ch");
  }
  function headWords() {
    wordTls.forEach(t => t.kill()); wordTls = [];
    const w1 = document.querySelector('.headline [data-i18n="h_l1"]');
    const w2 = document.querySelector('.headline [data-i18n="h_l2"]');
    const w3 = document.querySelector('.headline [data-i18n="h_l3a"]');
    // "Добро": по буквам пробегает голубой свет
    const c1 = splitChars(w1);
    wordTls.push(gsap.timeline({ repeat: -1, repeatDelay: 7, delay: 1 })
      .to(c1, { color: "#4fd8ff", textShadow: "0 0 18px rgba(79,216,255,.7)", duration: .5, ease: "sine.inOut", stagger: .09, yoyo: true, repeat: 1 }));
    // "пожаловать": буквы мягко поднимаются волной
    const c2 = splitChars(w2);
    wordTls.push(gsap.timeline({ repeat: -1, repeatDelay: 6, delay: 2.5 })
      .to(c2, { yPercent: -14, duration: .5, ease: "sine.inOut", stagger: .06, yoyo: true, repeat: 1 }));
    // "в мое": спокойное "дыхание" букв
    const c3 = splitChars(w3);
    wordTls.push(gsap.timeline({ repeat: -1, repeatDelay: 8, delay: 4 })
      .to(c3, { opacity: .35, duration: .6, ease: "sine.inOut", stagger: .12, yoyo: true, repeat: 1 }));
  }
  intro.add(headWords);
  document.addEventListener("langchange", () => { if (!document.getElementById("loader")) headWords(); });

  // ===== Сцены-главы: кинополосы, номер, заголовок проявляется, потом все уходит =====
  document.querySelectorAll(".chapter").forEach(ch => {
    const stage = ch.querySelector(".chapter-stage");
    const lb = { v: 0 };
    const setLb = () => stage.style.setProperty("--lb", lb.v);
    gsap.timeline({
      scrollTrigger: {
        trigger: ch, start: "top 70%", end: "bottom bottom", scrub: 1,
        onEnter: () => document.dispatchEvent(new CustomEvent("chapter")),
        onEnterBack: () => document.dispatchEvent(new CustomEvent("chapter"))
      }
    })
      .to(lb, { v: 1, duration: .15, onUpdate: setLb }, 0)
      .fromTo(ch.querySelector(".ch-num"), { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: .1 }, .12)
      .fromTo(ch.querySelector(".ch-line"), { scaleX: 0 }, { scaleX: 1, duration: .12 }, .14)
      .fromTo(ch.querySelector(".ch-title"),
        { opacity: 0, y: 70, filter: "blur(16px)", letterSpacing: "0.14em" },
        { opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "-0.02em", duration: .22, ease: "power2.out" }, .16)
      .fromTo(ch.querySelector(".ch-sub"), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .12 }, .3)
      .to([ch.querySelector(".ch-num"), ch.querySelector(".ch-title"), ch.querySelector(".ch-sub")],
        { opacity: 0, y: -50, filter: "blur(10px)", duration: .15, stagger: .03 }, .78)
      .to(lb, { v: 0, duration: .12, onUpdate: setLb }, .88);
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

  addEventListener("load", () => {
    ScrollTrigger.refresh();
  });
})();
