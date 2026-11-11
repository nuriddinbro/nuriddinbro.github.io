// Русский текст берется прямо из index.html.
// Здесь только английский перевод: ключ = значение атрибута data-i18n.
const EN = {
  nav_about: "About",
  nav_exp: "Experience",
  nav_portfolio: "Portfolio",
  nav_contacts: "Contact",

  hero_loc: "Tashkent, Uzbekistan · remote and freelance",
  hero_name: "Nuriddin Akhmedov",
  hero_role: "Customer Service Specialist",
  h_l1: "Assalamu",
  h_l2: "Alaikum,",
  h_l3a: "I'm",
  h_l3: "Nuriddin",
  hero_lead: "I help companies build service that customers value: from the first inquiry to standards, team training and quality control.",
  hero_contact: "Get in touch",
  cv: "Download CV · PDF",
  stat_years: "years in customer service",
  stat_companies: "companies",
  stat_lang: "translation and localization",
  stat_langs: "languages",

  about_title: "About",
  about_p1: "Over 9 years in customer service across telecom, fintech, e-commerce and delivery companies. I have grown from operator to call center manager: resolving complex cases, launching a team from scratch, implementing service standards, moderating content and localizing customer communications. Today I am responsible for service quality at Yandex Eats.",
  about_p2: "Open to interesting opportunities: remote work and freelance.",

  exp_title: "Core expertise",
  ex1_t: "Quality audits",
  ex1_d: "Auditing customer communications against the scorecard, service standards and knowledge base; identifying recurring errors and areas for improvement.",
  ex2_t: "Feedback",
  ex2_d: "Delivering feedback and recommendations that raise the quality of the team's work.",
  ex3_t: "Standards and training",
  ex3_d: "Developing and implementing service standards; onboarding and training new staff.",
  ex4_t: "Content moderation",
  ex4_d: "Moderating content and enforcing platform policies.",
  ex5_t: "RU - UZ localization",
  ex5_d: "Translating texts between Russian and Uzbek: response templates and customer communications.",
  ex6_t: "Data handling",
  ex6_d: "CRM systems, admin panels, Google Sheets, Excel, reporting.",

  job_title: "Work experience",
  j1_when: "February 2024 - present",
  j1_role: "Quality Assurance Specialist",
  j1_d: "Auditing chats and calls with customers, partners and couriers against the quality scorecard and knowledge base. Error analysis, feedback and recommendations for agents. Order checks in the admin panel and CRM; localization of response templates into Uzbek.",
  j2_when: "June 2023 - February 2024",
  j2_role: "Content Moderator",
  j2_d: "Moderating user-generated content for compliance with platform policies and promptly removing violations. Localizing support macros RU-UZ and UZ-RU.",
  j3_when: "February 2023 - April 2023",
  j3_role: "Call Center Team Lead",
  j3_d: "Launched a call center from scratch: hiring and training the team, developing service standards and monitoring compliance.",
  j4_when: "August 2022 - February 2023",
  j4_role: "Senior Operator",
  j4_d: "Coordinating operators, resolving complex and escalated cases, monitoring service quality.",
  j5_when: "April 2021 - August 2022",
  j5_role: "Technical Support Specialist",
  j5_d: "Supporting payment system customers: resolving technical and payment-related issues.",
  j6_when: "February 2017 - October 2020",
  j6_role: "Operator, 1st Category",
  j6_d: "Handling citizens' inquiries submitted via the portals of the President of the Republic of Uzbekistan, the Ministry of Communications and the State Communications Inspectorate.",

  pf_title: "Portfolio",
  pf_lead: "Demo cases built on fictional data: they show my approach without any information about real customers or companies.",
  pf_demo: "demo",
  pf_hint: "View example",
  pf_process: "process",
  pf1_t: "Quality assurance",
  pf1_d: "A chat review against the scorecard: what went well, where the error is and how to fix it.",
  q_head: "Chat #QA-0417 · 40 min delay",
  q1: "Greeting and introduction",
  q2: "Identifying the issue",
  q3: "Knowledge base solution",
  q4: "Tone and empathy",
  q5: "Proper closing",
  q_total: "Total",
  q4n: "no empathy shown",
  was: "Before",
  was_t: "Your order is delayed. Please wait.",
  now: "Better",
  now_t: "I understand how frustrating waiting is. The courier will arrive in 10 minutes, and I have added a promo code to your account for the delay.",
  m_checked: "checked",
  q_rec: "Recommendation: for delays over 30 minutes, offer compensation per the knowledge base article right away, without waiting for the customer to ask.",
  pf3_t: "Content moderation",
  pf3_d: "Decisions from a moderation queue: each one is based on a specific platform rule.",
  m_head: "Moderation queue",
  m1: "Listing with the seller's phone number",
  m1r: "off-platform contacts are not allowed",
  m2: "Review with insults",
  m2r: "violates communication rules",
  m3: "Photo does not match the product",
  m3r: "misleads the buyer",
  m4: "Product card filled in correctly",
  m4r: "no violations",
  m_rej: "Rejected",
  m_del: "Removed",
  m_fix: "Needs changes",
  m_ok: "Approved",
  pf2_t: "How I work",
  pf2_d: "Five steps I follow to take service quality from review to results.",
  s1: "Sampling", s1d: "I select cases across channels, shifts and topics.",
  s2: "Evaluation", s2d: "I review them against the scorecard, standards and knowledge base.",
  s3: "Analysis", s3d: "I look for recurring errors, not one-off slips.",
  s4: "Feedback", s4d: "I explain the error and show how to do it right.",
  s5: "Follow-up", s5d: "I check that the improvement sticks.",

  sk_title: "Skills",
  sk1_t: "quality & service",
  sk1_1: "Chat and call audits",
  sk1_2: "Quality scorecards",
  sk1_3: "Feedback",
  sk1_4: "Service standards",
  sk1_5: "Training and onboarding",
  sk1_6: "Content moderation",
  sk2_t: "data & tools",
  sk2_2: "Admin panels",
  sk2_5: "Reporting",
  sk3_t: "tech",
  sk3_1: "Workstation setup",
  sk3_2: "Software and driver installation",
  sk3_3: "Remote support",
  t0: "What skills do you have?",
  sk1_7: "RU-UZ translation",
  t1: "skills for high-quality task delivery: available",
  t2: "required skill not found?",
  t3: "updating memory and learning...",
  t4: "skill installed. Ready for the task.",
  edu_q: "My diploma gave me the foundation, but my real school is the front line: every inquiry is a mini exam, and I have been passing them every day for 9+ years.",
  edu_q2: "Vocational degree + practice = top league of service",
  sk3_5: "System administration (in progress)",

  lng_title: "Languages",
  l_uz: "Uzbek", l_uz_l: "native",
  l_ru: "Russian", l_ru_l: "fluent, C1",
  l_kz: "Kazakh", l_kz_l: "upper intermediate, B2",
  l_en: "English", l_en_l: "elementary, A2",
  edu_title: "Education",
  edu1_t: "Tashkent Professional College of Communications",
  edu1_d: "Vocational degree · Telecommunications",
  edu2_t: "ilmuz course",
  edu2_d: "System administration",

  ct_title: "Contact",
  ct_h1: "Let's",
  ct_h2: "work",
  ct_h3: "together",
  ct_lead: "Open to interesting opportunities. Send me a message and I will reply within a day.",
  ct_email: "Email",
  ct_email_go: "Send an email",
  ct_tg_go: "Open chat in Telegram",
  ct_wa_go: "Open chat in WhatsApp",
  ct_tg: "Telegram",
  to_top: "Back to top ↑",
  dock_top: "Back to top",
  dock_ct: "Contact"
};

const META = {
  ru: { title: document.title },
  en: { title: "Nuriddin Akhmedov - Customer Service, QA, Moderation, Translation" }
};

const nodes = document.querySelectorAll("[data-i18n]");
const RU = {};
nodes.forEach(n => { RU[n.dataset.i18n] = n.textContent; });

function setLang(lang) {
  const dict = lang === "en" ? EN : RU;
  nodes.forEach(n => {
    const v = dict[n.dataset.i18n];
    if (v) n.textContent = v;
  });
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  document.title = META[lang].title;
  document.querySelectorAll("[data-set-lang]").forEach(b => {
    b.setAttribute("aria-pressed", String(b.dataset.setLang === lang));
  });
  try { localStorage.setItem("lang", lang); } catch (e) {}
  const cvBtn = document.getElementById("resumeBtn");
  if (cvBtn) cvBtn.setAttribute("href", lang === "en" ? "resume-en.pdf" : "resume-ru.pdf");
  document.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
}

document.querySelectorAll("[data-set-lang]").forEach(b => {
  b.addEventListener("click", () => setLang(b.dataset.setLang));
});

let start = new URLSearchParams(location.search).get("lang");
if (!start) { try { start = localStorage.getItem("lang"); } catch (e) {} }
if (start === "en") setLang("en");

// Кнопка резюме сама меняет файл по языку сайта (см. setLang): resume-ru.pdf / resume-en.pdf
