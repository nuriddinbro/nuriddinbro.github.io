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
