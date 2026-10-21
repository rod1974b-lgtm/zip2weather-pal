// src/components/AppMenu.tsx
import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { WeatherUnit } from "@/lib/weather";
import { loadUnitPref, saveUnitPref } from "@/lib/weather";

const SKY_PREF_KEY = "weather:sky-pref";
const FONT_SIZE_KEY = "weather:font-size-pref";

const SKY_OPTIONS = [
  { value: "auto", label: "Auto (weather)" },
  { value: "clear-day", label: "Sunny day" },
  { value: "clear-night", label: "Clear night" },
  { value: "cloudy-day", label: "Cloudy day" },
  { value: "cloudy-night", label: "Cloudy night" },
  { value: "fog", label: "Fog" },
  { value: "rain", label: "Rain" },
  { value: "snow", label: "Snow" },
  { value: "storm", label: "Storm" },
];

const FONT_SIZE_OPTIONS = [
  { value: "normal", label: "Normal (100%)", scale: "100%" },
  { value: "large", label: "Large (115%)", scale: "115%" },
  { value: "xlarge", label: "Huge (130%)", scale: "130%" },
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
  { code: "id", label: "Indonesia", flag: "🇮🇩" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

interface AppMenuProps {
  unit?: WeatherUnit;
  onUnitChange?: (unit: WeatherUnit) => void;
  skyChoice?: string;
  onSkyChange?: (sky: string) => void;
  fontSizeChoice?: string;
  onFontSizeChange?: (size: string) => void;
}

export function AppMenu({
  unit: propUnit,
  onUnitChange,
  skyChoice: propSky,
  onSkyChange,
  fontSizeChoice: propFontSize,
  onFontSizeChange,
}: AppMenuProps = {}) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Local fallback state
  const [localUnit, setLocalUnit] = useState<WeatherUnit>("metric");
  const [localSky, setLocalSky] = useState("auto");
  const [localFont, setLocalFont] = useState("normal");

  useEffect(() => {
    try {
      const savedUnit = loadUnitPref();
      setLocalUnit(savedUnit);
      const savedSky = localStorage.getItem(SKY_PREF_KEY);
      if (savedSky) setLocalSky(savedSky);
      const savedFont = localStorage.getItem(FONT_SIZE_KEY);
      if (savedFont) setLocalFont(savedFont);
    } catch {}
  }, []);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const activeUnit = propUnit ?? localUnit;
  const activeSky = propSky ?? localSky;
  const activeFont = propFontSize ?? localFont;

  function handleUnitToggle(nextUnit: WeatherUnit) {
    setLocalUnit(nextUnit);
    saveUnitPref(nextUnit);
    window.dispatchEvent(new Event("weather:unit-change"));
    onUnitChange?.(nextUnit);
  }

  function handleSkySelect(val: string) {
    setLocalSky(val);
    try {
      if (val === "auto") localStorage.removeItem(SKY_PREF_KEY);
      else localStorage.setItem(SKY_PREF_KEY, val);
      window.dispatchEvent(new Event("weather:sky-change"));
    } catch {}
    onSkyChange?.(val);
  }

  function handleFontSelect(val: string) {
    setLocalFont(val);
    const opt = FONT_SIZE_OPTIONS.find((o) => o.value === val);
    if (opt) document.documentElement.style.fontSize = opt.scale;
    try {
      if (val === "normal") localStorage.removeItem(FONT_SIZE_KEY);
      else localStorage.setItem(FONT_SIZE_KEY, val);
    } catch {}
    onFontSizeChange?.(val);
  }

  function handleLangSelect(code: string) {
    i18n.changeLanguage(code);
    try {
      localStorage.setItem("app_language", code);
    } catch {}
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t("settings", "Settings")}
        title={t("settings", "Settings")}
        className="flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-1.5 text-sm font-medium text-card-foreground shadow-xs hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span>⚙️</span>
        <span>{t("settings", "Settings")}</span>
        <span className="text-xs opacity-60">▾</span>
      </button>

      {/* Backdrop for touch screens */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] sm:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-[290px] sm:w-72 origin-top-right rounded-xl border border-border bg-card p-3 text-card-foreground shadow-2xl ring-1 ring-black/10 animate-in fade-in zoom-in-95 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
            <span className="font-semibold text-sm">{t("settings", "Settings")}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted font-bold"
              aria-label={t("close", "Close")}
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Unit Preference */}
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">{t("units", "Units")}</label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-input bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => handleUnitToggle("imperial")}
                  className={`rounded-md py-1 font-medium transition-colors ${
                    activeUnit === "imperial"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  US (°F, mph)
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitToggle("metric")}
                  className={`rounded-md py-1 font-medium transition-colors ${
                    activeUnit === "metric"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Metric (°C, km/h)
                </button>
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">{t("language", "Language")}</label>
              <select
                value={i18n.language || "en"}
                onChange={(e) => handleLangSelect(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-card-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Text Size */}
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">{t("text_size", "Text size")}</label>
              <select
                value={activeFont}
                onChange={(e) => handleFontSelect(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-card-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {FONT_SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sky Background */}
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">{t("sky_background", "Sky background")}</label>
              <select
                value={activeSky}
                onChange={(e) => handleSkySelect(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-card-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {SKY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Privacy Policy Link */}
            <div className="border-t border-border pt-2">
              <Link
                to="/privacy"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <span>🛡️</span>
                <span>{t("privacy_policy", "Privacy Policy")}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
