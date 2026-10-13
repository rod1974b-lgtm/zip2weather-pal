import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export type LanguageSelectorVariant = "dropdown" | "compact" | "full";

const LANGUAGES: { code: string; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "id", label: "Indonesia", flag: "🇮🇩" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

const LANG_KEY = "app_language";

export function LanguageSelector({
  variant = "dropdown",
}: {
  variant?: LanguageSelectorVariant;
}) {
  const { i18n, t } = useTranslation();
  const [lang, setLang] = useState("en");

  useEffect(() => {
    setLang(i18n.language || "en");
  }, [i18n.language]);

  function change(code: string) {
    setLang(code);
    i18n.changeLanguage(code);
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {}
  }

  if (variant === "compact") {
    const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
    return (
      <select
        value={lang}
        onChange={(e) => change(e.target.value)}
        aria-label={t("language")}
        title={t("language")}
        className="rounded-lg border border-input bg-card px-2 py-1 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-ring"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
        {/* keeps `current` referenced for the visible value */}
        <option hidden>{current.label}</option>
      </select>
    );
  }

  if (variant === "full") {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => change(l.code)}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              lang === l.code
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-card text-card-foreground hover:bg-accent"
            }`}
          >
            <span aria-hidden>{l.flag}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <select
      value={lang}
      onChange={(e) => change(e.target.value)}
      aria-label={t("language")}
      className="rounded-lg border border-input bg-card px-2 py-1 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-ring"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}

export default LanguageSelector;
