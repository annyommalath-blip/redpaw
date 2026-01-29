import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import lo from "./locales/lo.json";
import th from "./locales/th.json";
import zhHans from "./locales/zh-Hans.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "lo", name: "Lao", nativeName: "ລາວ" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "zh-Hans", name: "Chinese (Simplified)", nativeName: "简体中文" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const resources = {
  en: { translation: en },
  lo: { translation: lo },
  th: { translation: th },
  "zh-Hans": { translation: zhHans },
};

// Get initial language from localStorage or default to English
const getInitialLanguage = (): LanguageCode => {
  try {
    const stored = localStorage.getItem("preferred_language");
    if (stored && SUPPORTED_LANGUAGES.some((lang) => lang.code === stored)) {
      return stored as LanguageCode;
    }
  } catch {
    // localStorage not available
  }
  return "en";
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
