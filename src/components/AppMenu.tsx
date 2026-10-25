// src/components/AppMenu.tsx
import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { WeatherUnit } from "@/lib/weather";
import { saveUnitPref } from "@/lib/weather";

const SKY_PREF_KEY = "weather:sky-pref";
const FONT_SIZE_KEY = "weather:font-size-pref";

const SKY_OPTIONS = [
  { value: "auto", labelKey: "sky_auto" },
  { value: "clear-day", labelKey: "sky_clear_day" },
  { value: "clear-night", labelKey: "sky_clear_night" },
  { value: "cloudy-day", labelKey: "sky_cloudy_day" },
  { value: "cloudy-night", labelKey: "sky_cloudy_night" },
  { value: "fog", labelKey: "sky_fog" },
  { value: "rain", labelKey: "sky_rain" },
  { value: "snow", labelKey: "sky_snow" },
  { value: "storm", labelKey: "sky_storm" },
];

const FONT_SIZE_OPTIONS = [
  { value: "normal", labelKey: "font_normal", scale: "100%" },
  { value: "large", labelKey: "font_large", scale: "115%" },
  { value: "xlarge", labelKey: "font_xlarge", scale: "130%" },
];

const LANGUAGES = [
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
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

export function AppMenu({
  unit,
  onUnitChange,
}: {
  unit: WeatherUnit;
  onUnitChange: (next: WeatherUnit) => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [skyPref, setSkyPref] = useState("auto");
  const [fontSize, setFontSize] = useState("normal");
  const currentLang = i18n?.language || "en";
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedSky = localStorage.getItem(SKY_PREF_KEY);
      if (savedSky) setSkyPref(savedSky);
      const savedFont = localStorage.getItem(FONT_SIZE_KEY);
      if (savedFont) setFontSize(savedFont);
    } catch {}
  }, []);

  const handleSkyChange = (val: string) => {
    setSkyPref(val);
    try {
      localStorage.setItem(SKY_PREF_KEY, val);
      window.dispatchEvent(new CustomEvent("weather:sky-change", { detail: val }));
    } catch {}
  };

  const handleFontSizeChange = (val: string) => {
    setFontSize(val);
    try {
      localStorage.setItem(FONT_SIZE_KEY, val);
      const opt = FONT_SIZE_OPTIONS.find((f) => f.value === val);
      document.documentElement.style.fontSize = opt ? opt.scale : "100%";
    } catch {}
  };

  const handleLangChange = async (code: string) => {
    try {
      if (typeof i18n?.changeLanguage === "function") {
        await i18n.changeLanguage(code);
      }
      localStorage.setItem("weather:lang", code);
      localStorage.setItem("app_language", code);
    } catch (e) {
      console.error("Language switch error:", e);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 shadow-md text-foreground transition-all duration-200"
        aria-label={t("settings")}
      >
        <span className="text-xl">⚙️</span>
      </button>

      {open && (
        <div className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-12 w-[calc(100vw-32px)] sm:w-80 max-h-[85vh] overflow-y-auto z-50 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl p-4 text-card-foreground">
          {/* Units */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("units")}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onUnitChange("metric");
                  saveUnitPref("metric");
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition ${
                  unit === "metric"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted hover:bg-muted/80 text-foreground border-border"
                }`}
              >
                °C • Metric
              </button>
              <button
                type="button"
                onClick={() => {
                  onUnitChange("us");
                  saveUnitPref("us");
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition ${
                  unit === "us"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted hover:bg-muted/80 text-foreground border-border"
                }`}
              >
                °F • US
              </button>
            </div>
          </div>

          {/* Sky Theme */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("sky_background")}
            </h4>
            <select
              value={skyPref}
              onChange={(e) => handleSkyChange(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg py-1.5 px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              {SKY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("text_size")}
            </h4>
            <div className="grid grid-cols-3 gap-1.5">
              {FONT_SIZE_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => handleFontSizeChange(f.value)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition ${
                    fontSize === f.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted hover:bg-muted/80 text-foreground border-border"
                  }`}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Language Selector */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("language")}
            </h4>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {LANGUAGES.map((lang) => {
                const isActive =
                  currentLang === lang.code ||
                  i18n?.language === lang.code ||
                  i18n?.language?.startsWith(lang.code + "-");

                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLangChange(lang.code)}
                    className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-xs text-left border transition ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-muted hover:bg-muted/80 text-foreground border-border"
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span className="truncate">{lang.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground">
            <Link
              to="/privacy"
              onClick={() => setOpen(false)}
              className="hover:text-foreground underline underline-offset-2"
            >
              {t("privacy_policy")}
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
