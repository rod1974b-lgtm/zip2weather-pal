// src/components/LanguageSelector.tsx
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
  variant = "compact",
}: {
  variant?: LanguageSelectorVariant;
}) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(() => i18n?.language || "en");
  const ref = useRef<HTMLDivElement>(null);

  // Sync state if language changes elsewhere
  useEffect(() => {
    if (i18n?.language) {
      setCurrentLang(i18n.language);
    }
  }, [i18n?.language]);

  // Listen for custom language events from AppMenu
  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setCurrentLang(detail);
    };
    window.addEventListener("weather:lang-change", handleSync);
    return () => window.removeEventListener("weather:lang-change", handleSync);
  }, []);

  // Desktop outside-click listener
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

  const handleChange = async (code: string) => {
    try {
      setCurrentLang(code);
      if (typeof i18n?.changeLanguage === "function") {
        await i18n.changeLanguage(code);
      }
      localStorage.setItem("weather:lang", code);
      localStorage.setItem("app_language", code);
      if (typeof document !== "undefined") {
        document.documentElement.lang = code;
      }
      window.dispatchEvent(new CustomEvent("weather:lang-change", { detail: code }));
    } catch (e) {
      console.error("Language switch error:", e);
    } finally {
      setIsOpen(false);
    }
  };

  const current =
    LANGUAGES.find((l) => l.code === currentLang || currentLang.startsWith(l.code + "-")) ||
    LANGUAGES[0]!;

  // Compact variant: circle flag button for the top header next to settings
  if (variant === "compact") {
    return (
      <div className="relative inline-block text-left" ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label={`Language: ${current.native}`}
          title={`${current.native} (${current.name})`}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 shadow-md text-foreground transition-all duration-200 cursor-pointer text-lg"
        >
          <span>{current.flag}</span>
        </button>

        {/* Mobile touch backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}

        {isOpen && (
          <div
            role="menu"
            className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-12 z-50 w-[calc(100vw-32px)] sm:w-64 max-h-[75vh] overflow-y-auto rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-2 shadow-2xl text-card-foreground animate-in fade-in zoom-in-95"
          >
            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1 flex items-center justify-between">
              <span>🌐 Select Language</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs p-1"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
              {LANGUAGES.map((lang) => {
                const active = current.code === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleChange(lang.code)}
                    className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition cursor-pointer ${
                      active
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-card-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{lang.native}</div>
                      <div
                        className={`truncate text-[10px] ${
                          active ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {lang.name}
                      </div>
                    </div>
                    {active && <span className="text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full 2-column grid variant
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
                className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition cursor-pointer ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-input bg-card text-card-foreground hover:bg-muted"
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-xs font-semibold ${
                      active ? "text-primary-foreground" : "text-card-foreground"
                    }`}
                  >
                    {lang.native}
                  </div>
                  <div
                    className={`truncate text-[10px] ${
                      active ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
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

  // Dropdown variant
  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs font-medium text-card-foreground shadow-xs transition hover:bg-muted cursor-pointer"
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
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-card-foreground hover:bg-muted"
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{lang.native}</div>
                  <div
                    className={`truncate text-[10px] ${
                      active ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {lang.name}
                  </div>
                </div>
                {active && <span className="font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
