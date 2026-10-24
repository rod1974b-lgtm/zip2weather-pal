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

function formatTimeAgo(
  timestamp: number | null | undefined,
  t: (k: string, f?: string) => string
): string {
  if (!timestamp || isNaN(timestamp)) return t("time_just_now", "Just now");
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return t("time_just_now", "Just now");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}${t("time_min_ago", "m ago")}`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}${t("time_hr_ago", "h ago")}`;
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
  const localizedDesc = getConditionLabel(w.current.code, t as any);
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
      currentInfo.desc || "Clear",
      w.current.code,
      w.current.temp,
      (streamingBg) => {
        if (!cancelled && streamingBg) {
          setHeroBg(streamingBg);
        }
      },
      w.place.country,
      w.place.lat,
      w.place.lon
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
      if (isRainy) return t("wear_biz_rain", "Waterproof trench coat, dark leather shoes, tailored suit & compact umbrella.");
      if (isWarm) return t("wear_biz_warm", "Lightweight linen or breathable cotton shirt, neat chinos & loafers.");
      return t("wear_biz_mild", "Structured blazer, Oxford button-down shirt & smart pressed trousers.");
    }
    if (wearStyle === "sport") {
      if (isFreezing) return t("wear_sport_freezing", "Thermal compression base layer, windproof running jacket & fleece gloves.");
      if (isRainy) return t("wear_sport_rain", "Water-repellent hooded shell, synthetic moisture-wicking tights & trail runners.");
      if (isWarm) return t("wear_sport_warm", "Ultralight singlet or tank, breathable running shorts & UV protection cap.");
      return t("wear_sport_mild", "Breathable tech tee, flexible joggers & cushioned running shoes.");
    }
    // Casual default
    if (isFreezing) return t("wear_cas_freezing", "Heavy insulated puffer parka, chunky knit beanie, warm scarf & winter boots.");
    if (isRainy) return t("wear_cas_rain", "Rain-slicker jacket, water-resistant footwear & portable umbrella.");
    if (isWarm) return t("wear_cas_warm", "Relaxed cotton t-shirt, comfortable linen shorts, UV sunglasses & slide sandals.");
    return t("wear_cas_mild", "Comfortable cotton hoodie or zip sweatshirt, classic denim & daily sneakers.");
  })();

  const activeBg = customPhoto || heroBg;
  const isCustomActive = Boolean(customPhoto);

  const displayHours = w.hourly.slice(0, 24);

  // Helper for hourly icon day/night state
  const isHourDaytime = (isoTime: string) => {
    const sunriseStr = (w.daily?.[0] as any)?.sunrise;
    const sunsetStr = (w.daily?.[0] as any)?.sunset;
    if (!sunriseStr || !sunsetStr) return true;
    const hourDate = new Date(isoTime);
    const sunriseDate = new Date(sunriseStr);
    const sunsetDate = new Date(sunsetStr);
    return hourDate >= sunriseDate && hourDate < sunsetDate;
  };

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
                          time: alert.textParams["time"],
                          prob: alert.textParams["prob"],
                          defaultValue: alert.text,
                        });
                      } else {
                        displayText = t(alert.textKey, alert.text);
                      }
                    }

                    return (
                      <span key={idx} className="inline-flex items-center gap-2">
                        <span className="font-semibold text-xs opacity-90">{alert.icon}</span>
                        <span className="font-bold underline decoration-dotted decoration-1 underline-offset-2">
                          {displayTag}
                        </span>
                        <span className="opacity-95 font-medium">{displayText}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300 backdrop-blur-md shadow-xs">
            <div className="flex items-center gap-2">
              <span className="shrink-0 flex items-center gap-1 font-semibold text-[11px] uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                {t("all_clear", "ALL CLEAR")}
              </span>
              <span className="opacity-90 truncate">
                {t("all_clear_sub", "No severe weather watches active in this region")}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 2. HERO WEATHER CARD */}
      <section
        style={bgStyle}
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl min-h-[260px] flex flex-col justify-between transition-all duration-700 bg-cover bg-center"
      >
        {/* Soft dark overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/75 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full flex-1">
          {/* Top row: City, Country, Badges & Actions */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight drop-shadow-md text-white">
                  {w.place.name}
                </h2>
                <button
                  type="button"
                  onClick={onToggleFav}
                  title={isFav ? t("remove_fav", "Remove favorite") : t("add_fav", "Add favorite")}
                  className="text-lg transition hover:scale-110 active:scale-95"
                >
                  {isFav ? "⭐" : "☆"}
                </button>
              </div>
              <p className="text-xs text-white/80 font-medium tracking-wide">
                {w.place.country}
              </p>

              {/* Status / Art badge */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {isCustomActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/80 backdrop-blur-md text-white border border-emerald-400/40">
                    🖼️ {t("gallery_active_badge", "Active Art")}
                  </span>
                ) : isGenerating ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 backdrop-blur-md text-white/90 border border-white/20">
                    <span className="animate-spin text-[10px]">✨</span>
                    {t("matching_art", "Matching art…")}
                  </span>
                ) : isAiGenerated ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/80 backdrop-blur-md text-white border border-amber-300/40">
                    ✨ {t("ai_scene", "AI Watercolor")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 backdrop-blur-md text-white/85 border border-white/15">
                    🎨 {t("vibrant_atmosphere", "Vibrant atmosphere")}
                  </span>
                )}
              </div>
            </div>

            {/* Top Right: Gallery / Art Modal Trigger & Refresh */}
            <div className="flex items-center gap-1.5">
              {onOpenGallery && (
                <button
                  type="button"
                  onClick={onOpenGallery}
                  title={t("gallery_title", "Art Gallery")}
                  className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-medium transition border border-white/25 flex items-center gap-1"
                >
                  <span>🎨</span>
                  <span className="hidden sm:inline">{t("art", "Art")}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                title={t("refresh", "Refresh forecast")}
                className="p-1.5 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white/90 transition border border-white/10 disabled:opacity-50"
              >
                <span className={`inline-block text-xs ${refreshing ? "animate-spin" : ""}`}>
                  🔄
                </span>
              </button>
            </div>
          </div>

          {/* Middle/Bottom row: Temp, Icon, Condition */}
          <div className="flex items-end justify-between mt-6">
            <div>
              <div className="flex items-baseline">
                <span className="text-5xl font-extrabold tracking-tighter drop-shadow-md text-white">
                  {Math.round(w.current.temp)}
                </span>
                <span className="text-2xl font-light ml-0.5 text-white/90 drop-shadow-md">
                  {tempSymbol}
                </span>
              </div>

              <div className="text-xs text-white/85 font-medium mt-1 flex items-center gap-2">
                <span>{localizedDesc}</span>
                <span>•</span>
                <span>
                  {t("high_short", "H")}: {highTemp}° {t("low_short", "L")}: {lowTemp}°
                </span>
              </div>
            </div>

            {/* Weather condition icon & Timestamp */}
            <div className="flex flex-col items-center">
              <WeatherIcon
                wmoCode={w.current.code}
                isDay={w.current.is_day ?? 1}
                className="h-16 w-16 drop-shadow-md"
              />
              <span className="text-[10px] text-white/70 font-mono mt-1">
                {formatTimeAgo(w.fetchedAt, t as any)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WHAT TO WEAR TODAY */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">👔</span>
            <h3 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
              {t("what_to_wear", "What to Wear Today")}
            </h3>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-muted p-0.5 text-xs">
            {(["casual", "business", "sport"] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setWearStyle(style)}
                className={`px-2 py-0.5 rounded-md font-medium capitalize transition-all ${
                  wearStyle === style
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(style, style)}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
          <div className="flex items-start gap-2.5">
            <span className="text-base mt-0.5">
              {wearStyle === "business" ? "💼" : wearStyle === "sport" ? "🏃" : "👟"}
            </span>
            <div>
              <p className="text-xs font-medium text-foreground leading-relaxed">
                {tailoredAdvice}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {t("tailored_for", "Tailored for")} {w.place.name} • {Math.round(w.current.temp)}{tempSymbol} ({localizedDesc})
              </p>
            </div>
          </div>
        </div>
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
            {getUvLabel(w.current.uvIndex ?? 0, t as any)}
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
            {w.current.aqi !== undefined ? getAqiLabel(w.current.aqi, t as any) : t("aqi_moderate", "Moderate")}
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
                    {getConditionLabel(day.code, t as any)}
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
