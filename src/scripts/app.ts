type LanguageKey = "en" | "es" | "eu" | "fr" | "de" | "pt-BR";

type DayContent = {
  quote: string;
  prompt: string;
  author?: string;
  tags?: string[];
};

type DayEntry = {
  languages: Partial<Record<LanguageKey, DayContent>>;
};

type QuoteData = Record<string, DayEntry>;

const DATA_URL = `/data/${new Date().getFullYear()}.json`;
const SUPPORTED_LANGS: LanguageKey[] = ["en", "es", "eu", "fr", "de", "pt-BR"];
const STORAGE_THEME_KEY = "sportspark_theme";
const STORAGE_LANG_KEY = "sportspark_lang";

const dateEl = document.querySelector<HTMLElement>("[data-date]");
const timeEl = document.querySelector<HTMLElement>("[data-time]");
const quoteEl = document.querySelector<HTMLElement>("[data-quote]");
const authorEl = document.querySelector<HTMLElement>("[data-author]");
const promptEl = document.querySelector<HTMLElement>("[data-prompt]");
const langNoteEl = document.querySelector<HTMLElement>("[data-lang-note]");
const prevBtn = document.querySelector<HTMLButtonElement>("[data-prev]");
const nextBtn = document.querySelector<HTMLButtonElement>("[data-next]");
const todayBtn = document.querySelector<HTMLButtonElement>("[data-today]");
const dayIndicatorEl = document.querySelector<HTMLElement>("[data-day-indicator]");
const mainEl = document.querySelector<HTMLElement>("[data-main]");
const errorSummaryEl = document.querySelector<HTMLElement>("[data-error-summary]");
const retryBtn = document.querySelector<HTMLButtonElement>("[data-retry]");
const themeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-theme]"));
const langButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-lang]"));
let liveRegionEl: HTMLElement | null = null;

let dataCache: QuoteData = {};
let activeDate = normalizeDate(new Date());
let activeLang: LanguageKey = getInitialLanguage();

const today = normalizeDate(new Date());

function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clampDate(date: Date): Date {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  if (date < start) return start;
  if (date > today) return today;
  return date;
}

function updateTime() {
  if (!timeEl) return;
  const formatter = new Intl.DateTimeFormat(navigator.language, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  timeEl.textContent = formatter.format(new Date());
}

function formatDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat(navigator.language, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
  return formatter.format(date);
}

function setLang(lang: LanguageKey) {
  activeLang = lang;
  localStorage.setItem(STORAGE_LANG_KEY, lang);
  document.documentElement.lang = lang;
  updateLangButtons();
  renderContent();
}

function getInitialLanguage(): LanguageKey {
  const stored = localStorage.getItem(STORAGE_LANG_KEY);
  if (stored && SUPPORTED_LANGS.includes(stored as LanguageKey)) {
    return stored as LanguageKey;
  }
  return normalizeLanguage(navigator.language || "en");
}

function normalizeLanguage(lang: string): LanguageKey {
  const lower = lang.toLowerCase();
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("eu")) return "eu";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("de")) return "de";
  return "en";
}

function setTheme(theme: string, shouldAnnounce = true) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  localStorage.setItem(STORAGE_THEME_KEY, theme);
  updateThemeButtons(theme);
  if (shouldAnnounce) {
    announce(`Theme changed to ${theme}.`);
  }
}

function updateThemeButtons(theme: string) {
  themeButtons.forEach((button) => {
    const isActive = button.dataset.theme === theme;
    button.setAttribute("aria-pressed", String(isActive));
    toggleButtonStyles(button, isActive);
  });
}

function updateLangButtons() {
  langButtons.forEach((button) => {
    const isActive = button.dataset.lang === activeLang;
    button.setAttribute("aria-pressed", String(isActive));
    toggleButtonStyles(button, isActive);
  });
}

function toggleButtonStyles(button: HTMLButtonElement, isActive: boolean) {
  button.classList.toggle("bg-ink", isActive);
  button.classList.toggle("text-surface", isActive);
  button.classList.toggle("border-ink", isActive);
  button.classList.toggle("text-muted", !isActive);
  button.classList.toggle("border-transparent", !isActive);
}

function setDate(date: Date) {
  activeDate = clampDate(normalizeDate(date));
  renderContent();
}

function updateNavState() {
  if (!prevBtn || !nextBtn) return;
  const year = activeDate.getFullYear();
  const start = new Date(year, 0, 1);
  prevBtn.disabled = activeDate.getTime() === start.getTime();
  nextBtn.disabled = activeDate.getTime() === today.getTime();
  prevBtn.setAttribute("aria-disabled", String(prevBtn.disabled));
  nextBtn.setAttribute("aria-disabled", String(nextBtn.disabled));
  prevBtn.title = prevBtn.disabled ? "Cannot go before January 1" : "";
  nextBtn.title = nextBtn.disabled ? "Cannot go past today" : "";
}

function updateTodayState() {
  if (!todayBtn || !dayIndicatorEl) return;
  const isToday = activeDate.getTime() === today.getTime();
  const isStart = prevBtn?.disabled ?? false;
  const isEnd = nextBtn?.disabled ?? false;
  todayBtn.classList.toggle("hidden", isToday);
  if (isToday) {
    dayIndicatorEl.textContent = "Today";
    return;
  }
  if (isStart) {
    dayIndicatorEl.textContent = "Start of year";
    return;
  }
  if (isEnd) {
    dayIndicatorEl.textContent = "Today";
    return;
  }
  dayIndicatorEl.textContent = "";
}

function setErrorState(message: string) {
  if (quoteEl) quoteEl.textContent = "Unable to load today\'s spark.";
  if (promptEl) promptEl.textContent = "Please refresh or try again later.";
  if (authorEl) authorEl.textContent = "";
  if (langNoteEl) langNoteEl.textContent = "";
  if (errorSummaryEl) {
    errorSummaryEl.classList.remove("hidden");
    const summaryText = errorSummaryEl.querySelector("p");
    if (summaryText) {
      summaryText.textContent = message;
    }
  }
  retryBtn?.classList.remove("hidden");
}

function clearErrorState() {
  errorSummaryEl?.classList.add("hidden");
  retryBtn?.classList.add("hidden");
}

function renderContent() {
  if (!dateEl || !quoteEl || !promptEl) return;
  clearErrorState();
  const isoDate = toISODate(activeDate);
  dateEl.textContent = formatDate(activeDate);

  const entry = dataCache[isoDate];
  const content = entry?.languages?.[activeLang];
  const fallback = entry?.languages?.en;

  if (!entry) {
    quoteEl.textContent = "No content for this day.";
    promptEl.textContent = "Check back soon for a fresh prompt.";
    if (authorEl) authorEl.textContent = "";
    if (langNoteEl) langNoteEl.textContent = "";
    announce(`No content available for ${dateEl.textContent}.`);
    updateNavState();
    updateTodayState();
    return;
  }

  if (content) {
    quoteEl.textContent = content.quote;
    promptEl.textContent = content.prompt;
    if (authorEl) {
      authorEl.textContent = content.author ? `\u2014 ${content.author}` : "";
    }
    if (langNoteEl) langNoteEl.textContent = "";
    announce(`Updated inspiration for ${dateEl.textContent}.`);
  } else if (fallback) {
    quoteEl.textContent = fallback.quote;
    promptEl.textContent = fallback.prompt;
    if (authorEl) {
      authorEl.textContent = fallback.author ? `\u2014 ${fallback.author}` : "";
    }
    if (langNoteEl) {
      langNoteEl.textContent = `Showing EN (missing ${activeLang.toUpperCase()})`;
    }
    announce(`Content unavailable in ${activeLang}. Showing English.`);
  } else {
    quoteEl.textContent = "No content for this day.";
    promptEl.textContent = "Check back soon for a fresh prompt.";
    if (authorEl) authorEl.textContent = "";
    if (langNoteEl) langNoteEl.textContent = "";
    announce(`No content available for ${dateEl.textContent}.`);
  }

  updateNavState();
  updateTodayState();
}

async function loadData() {
  if (mainEl) mainEl.setAttribute("aria-busy", "true");
  clearErrorState();
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load data");
    dataCache = (await response.json()) as QuoteData;
    renderContent();
  } catch {
    setErrorState("We could not load today's inspiration. Try again.");
    announce("Unable to load content. Please refresh and try again.");
  } finally {
    if (mainEl) mainEl.setAttribute("aria-busy", "false");
  }
}

function createLiveRegion() {
  const region = document.createElement("div");
  region.className = "sr-only";
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-atomic", "true");
  document.body.append(region);
  liveRegionEl = region;
}

function announce(message: string) {
  if (!liveRegionEl) return;
  liveRegionEl.textContent = "";
  window.setTimeout(() => {
    if (liveRegionEl) {
      liveRegionEl.textContent = message;
    }
  }, 10);
}

function stepDateBy(days: number) {
  setDate(new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate() + days));
}

function focusActiveNavControl(preferred: "prev" | "next" | "today") {
  if (preferred === "prev" && prevBtn && !prevBtn.disabled) {
    prevBtn.focus();
    return;
  }
  if (preferred === "next" && nextBtn && !nextBtn.disabled) {
    nextBtn.focus();
    return;
  }
  if (todayBtn && !todayBtn.classList.contains("hidden")) {
    todayBtn.focus();
  }
}

function handleNavKeyboard(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  const isNavControl = target?.matches("[data-prev], [data-next], [data-today]") ?? false;
  if (!isNavControl) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (prevBtn?.disabled) return;
    stepDateBy(-1);
    focusActiveNavControl("prev");
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    if (nextBtn?.disabled) return;
    stepDateBy(1);
    focusActiveNavControl("next");
  }
}

function bindEvents() {
  prevBtn?.addEventListener("click", () => {
    stepDateBy(-1);
  });
  nextBtn?.addEventListener("click", () => {
    stepDateBy(1);
  });
  todayBtn?.addEventListener("click", () => setDate(today));
  retryBtn?.addEventListener("click", () => {
    loadData();
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.theme || "system";
      setTheme(theme);
    });
  });

  langButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const lang = button.dataset.lang as LanguageKey;
      if (lang) setLang(lang);
    });
  });

  document.addEventListener("keydown", handleNavKeyboard);
}

function initTheme() {
  const stored = localStorage.getItem(STORAGE_THEME_KEY) || "system";
  setTheme(stored, false);
}

document.documentElement.lang = activeLang;
createLiveRegion();
updateTime();
setInterval(updateTime, 1_000);
initTheme();
updateLangButtons();
bindEvents();
loadData();

