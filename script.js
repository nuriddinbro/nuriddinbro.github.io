// Русский текст берется прямо из index.html.
// Здесь только английский перевод: ключ = значение атрибута data-i18n.
const EN = {
  nav_about: "About",
  nav_exp: "Experience",
  nav_portfolio: "Portfolio",
  nav_contacts: "Contact",

  hero_loc: "Tashkent, Uzbekistan · open to remote work",
  hero_name: "Nuriddin Akhmedov",
  hero_role: "Customer Service Quality Assurance Specialist",
  h_l1: "Service",
  h_l2: "quality",
  h_l3: "under control",
  stat_langs: "languages",
  pf_soon: "soon",
  ct_h1: "Let's",
  ct_h2: "work",
  ct_h3: "together",
  to_top: "Back to top ↑",
  hero_lead: "Quality assurance, content moderation, Russian - Uzbek translation, data and spreadsheet work, technical support.",
  hero_contact: "Get in touch",
  hero_resume: "Download CV (PDF)",
  resume_soon: "A PDF version of my CV will be available here soon.",
  stat_years: "years in customer service",
  stat_companies: "companies",
  stat_lang: "translation and localization",

  about_title: "About",
  about_p1: "Quality assurance and operational efficiency specialist in customer service. Over 9 years of experience in support: I have grown from a call center operator to a call center manager, and I currently work in the Quality Assurance team at Yandex Eats.",
  about_p2: "I am looking for a remote position in quality assurance, content moderation, Russian - Uzbek translation, data and spreadsheet work, or technical support.",

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
  j1_d: "Reviewing and scoring agents' chats and calls with customers, partners (restaurants and stores) and couriers; evaluating against the quality scorecard and knowledge base; analyzing errors and providing feedback and recommendations; checking orders in the admin panel and CRM; translating response templates (macros) from Russian into Uzbek.",
  j2_when: "June 2023 - February 2024",
  j2_role: "Content Moderator",
  j2_d: "Reviewing content for compliance with platform policies, removing violating materials, translating support macros RU-UZ and UZ-RU.",
  j3_when: "February 2023 - April 2023",
  j3_role: "Call Center Team Lead",
  j3_d: "Built the team from scratch, trained new hires, introduced work standards and monitored compliance.",
  j4_when: "August 2022 - February 2023",
  j4_role: "Senior Operator",
  j4_d: "Supervised operators, resolved complex cases, monitored service quality.",
  j5_when: "April 2021 - August 2022",
  j5_role: "Technical Support Specialist",
  j5_d: "Advised customers and resolved technical and payment-related issues.",
  j6_when: "February 2017 - October 2020",
  j6_role: "Operator, 1st Category",
  j6_d: "Handled citizens' inquiries submitted via the portals of the President of the Republic of Uzbekistan, the Ministry of Communications and the State Communications Inspectorate.",

  pf_title: "Portfolio",
  pf_lead: "All examples are anonymized: no customer data and no internal company documents.",
  pf1_t: "Quality assurance",
  pf1_d: "A sample case review against the scorecard: identified errors, score and recommendations for the agent.",
  pf2_t: "RU - UZ translation",
  pf2_d: "A sample response template translated from Russian into Uzbek: source text and translation.",
  pf3_t: "Content moderation",
  pf3_d: "A sample moderation decision: what violates platform policies and why.",
  pf_slot: "Example coming soon",

  sk_title: "Skills",
  sk1_t: "Quality and service",
  sk1_1: "Chat and call audits",
  sk1_2: "Quality scorecards",
  sk1_3: "Feedback",
  sk1_4: "Service standards",
  sk1_5: "Training and onboarding",
  sk1_6: "Content moderation",
  sk2_t: "Data and tools",
  sk2_2: "Admin panels",
  sk2_5: "Reporting",
  sk3_t: "Technical skills",
  sk3_2: "Software and driver installation",
  sk3_5: "System administration (in progress)",

  lng_title: "Languages",
  l_uz: "Uzbek", l_uz_l: "native",
  l_ru: "Russian", l_ru_l: "fluent, C1",
  l_kz: "Kazakh", l_kz_l: "upper intermediate, B2",
  l_en: "English", l_en_l: "elementary, A2",
  edu_title: "Education",
  edu1_t: "Tashkent Professional College of Communications",
  edu1_d: "Telecommunications",
  edu2_t: "ilmuz course",
  edu2_d: "System administration",

  ct_title: "Contact",
  ct_lead: "Open to remote opportunities. Send me a message and I will reply within one business day.",
  ct_email: "Email",
  ct_tg: "Telegram"
};

const META = {
  ru: { title: document.title },
  en: { title: "Nuriddin Akhmedov - Quality Assurance Specialist" }
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
  document.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
}

document.querySelectorAll("[data-set-lang]").forEach(b => {
  b.addEventListener("click", () => setLang(b.dataset.setLang));
});

let start = new URLSearchParams(location.search).get("lang");
if (!start) { try { start = localStorage.getItem("lang"); } catch (e) {} }
if (start === "en") setLang("en");

// Кнопка резюме: если файла resume.pdf еще нет, кнопка неактивна.
const resumeBtn = document.getElementById("resumeBtn");
const resumeNote = document.getElementById("resumeNote");
function resumeMissing() {
  resumeBtn.classList.add("is-disabled");
  resumeBtn.setAttribute("aria-disabled", "true");
  resumeBtn.removeAttribute("href");
  resumeNote.hidden = false;
}
fetch("resume.pdf", { method: "HEAD" })
  .then(r => { if (!r.ok) resumeMissing(); })
  .catch(resumeMissing);
