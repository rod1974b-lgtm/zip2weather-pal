import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export type LanguageSelectorVariant = "dropdown" | "compact" | "full";

export const LANGUAGES = [
  { code: "en", flag: "🇺🇸", name: "English", native: "English" },
  { code: "th", flag: "🇹🇭", name: "Thai", native: "ไทย" },
  { code: "es", flag: "🇪🇸", name: "Spanish", native: "Español" },
  { code: "ja", flag: "🇯🇵", name: "Japanese", native: "日本語" },
  { code: "zh", flag: "🇨🇳", name: "Chinese", native: "中文" },
  { code: "hi", flag: "🇮🇳", name: "Hindi", native: "हिन्दी" },
  { code: "fr", flag: "🇫🇷", name: "French", native: "Français" },
  { code: "de", flag: "🇩🇪", name: "German", native: "Deutsch" },
  { code: "pt", flag: "🇧🇷", name: "Portuguese", native: "Português" },
  { code: "ru", flag: "🇷🇺", name: "Russian", native: "Русский" },
  { code: "ar", flag: "🇸🇦", name: "Arabic", native: "العربية" },
  { code: "ko", flag: "🇰🇷", name: "Korean", native: "한국어" },
  { code: "id", flag: "🇮🇩", name: "Indonesian", native: "Indonesia" },
  { code: "vi", flag: "🇻🇳", name: "Vietnamese", native: "Tiếng Việt" },
];

export function LanguageSelector({
  variant = "dropdown",
}: {
  variant?: LanguageSelectorVariant;
}) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language || "en");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("app_language");
      if (saved && saved !== i18n.language) {
        i18n.changeLanguage(saved);
        setCurrentLang(saved);
      } else if (i18n.language) {
        setCurrentLang(i18n.language);
      }
    } catch {}
  }, [i18n.language]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    try {
      localStorage.setItem("app_language", code);
    } catch {}
    setCurrentLang(code);
    setIsOpen(false);
  };

  const current =
    LANGUAGES.find((l) => l.code === currentLang || currentLang.startsWith(l.code)) ||
    LANGUAGES[0]!;

  // Compact variant: circle flag icon button (ideal for header)
  if (variant === "compact") {
    return (
      <div className="relative inline-block text-left" ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-card text-base shadow-xs transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
          title={`${current.native} (${current.name})`}
          aria-label={`Current language: ${current.native}`}
        >
          {current.flag}
        </button>

        {isOpen && (
          <div
            role="menu"
            className="absolute right-0 top-10 z-50 max-h-[70vh] w-60 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95"
          >
            {LANGUAGES.map((lang) => {
              const active = current.code === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleChange(lang.code)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                    active
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-card-foreground hover:bg-accent"
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{lang.native}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{lang.name}</div>
                  </div>
                  {active && <span className="text-primary font-bold">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Full variant: 2-column grid of all languages (ideal for settings / privacy page)
  if (variant === "full") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          🌐 Language / ภาษา / Idioma / 言語
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LANGUAGES.map((lang) => {
            const active = current.code === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleChange(lang.code)}
                className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-input bg-card text-card-foreground hover:bg-accent hover:border-accent-foreground/20"
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-xs font-semibold ${active ? "text-primary-foreground" : "text-card-foreground"}`}>
                    {lang.native}
                  </div>
                  <div className={`truncate text-[10px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {lang.name}
                  </div>
                </div>
                {active && <span className="text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default dropdown variant: pill button with flag + label + chevron
  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs font-medium text-card-foreground shadow-xs transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className="text-base">{current.flag}</span>
        <span className="hidden sm:inline">{current.native}</span>
        <span className="text-[10px] text-muted-foreground">▾</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-50 max-h-[70vh] w-64 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95"
        >
          {LANGUAGES.map((lang) => {
            const active = current.code === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleChange(lang.code)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-card-foreground hover:bg-accent"
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{lang.native}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{lang.name}</div>
                </div>
                {active && <span className="text-primary font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
