// @ts-nocheck
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import rw from "./locales/rw.json";
import sw from "./locales/sw.json";

export const languageOptions = [
  { code: "rw", label: "Kinyarwanda" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "sw", label: "Kiswahili" },
];

const languageCodes = languageOptions.map((language) => language.code);
const languageStorageKey = "smartpayrw.language";

function getInitialLanguage() {
  if (typeof window === "undefined") {
    return "en";
  }

  const savedLanguage = window.localStorage.getItem(languageStorageKey);
  return languageCodes.includes(savedLanguage) ? savedLanguage : "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    rw: { translation: rw },
    sw: { translation: sw },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  supportedLngs: languageCodes,
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (language) => {
  if (typeof window !== "undefined" && languageCodes.includes(language)) {
    window.localStorage.setItem(languageStorageKey, language);
  }
});

export default i18n;
