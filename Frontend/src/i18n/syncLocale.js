import i18n from "./i18n";

const RTL_LOCALES = new Set(["ar", "ur"]);

export function applyLocale(locale) {
  const lang = locale || "en";
  if (i18n.language !== lang) {
    i18n.changeLanguage(lang);
  }
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LOCALES.has(lang) ? "rtl" : "ltr";
}
