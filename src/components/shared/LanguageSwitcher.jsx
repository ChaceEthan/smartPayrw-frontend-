import { useTranslation } from "react-i18next";
import { languageOptions } from "../../i18n.js";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  function handleLanguageChange(event) {
    i18n.changeLanguage(event.target.value);
  }

  return (
    <select
      className="language-switcher"
      value={i18n.resolvedLanguage || i18n.language}
      onChange={handleLanguageChange}
      aria-label={t("app.language")}
    >
      {languageOptions.map((language) => (
        <option key={language.code} value={language.code}>
          {language.label}
        </option>
      ))}
    </select>
  );
}
