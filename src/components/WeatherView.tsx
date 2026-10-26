// src/components/WeatherView.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { type Weather } from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import {
  getCityWeatherBackground,
  getInstantBackground,
  getAllAvailableArtworks,
} from "@/lib/aiWatercolorGenerator";

export interface TickerAlertItem {
  id: string;
  text: string;
  severity: "disaster" | "warning";
  tag: string;
  tagKey?: string;
}

function formatTimeAgo(timestamp: number | undefined, t: (k: string, f?: string) => string): string {
  if (!timestamp) return t("updated_now", "Updated just now");
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 45) return t("updated_now", "Updated just now");
  const mins = Math.floor(diffSec / 60);
  if (mins === 1) return t("updated_1m", "Updated 1m ago");
  if (mins < 60) return `${t("updated_min", "Updated")} ${mins}m ${t("ago", "ago")}`;
  const hrs = Math.floor(mins / 60);
  return `${t("updated_min", "Updated")} ${hrs}h ${t("ago", "ago")}`;
}

function getConditionLabel(code: number, t: (k: string, f?: string) => string): string {
  if (code === 0) return t("cond_clear", "Clear sky");
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
  onSelectBg?: (url: string | null) => void;
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
  onSelectBg,
}: WeatherViewProps) {
  const { t, i18n } = useTranslation();
  const localizedDesc = getConditionLabel(w.current.code, t as any);
  const windUnit = w.unit === "imperial" ? "mph" : "km/h";
  const tempSymbol = w.unit === "imperial" ? "°F" : "°C";

  // Instant weather gradient fallback
  const [heroBg, setHeroBg] = useState<string>(() => getInstantBackground(w.current.code));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [wearStyle, setWearStyle] = useState<"casual" | "business" | "sport">("casual");

  // Custom photo & AI background state
  const [customPhoto, setCustomPhoto] = useState<string | null>(() => {
    if (customBg) return customBg;
    if (typeof window !== "undefined" && w?.place?.name) {
      try {
        return localStorage.getItem(`weather:custom-bg:${w.place.name.toLowerCase().trim()}`);
      } catch {}
    }
    return null;
  });

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

  // Load custom photo for current city from storage
  useEffect(() => {
    if (!w?.place?.name) return;
    try {
      const stored = localStorage.getItem(`weather:custom-bg:${w.place.name.toLowerCase().trim()}`);
      if (stored) {
        setCustomPhoto(stored);
        return;
      }
    } catch {}
    if (customBg === undefined) {
      setCustomPhoto(null);
    }
  }, [w?.place?.name]);

  // Load AI curated or regional artwork
  useEffect(() => {
    let cancelled = false;
    const instantGradient = getInstantBackground(w.current.code);
    setHeroBg(instantGradient);
    setIsGenerating(true);

    getCityWeatherBackground(
      w.place.name,
      w.current.desc || "Clear",
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
  }, [w.place.name, w.current.code, w.current.temp, w.current.desc, w.place.country, w.place.lat, w.place.lon]);

  // Flip directly to the next landmark / watercolor artwork on 1-tap
  const handleNextArt = (e: React.MouseEvent) => {
    e.stopPropagation();
    const list = getAllAvailableArtworks(
      w.place.name,
      w.current.code,
      w.current.desc || "Clear",
      w.place.country
    );

    if (!list || list.length === 0) return;

    const currentUrl = customPhoto || heroBg;
    const curIdx = list.indexOf(currentUrl);
    const nextIdx = curIdx >= 0 ? (curIdx + 1) % list.length : 0;
    const nextUrl = list[nextIdx];

    setCustomPhoto(nextUrl);
    onSelectBg?.(nextUrl);

    try {
      localStorage.setItem(`weather:custom-bg:${w.place.name.toLowerCase().trim()}`, nextUrl);
    } catch {}
  };

  const isCustomActive = Boolean(customPhoto);
  const activeHeroBg = customPhoto || heroBg;
  const isImageBg = activeHeroBg.startsWith("http") || activeHeroBg.startsWith("data:") || activeHeroBg.startsWith("/backgrounds");

  const bgStyle = isImageBg
    ? { backgroundImage: `url(${activeHeroBg})` }
    : { background: activeHeroBg };

  return (
    <div className="space-y-4">
      {/* 1. SEVERE ADVISORY TICKER */}
      <section className="w-full">
        {disasters.length > 0 ? (
          <div
            className={`relative overflow-hidden rounded-xl border backdrop-blur-md shadow-xs transition-colors duration-300 ${
              hasDisaster
                ? "border-red-500/40 bg-red-500/15 text-red-900 dark:text-red-200"
                : "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200"
            }`}
          >
            <div className="flex items-center px-3 py-2 text-xs">
              <span className="shrink-0 flex items-center gap-1.5 font-bold uppercase tracking-wider mr-3 select-none text-[11px]">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      hasDisaster ? "bg-red-500" : "bg-amber-500"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      hasDisaster ? "bg-red-600" : "bg-amber-600"
                    }`}
                  />
                </span>
                {hasDisaster ? t("alert_hazard", "ALERT") : t("alert_advisory", "ADVISORY")}
              </span>

              <div className="relative overflow-hidden flex-1 group">
                <div
                  className="flex items-center gap-8 whitespace-nowrap will-change-transform group-hover:[animation-play-state:paused]"
                  style={{
                    animation: `marquee ${Math.max(25, disasters.length * 15)}s linear infinite`,
                  }}
                >
                  {disasters.map((item, idx) => {
                    const tagKey = item.tagKey || TAG_TRANSLATION_MAP[item.tag] || "";
                    const localizedTag = tagKey ? t(tagKey, item.tag) : item.tag;

                    return (
                      <span key={`${item.id}-${idx}`} className="inline-flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                            item.severity === "disaster"
                              ? "bg-red-600 text-white"
                              : "bg-amber-600 text-white"
                          }`}
                        >
                          {localizedTag}
                        </span>
                        <span className="font-medium text-[11px] sm:text-xs">{item.text}</span>
                        <span className="opacity-40 select-none">•</span>
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
        {/* Soft, light gradient overlay: preserves vivid artwork colors while ensuring text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full flex-1">
          {/* Top row: City, Country, Badges & Actions */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-white">
                  {w.place.name}
                </h2>
                <button
                  type="button"
                  onClick={onToggleFav}
                  title={isFav ? t("remove_fav", "Remove favorite") : t("add_fav", "Add favorite")}
                  className="text-lg transition hover:scale-110 active:scale-95 cursor-pointer drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                >
                  {isFav ? "⭐" : "☆"}
                </button>
              </div>
              <p className="text-xs text-white font-medium tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                {w.place.country}
              </p>

              {/* Status / Art badge */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {isCustomActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600/90 backdrop-blur-md text-white border border-emerald-400/40 shadow-xs">
                    🖼️ {t("gallery_active_badge", "Active Art")}
                  </span>
                ) : isGenerating ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 backdrop-blur-md text-white border border-white/20 shadow-xs">
                    <span className="animate-spin text-[10px]">✨</span>
                    {t("matching_art", "Matching art…")}
                  </span>
                ) : isAiGenerated ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-600/90 backdrop-blur-md text-white border border-amber-300/40 shadow-xs">
                    ✨ {t("ai_scene", "AI Watercolor")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 backdrop-blur-md text-white border border-white/20 shadow-xs">
                    🎨 {t("vibrant_atmosphere", "Vibrant atmosphere")}
                  </span>
                )}
              </div>
            </div>

            {/* Top Right: Split Art & Next-Flip Pill + Refresh */}
            <div className="flex items-center gap-1.5">
              {onOpenGallery && (
                <div className="inline-flex items-center rounded-full bg-black/35 hover:bg-black/50 backdrop-blur-md text-white text-xs font-medium border border-white/25 shadow-sm transition overflow-hidden">
                  <button
                    type="button"
                    onClick={onOpenGallery}
                    title={t("gallery_title", "Art Gallery")}
                    className="px-2.5 py-1 flex items-center gap-1 hover:bg-white/10 active:scale-95 transition cursor-pointer"
                  >
                    <span>🎨</span>
                    <span className="hidden sm:inline">{t("art", "Art")}</span>
                  </button>
                  <div className="w-[1px] h-3.5 bg-white/25" />
                  <button
                    type="button"
                    onClick={handleNextArt}
                    title={t("next_art", "Next Artwork (Click to flip)")}
                    className="px-2 py-1 flex items-center justify-center hover:bg-white/10 active:scale-95 transition text-white/95 cursor-pointer font-bold"
                  >
                    <span>❯</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                title={t("refresh", "Refresh forecast")}
                className="p-1.5 rounded-full bg-black/35 hover:bg-black/50 backdrop-blur-md text-white transition border border-white/20 disabled:opacity-50 cursor-pointer shadow-sm"
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
                <span className="text-5xl font-extrabold tracking-tighter text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.85)]">
                  {Math.round(w.current.temp)}
                </span>
                <span className="text-2xl font-light ml-0.5 text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                  {tempSymbol}
                </span>
              </div>

              <div className="text-xs text-white font-medium mt-1 flex items-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
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
                className="h-16 w-16 drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]"
              />
              <span className="text-[10px] text-white font-mono mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                {formatTimeAgo(w.fetchedAt, t as any)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WHAT TO WEAR ADVICE */}
      <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs text-card-foreground">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
            <span>👕</span>
            <span>{t("what_to_wear", "What to Wear")}</span>
          </h3>

          <div className="flex items-center gap-1 text-[11px] bg-muted/60 p-0.5 rounded-lg border border-border/40">
            {(["casual", "business", "sport"] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setWearStyle(style)}
                className={`px-2 py-0.5 rounded-md capitalize transition cursor-pointer ${
                  wearStyle === style
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`style_${style}`, style)}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-foreground/90 leading-relaxed">
          {isFreezing
            ? t("wear_heavy_coat", "Heavy thermal coat, insulated scarf, and gloves recommended.")
            : tempC <= 14
            ? t("wear_jacket", "A warm jacket, cozy knitwear, or windbreaker is ideal.")
            : isWarm
            ? t("wear_light", "Lightweight breathable fabrics, sunglasses, and sun protection.")
            : t("wear_mild", "Comfortable layers, long sleeves, or a casual light cardigan.")}
          {isRainy ? ` ${t("wear_umbrella", "Carry a sturdy umbrella or waterproof shell.")}` : ""}
        </p>
      </section>

      {/* 4. HOURLY FORECAST */}
      <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs text-card-foreground">
        <h3 className="font-semibold text-xs mb-3 flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
          <span>🕒</span>
          <span>{t("hourly_forecast", "Hourly Forecast")}</span>
        </h3>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {w.hourly?.slice(0, 12).map((item, idx) => {
            const date = new Date(item.time);
            const hourStr = idx === 0 ? t("now", "Now") : date.toLocaleTimeString(i18n.language || "en", { hour: "numeric" });
            const itemDesc = getConditionLabel(item.code, t as any);

            return (
              <div
                key={idx}
                className="flex flex-col items-center justify-between min-w-[70px] p-2 rounded-xl bg-muted/30 border border-border/40 text-center shrink-0"
              >
                <span className="text-[11px] font-medium text-muted-foreground">{hourStr}</span>
                <WeatherIcon
                  wmoCode={item.code}
                  isDay={item.is_day ?? 1}
                  className="h-8 w-8 my-1 drop-shadow-xs"
                />
                <span className="text-xs font-bold text-foreground">{Math.round(item.temp)}°</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[65px]">
                  {itemDesc}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. 7-DAY FORECAST */}
      <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs text-card-foreground">
        <h3 className="font-semibold text-xs mb-3 flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
          <span>📅</span>
          <span>{t("daily_forecast", "7-Day Forecast")}</span>
        </h3>

        <div className="space-y-2">
          {w.daily?.map((d, idx) => {
            const date = new Date(d.date);
            const dayName =
              idx === 0
                ? t("today", "Today")
                : date.toLocaleDateString(i18n.language || "en", { weekday: "short" });
            const dayDesc = getConditionLabel(d.code, t as any);

            return (
              <div
                key={idx}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/40 transition text-xs border-b last:border-b-0 border-border/30"
              >
                <div className="w-16 font-medium text-foreground">{dayName}</div>
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <WeatherIcon wmoCode={d.code} isDay={1} className="h-6 w-6 drop-shadow-xs" />
                  <span className="text-muted-foreground text-[11px] hidden sm:inline truncate max-w-[120px]">
                    {dayDesc}
                  </span>
                </div>
                <div className="w-20 text-right font-medium">
                  <span className="font-bold text-foreground">{Math.round(d.max)}°</span>{" "}
                  <span className="text-muted-foreground">{Math.round(d.min)}°</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. KEY METRICS GRID */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Humidity */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <span>💧</span> {t("humidity", "Humidity")}
          </div>
          <div className="text-lg font-bold mt-1 text-foreground">
            {w.current.humidity != null ? `${w.current.humidity}%` : "--"}
          </div>
        </div>

        {/* Wind */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <span>💨</span> {t("wind", "Wind")}
          </div>
          <div className="text-lg font-bold mt-1 text-foreground">
            {Math.round(w.current.windSpeed)} <span className="text-xs font-normal">{windUnit}</span>
          </div>
        </div>

        {/* UV Index */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <span>☀️</span> {t("uv_index", "UV Index")}
          </div>
          <div className="text-lg font-bold mt-1 text-foreground">
            {w.current.uv != null ? Math.round(w.current.uv) : "--"}
            {w.current.uv != null && (
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({getUvLabel(w.current.uv, t as any)})
              </span>
            )}
          </div>
        </div>

        {/* Air Quality (AQI) */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <span>🍃</span> {t("aqi", "Air Quality")}
          </div>
          <div className="text-lg font-bold mt-1 text-foreground">
            {w.current.aqi != null ? Math.round(w.current.aqi) : "--"}
            {w.current.aqi != null && (
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({getAqiLabel(w.current.aqi, t as any)})
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
