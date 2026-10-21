// src/components/WeatherView.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { type Weather } from "@/lib/weather";
import {
  getCityWeatherBackground,
  getInstantBackground,
} from "@/lib/aiWatercolorGenerator";
import { WeatherIcon, wmoToIconCode } from "@/lib/weatherIcons";

export interface TickerAlertItem {
  icon: string;
  tag: string;
  text: string;
  severity: "disaster" | "warning" | "caution" | "clear" | "advisory" | string;
  tagKey?: string;
  textKey?: string;
  textParams?: Record<string, string | number>;
}

function formatTimeAgo(timestamp: number | null | undefined): string {
  if (!timestamp || isNaN(timestamp)) return "Just now";
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Returns translated weather condition string based on WMO code
 */
function getConditionLabel(code: number, t: (k: string, f?: string) => string): string {
  if (code === 0) return t("cond_clear", "Clear");
  if (code <= 2) return t("cond_partly_cloudy", "Partly cloudy");
  if (code === 3) return t("cond_overcast", "Overcast");
  if (code <= 48) return t("cond_fog", "Fog");
  if (code <= 57) return t("cond_drizzle", "Drizzle");
  if (code <= 65) return t("cond_rain", "Rain");
  if (code <= 67) return t("cond_heavy_rain", "Heavy rain");
  if (code <= 77) return t("cond_snow", "Snow");
  if (code <= 82) return t("cond_showers", "Showers");
  if (code <= 86) return t("cond_snow_showers", "Snow showers");
  return t("cond_thunderstorm", "Thunderstorm");
}

function getUvLabel(uv: number, t: (k: string, f?: string) => string): string {
  if (uv <= 2) return t("uv_low", "Low");
  if (uv <= 5) return t("uv_moderate", "Moderate");
  if (uv <= 7) return t("uv_high", "High");
  if (uv <= 10) return t("uv_very_high", "Very High");
  return t("uv_extreme", "Extreme");
}

function getAqiLabel(aqi: number, t: (k: string, f?: string) => string): string {
  if (aqi <= 50) return t("aqi_good", "Good");
  if (aqi <= 100) return t("aqi_moderate", "Moderate");
  if (aqi <= 150) return t("aqi_sensitive", "Sensitive");
  if (aqi <= 200) return t("aqi_unhealthy", "Unhealthy");
  return t("aqi_very_unhealthy", "Very Unhealthy");
}

const TAG_TRANSLATION_MAP: Record<string, string> = {
  "SEVERE THUNDERSTORM WARNING": "alert_thunderstorm_tag",
  "WINTER WEATHER ADVISORY": "alert_winter_tag",
  "HEAVY PRECIPITATION ADVISORY": "alert_rain_tag",
  "RAIN ONSET ADVISORY": "alert_rain_onset_tag",
  "EARTHQUAKE ALERT": "alert_earthquake_tag",
  "RIVER FLOOD WATCH": "alert_flood_tag",
  "ALL CLEAR": "all_clear",
};

interface WeatherViewProps {
  w: Weather;
  disasters?: TickerAlertItem[];
  refreshing: boolean;
  isFav: boolean;
  onToggleFav: () => void;
  onRefresh: () => void;
  onOpenGallery?: () => void;
  customBg?: string | null;
}

export function WeatherView({
  w,
  disasters = [],
  refreshing,
  isFav,
  onToggleFav,
  onRefresh,
  onOpenGallery,
  customBg,
}: WeatherViewProps) {
  const { t, i18n } = useTranslation();
  const currentInfo = wmoToIconCode(w.current.code, w.current.is_day ?? 1, w.place.name, w.current.aqi);
  const localizedDesc = getConditionLabel(w.current.code, t);
  const windUnit = w.unit === "imperial" ? "mph" : "km/h";
  const tempSymbol = w.unit === "imperial" ? "°F" : "°C";

  // Instant weather gradient fallback
  const [heroBg, setHeroBg] = useState<string>(() => getInstantBackground(w.current.code));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [wearStyle, setWearStyle] = useState<"casual" | "business" | "sport">("casual");

  // Custom photo & AI background state
  const [customPhoto, setCustomPhoto] = useState<string | null>(() => customBg || null);

  const tempC = w.unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  const isRainy = w.current.code >= 51 && w.current.code <= 82;
  const isFreezing = tempC <= 5;
  const isWarm = tempC >= 22;

  const hasDisaster = disasters?.some((alert) => alert.severity === "disaster");

  // Today's high and low
  const todayForecast = w.daily?.[0];
  const highTemp = todayForecast ? Math.round(todayForecast.max) : Math.round(w.current.temp);
  const lowTemp = todayForecast ? Math.round(todayForecast.min) : Math.round(w.current.temp);

  // Sync external customBg prop change instantly
  useEffect(() => {
    if (customBg !== undefined) {
      setCustomPhoto(customBg);
    }
  }, [customBg]);

  // Load custom photo for current city
  useEffect(() => {
    if (!w?.place?.name) return;
    try {
      const stored = localStorage.getItem(`weather:custom-bg:${w.place.name.toLowerCase().trim()}`);
      if (stored) {
        setCustomPhoto(stored);
        return;
      }
    } catch {}
    setCustomPhoto(null);
  }, [w?.place?.name]);

  // Load AI curated or regional artwork
  useEffect(() => {
    let cancelled = false;
    const instantGradient = getInstantBackground(w.current.code);
    setHeroBg(instantGradient);
    setIsGenerating(true);

    getCityWeatherBackground(
      w.place.name,
      w.current.code,
      currentInfo.desc || "Clear",
      w.place.country,
      w.current.temp,
      w.unit,
      (streamingBg) => {
        if (!cancelled && streamingBg) {
          setHeroBg(streamingBg);
        }
      }
    )
      .then((art) => {
        if (!cancelled && art) {
          setHeroBg(art.initialBg);
          setIsAiGenerated(art.isAi);
          setIsGenerating(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHeroBg(instantGradient);
          setIsGenerating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [w?.place?.name, w?.current?.code]);

  // Localized clothing advice text
  const tailoredAdvice = (() => {
    if (wearStyle === "business") {
      if (isFreezing) return t("wear_biz_freezing", "Wool overcoat, tailored trousers, cashmere knit & warm thermal layers.");
      if (isRainy) return t("wear_biz_rain", "Trench coat or water-repellent blazer, dress leather shoes & compact umbrella.");
      if (isWarm) return t("wear_biz_warm", "Lightweight linen or breathable cotton suit, open collar, loafers.");
      return t("wear_biz_mild", "Structured blazer, pressed chinos or tailored trousers, breathable layer.");
    }
    if (wearStyle === "sport") {
      if (isFreezing) return t("wear_sport_freezing", "Thermal base layers, windbreaker, running gloves & fleece beanie.");
      if (isRainy) return t("wear_sport_rain", "Waterproof running shell, moisture-wicking gear & high-traction shoes.");
      if (isWarm) return t("wear_sport_warm", "Ultralight singlet or tee, athletic shorts, cap & sun protection.");
      return t("wear_sport_mild", "Moisture-wicking athletic pullover, training joggers & performance sneakers.");
    }
    // Casual
    if (isFreezing) return t("wear_cas_freezing", "Heavy winter jacket, cozy hoodie, warm knit scarf & insulated boots.");
    if (isRainy) return t("wear_cas_rain", "Rain jacket or hooded layer, waterproof footwear & a sturdy umbrella.");
    if (isWarm) return t("wear_cas_warm", "Breathable cotton tee, light shorts or relaxed pants, sunglasses.");
    return t("wear_cas_mild", "Light layer, comfortable crewneck sweater or denim jacket, everyday sneakers.");
  })();

  // 24-hour forecast
  const now = new Date();
  const currentHourStr = now.toISOString().slice(0, 13);
  let startIdx = w.hourly.findIndex((h) => h.time.startsWith(currentHourStr));
  if (startIdx === -1) startIdx = 0;
  const displayHours = w.hourly.slice(startIdx, startIdx + 24);

  // Sunrise/sunset calculations
  const riseMinutes = w.sun?.sunrise ? parseInt(w.sun.sunrise.slice(11, 13), 10) * 60 + parseInt(w.sun.sunrise.slice(14, 16), 10) : 360;
  const setMinutes = w.sun?.sunset ? parseInt(w.sun.sunset.slice(11, 13), 10) * 60 + parseInt(w.sun.sunset.slice(14, 16), 10) : 1080;

  function isHourDaytime(timeStr: string): number {
    const hr = parseInt(timeStr.slice(11, 13), 10);
    const min = parseInt(timeStr.slice(14, 16), 10) || 0;
    const totalMin = hr * 60 + min;
    return totalMin >= riseMinutes && totalMin < setMinutes ? 1 : 0;
  }

  const activeBg = customPhoto || heroBg;
  const bgStyle = activeBg.startsWith("linear-gradient")
    ? { background: activeBg }
    : {
        backgroundImage: `url(${activeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };

  return (
    <>
      {/* 1. TOP ACTIVE ALERTS TICKER */}
      <section className="mb-4">
        {disasters && disasters.length > 0 ? (
          <div
            className={`relative overflow-hidden rounded-xl border px-3 py-2 text-xs backdrop-blur-md shadow-sm transition-colors ${
              hasDisaster
                ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="shrink-0 flex items-center gap-1 font-semibold text-[11px] uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hasDisaster ? "bg-red-500" : "bg-amber-500"}`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${hasDisaster ? "bg-red-600" : "bg-amber-600"}`} />
                </span>
                {t("alerts", "Weather Alerts")}
              </span>

              <div className="relative flex-1 overflow-hidden whitespace-nowrap">
                <div className="inline-flex gap-8 animate-ticker hover:[animation-play-state:paused]">
                  {disasters.concat(disasters).map((alert, idx) => {
                    const tagKey = alert.tagKey || TAG_TRANSLATION_MAP[alert.tag];
                    const displayTag = tagKey ? t(tagKey, alert.tag) : alert.tag;

                    let displayText = alert.text;
                    if (alert.textKey) {
                      if (alert.textKey === "alert_rain_onset_text" && alert.textParams) {
                        displayText = t("alert_rain_onset_text", {
                          time: alert.textParams.time,
                          prob: alert.textParams.prob,
                          defaultValue: alert.text,
                        });
                      } else {
                        displayText = t(alert.textKey, alert.text);
                      }
                    }

                    return (
                      <span key={idx} className="inline-flex items-center gap-1.5 shrink-0">
                        <span>{alert.icon}</span>
                        <strong className="font-semibold underline decoration-dotted underline-offset-2">
                          {displayTag}:
                        </strong>
                        <span>{displayText}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            <span className="flex items-center gap-2">
              <span className="text-base">🌿</span>
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                {t("all_clear", "ALL CLEAR")}
              </span>
              <span className="opacity-80 hidden sm:inline">
                • {t("all_clear_sub", "No severe weather watches active in this region")}
              </span>
            </span>
            <span className="text-[10px] opacity-75 font-mono">
              {new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
      </section>

      {/* 2. HERO CARD */}
      <section
        style={bgStyle}
        className="relative mt-4 overflow-hidden rounded-2xl bg-slate-900 min-h-[190px] border border-white/10 shadow-lg text-white transition-all duration-700"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/25 z-0" />

        <div className="relative z-10 p-5 flex flex-col justify-between min-h-[190px]">
          {/* Top row: City Name & Favorite */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
                  {w.place.name}
                  {w.place.country ? `, ${w.place.country}` : ""}
                </h2>
                <button
                  type="button"
                  onClick={onToggleFav}
                  title={isFav ? "Remove favorite" : "Add favorite"}
                  aria-label={isFav ? "Remove favorite" : "Add favorite"}
                  className="text-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                >
                  {isFav ? "⭐" : "☆"}
                </button>
              </div>

              <p className="text-xs text-white/80 drop-shadow-sm flex items-center gap-1.5 mt-0.5">
                <span>{localizedDesc}</span>
                <span>•</span>
                <span>{t("feels_like", "Feels like")} {Math.round(w.current.feels)}°{tempSymbol}</span>
              </p>
            </div>

            {/* Refresh Pill */}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="group flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-xs border border-white/15 hover:bg-white/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title={t("refresh", "Refresh forecast")}
            >
              <span className={`inline-block text-xs transition-transform duration-500 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`}>
                🔄
              </span>
              <span className="text-[11px] font-medium tracking-wide">
                {refreshing ? "..." : formatTimeAgo(w.fetchedAt)}
              </span>
            </button>
          </div>

          {/* Bottom row: Temperature & Weather Icon */}
          <div className="flex items-end justify-between mt-6">
            <div>
              <div className="flex items-baseline">
                <span className="text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg">
                  {Math.round(w.current.temp)}
                </span>
                <span className="text-2xl sm:text-3xl font-light text-white/90 drop-shadow-md ml-1">
                  {tempSymbol}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-1 drop-shadow-sm font-medium">
                H: {highTemp}°{tempSymbol} • L: {lowTemp}°{tempSymbol}
              </p>
            </div>

            <div className="flex flex-col items-end">
              <div className="relative">
                <WeatherIcon
                  wmoCode={w.current.code}
                  isDay={w.current.is_day ?? 1}
                  className="h-16 w-16 drop-shadow-md"
                />
              </div>

              {/* Status Badge */}
              <div className="mt-1 flex items-center gap-1 text-[10px] text-white/80">
                {isGenerating ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5 border border-white/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    {t("matching_art", "Matching art…")}
                  </span>
                ) : activeBg && !activeBg.startsWith("linear-gradient") ? (
                  <button
                    type="button"
                    onClick={onOpenGallery}
                    className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5 border border-white/15 hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    <span>✨</span>
                    <span>{t("ai_scene", "AI custom scene")}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenGallery}
                    className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5 border border-white/10 hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    <span>🎨</span>
                    <span>{t("vibrant_atmosphere", "Vibrant atmosphere")}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WHAT TO WEAR ADVICE */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">👕</span>
            <div>
              <h3 className="font-semibold text-sm leading-none">{t("what_to_wear", "What to Wear Today")}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("tailored_for", "Tailored for")} {localizedDesc} & {Math.round(w.current.temp)}°{tempSymbol}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            {(["casual", "business", "sport"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setWearStyle(mode)}
                className={`rounded-md px-2.5 py-1 capitalize font-medium transition-colors cursor-pointer ${
                  wearStyle === mode
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(mode, mode)}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {tailoredAdvice}
        </p>
      </section>

      {/* 4. KEY METRICS GRID */}
      <section className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>{t("wind", "Wind")}</span>
            <span className="text-xs">💨</span>
          </div>
          <p className="text-lg font-semibold mt-1">
            {Math.round(w.current.wind)} <span className="text-xs font-normal text-muted-foreground">{windUnit}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {t("surface_breeze", "Surface breeze")}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>{t("humidity", "Humidity")}</span>
            <span className="text-xs">💧</span>
          </div>
          <p className="text-lg font-semibold mt-1">
            {w.current.humidity}<span className="text-xs font-normal text-muted-foreground">%</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {t("dew_comfortable", "Dew point comfortable")}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>{t("uv", "UV Index")}</span>
            <span className="text-xs">☀️</span>
          </div>
          <p className="text-lg font-semibold mt-1">
            {w.current.uvIndex ?? "—"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {getUvLabel(w.current.uvIndex ?? 0, t)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>{t("air_quality", "Air Quality")}</span>
            <span className="text-xs">🍃</span>
          </div>
          <p className="text-lg font-semibold mt-1">
            {w.current.aqi !== undefined ? w.current.aqi : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {w.current.aqi !== undefined ? getAqiLabel(w.current.aqi, t) : t("aqi_moderate", "Moderate")}
          </p>
        </div>
      </section>

      {/* 5. 24-HOUR HOURLY FORECAST */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground mb-3">
          {t("hourly", "24-Hour Forecast")}
        </h3>

        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-border">
          {displayHours.map((h, i) => {
            const timeOnly = h.time.slice(11, 16);
            const isDay = isHourDaytime(h.time);
            return (
              <div
                key={i}
                className="flex flex-col items-center justify-between min-w-[70px] rounded-xl border border-border/60 bg-muted/20 p-2.5 text-center shrink-0"
              >
                <span className="text-[11px] font-medium text-muted-foreground">
                  {i === 0 ? t("now", "Now") : timeOnly}
                </span>

                <div className="my-1.5">
                  <WeatherIcon
                    wmoCode={h.code}
                    isDay={isDay}
                    className="h-8 w-8 drop-shadow-xs"
                  />
                </div>

                <span className="text-xs font-semibold">
                  {Math.round(h.temp)}°
                </span>

                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mt-0.5">
                  {h.precipProb > 0 ? `${h.precipProb}%` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. 7-DAY FORECAST */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground mb-3">
          {t("seven_day", "7-Day Forecast")}
        </h3>

        <div className="divide-y divide-border/50">
          {w.daily?.slice(0, 7).map((day, i) => {
            const dateObj = new Date(day.date + "T12:00:00");
            const dayName =
              i === 0
                ? t("today", "Today")
                : dateObj.toLocaleDateString(i18n.language || undefined, { weekday: "short" });

            return (
              <div
                key={day.date}
                className="flex items-center justify-between py-2.5 text-xs first:pt-1 last:pb-1"
              >
                <span className="w-16 font-medium text-foreground">
                  {dayName}
                </span>

                <div className="flex items-center gap-2">
                  <WeatherIcon
                    wmoCode={day.code}
                    isDay={1}
                    className="h-6 w-6 drop-shadow-xs"
                  />
                  <span className="text-[11px] text-muted-foreground hidden sm:inline w-24 truncate">
                    {getConditionLabel(day.code, t)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 w-14 justify-center">
                  {day.precipProbMax > 0 && (
                    <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400">
                      💧 {day.precipProbMax}%
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-right">
                  <span className="font-semibold text-foreground w-8">
                    {Math.round(day.max)}°
                  </span>
                  <span className="text-muted-foreground w-8">
                    {Math.round(day.min)}°
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
