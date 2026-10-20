// src/components/WeatherView.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { describe, uvCategory, aqiCategory, type Weather } from "@/lib/weather";
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

interface WeatherViewProps {
  w: Weather;
  disasters?: TickerAlertItem[];
  refreshing: boolean;
  isFav: boolean;
  onToggleFav: () => void;
  onRefresh: () => void;
  onOpenGallery?: () => void;
}

export function WeatherView({
  w,
  disasters = [],
  refreshing,
  isFav,
  onToggleFav,
  onRefresh,
  onOpenGallery,
}: WeatherViewProps) {
  const { t } = useTranslation();
  const d = describe(w.current.code);
  const currentInfo = wmoToIconCode(w.current.code, w.current.is_day ?? 1, w.place.name, w.current.aqi);
  const windUnit = w.unit === "imperial" ? "mph" : "km/h";
  const precipUnit = w.unit === "imperial" ? "in" : "mm";
  const tempSymbol = w.unit === "imperial" ? "°F" : "°C";

  // Instant weather gradient fallback ensures hero is never pitch black
  const [heroBg, setHeroBg] = useState<string>(() => getInstantBackground(w.current.code));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [wearStyle, setWearStyle] = useState<"casual" | "business" | "sport">("casual");

  // Custom photo & AI background state
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);

  const tempC = w.unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  const isRainy = w.current.code >= 51 && w.current.code <= 82;
  const isFreezing = tempC <= 5;
  const isWarm = tempC >= 22;

  const hasDisaster = disasters?.some((alert) => alert.severity === "disaster");

  // Load custom photo for current city
  useEffect(() => {
    if (!w?.place?.name) return;
    try {
      const saved = localStorage.getItem(`weather:custom-bg:${w.place.name.toLowerCase().trim()}`);
      setCustomPhoto(saved || null);
    } catch {
      setCustomPhoto(null);
    }
  }, [w?.place?.name]);

  // Fetch / stream city watercolor background
  useEffect(() => {
    if (!w?.place?.name) return;

    try {
      const saved = localStorage.getItem(`weather:custom-bg:${w.place.name.toLowerCase().trim()}`);
      if (saved) {
        setCustomPhoto(saved);
        return;
      }
    } catch {}

    setHeroBg(getInstantBackground(w.current.code));
    setCustomPhoto(null);
    setIsGenerating(true);

    getCityWeatherBackground(
      w.place.name,
      currentInfo.desc,
      w.current.code,
      w.current.temp,
      (loadedUrl) => {
        setHeroBg(loadedUrl);
        setIsAiGenerated(true);
      },
      w.place.country,
      w.place.lat,
      w.place.lon
    )
      .then((art) => {
        setHeroBg(art.initialBg);
        setIsAiGenerated(art.isAi);
      })
      .catch(() => {
        setHeroBg(getInstantBackground(w.current.code));
        setIsAiGenerated(false);
      })
      .finally(() => setIsGenerating(false));
  }, [w?.place?.name, w?.current?.code]);

  // Determine if an hourly timestamp is daytime using sunrise/sunset
  const isHourDaytime = (timeIso: string): number => {
    if (!w?.sun?.sunrise || !w?.sun?.sunset) return 1;
    const hourStr = timeIso.slice(11, 16);
    return hourStr >= w.sun.sunrise && hourStr < w.sun.sunset ? 1 : 0;
  };

  // What to Wear Advice based on style and weather
  let tailoredAdvice =
    "Comfortable light layers, cotton tee, breathable pants, and easy-walking sneakers.";

  if (wearStyle === "casual") {
    if (isFreezing) {
      tailoredAdvice =
        "Heavy winter coat, fleece-lined sweater, thermal socks, warm boots, and a snug beanie.";
    } else if (isWarm) {
      tailoredAdvice =
        "Breathable cotton or linen shirt, light shorts or chinos, sunglasses, and comfortable sneakers." +
        (isRainy ? " Keep a compact umbrella handy." : "");
    } else {
      tailoredAdvice =
        "Layered light sweater or casual jacket, classic jeans, and weather-ready sneakers.";
    }
  } else if (wearStyle === "business") {
    if (isFreezing) {
      tailoredAdvice =
        "Tailored wool overcoat, cashmere scarf, structured suit or blazer, and weather-treated dress shoes.";
    } else if (isWarm) {
      tailoredAdvice =
        "Lightweight wool or linen-blend suit, crisp short-sleeve or rolled-sleeve dress shirt, and loafers." +
        (isRainy ? " Bring an umbrella." : "");
    } else {
      tailoredAdvice =
        "Structured blazer, knit crewneck or collared shirt, tailored trousers, and leather oxfords." +
        (isRainy ? " Bring an umbrella." : "");
    }
  } else if (wearStyle === "sport") {
    if (isFreezing) {
      tailoredAdvice =
        "Thermal compression base layer, fleece-lined running tights, windbreaker jacket, and running gloves.";
    } else if (isWarm) {
      tailoredAdvice =
        "Sweat-wicking technical tee or tank, running shorts, anti-blister socks, and UV-blocking sports sunglasses." +
        (isRainy ? " Wear water-resistant trail running shoes." : "");
    } else {
      tailoredAdvice =
        "Breathable long-sleeve performance top, athletic joggers or leggings, and cushioned running shoes.";
    }
  }

  // Hero background styling (always populated with photo or atmospheric gradient)
  const activeBg = customPhoto || heroBg || getInstantBackground(w.current.code);
  const isGradient = activeBg.startsWith("linear-gradient");
  const bgStyle = {
    backgroundImage: isGradient ? activeBg : `url("${activeBg}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  // Hourly forecast starting from current hour
  const now = new Date();
  const currentHour = now.getHours();
  const currentHourIndex = w.hourly.findIndex((h) => {
    const hDate = new Date(h.time);
    return hDate.getHours() >= currentHour;
  });
  const hourlyStartIndex = currentHourIndex >= 0 ? currentHourIndex : 0;
  const displayHours = w.hourly.slice(hourlyStartIndex, hourlyStartIndex + 24);

  return (
    <>
      {/* 1. DISASTER / WEATHER ALERTS TICKER OR ALL CLEAR BANNER */}
      {disasters && disasters.length > 0 ? (
        <section className="mt-3">
          <div
            className={`flex items-center overflow-hidden rounded-xl border text-xs shadow-xs ${
              hasDisaster
                ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
            }`}
          >
            <div className="flex shrink-0 items-center gap-1.5 px-3 py-2 font-bold uppercase tracking-wider text-[11px] border-r border-border/50 bg-background/50">
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    hasDisaster ? "bg-red-400" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    hasDisaster ? "bg-red-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <span>{hasDisaster ? "Emergency Alert" : "Advisories"}</span>
            </div>

            <div className="relative flex-1 overflow-hidden whitespace-nowrap py-2 group">
              <div className="flex w-max animate-ticker items-center group-hover:[animation-play-state:paused]">
                {disasters.concat(disasters).map((alert, idx) => (
                  <span key={idx} className="inline-flex items-center gap-2 px-4 font-medium">
                    <span className="text-sm">{alert.icon}</span>
                    <span className="font-semibold underline decoration-dotted">{alert.tag}:</span>
                    <span>{alert.text}</span>
                    <span className="mx-2 text-muted-foreground/60">•</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-3">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 shadow-xs">
            <span className="text-base">🛡️</span>
            <span className="font-bold uppercase tracking-wider text-[11px]">
              {t("all_clear", "ALL CLEAR")}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="truncate">No active severe weather or disaster alerts for this area.</span>
          </div>
        </section>
      )}

      {/* 2. HERO WEATHER CARD */}
      <section
        style={bgStyle}
        className="relative mt-4 overflow-hidden rounded-2xl bg-slate-900 min-h-[190px] border border-white/10 shadow-lg text-white transition-all duration-700"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/25 z-0" />

        <div className="relative z-10 p-5 flex flex-col justify-between min-h-[190px]">
          {/* Top row: City Name, Favorite, AI Gallery shortcut */}
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
                  className="text-lg transition-transform hover:scale-110 active:scale-95"
                >
                  {isFav ? "⭐" : "☆"}
                </button>

                {/* AI Gallery Shortcut Button */}
                {onOpenGallery && (
                  <button
                    type="button"
                    onClick={onOpenGallery}
                    className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md hover:bg-white/20 transition-all active:scale-95 shadow-xs"
                    title="Open AI Gallery"
                  >
                    <span>✨</span>
                    <span>AI Art</span>
                  </button>
                )}
              </div>

              <p className="text-xs text-white/80 drop-shadow-sm flex items-center gap-1.5 mt-0.5">
                <span>{currentInfo.desc}</span>
                <span>•</span>
                <span>Feels like {w.current.feelsLike}°{tempSymbol}</span>
              </p>
            </div>

            {/* Refresh Pill */}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 rounded-full border border-white/20 bg-black/30 backdrop-blur-md px-2.5 py-1 text-xs text-white/90 hover:bg-white/10 transition-colors"
              title="Refresh forecast"
            >
              <span className={`text-xs ${refreshing ? "animate-spin" : ""}`}>↻</span>
              <span className="text-[10px]">{formatTimeAgo(w.fetchedAt)}</span>
            </button>
          </div>

          {/* Bottom row: Big Temperature, High/Low, and Icon */}
          <div className="mt-6 flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black tracking-tighter text-white drop-shadow-lg">
                {w.current.temp}°
              </span>
              <div className="text-xs text-white/80 font-medium">
                <div>H: {w.today.maxTemp}°</div>
                <div>L: {w.today.minTemp}°</div>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="relative">
                <WeatherIcon
                  code={w.current.code}
                  isDay={w.current.is_day ?? 1}
                  className="h-16 w-16 drop-shadow-md"
                />
              </div>

              {/* Status Badge */}
              <div className="mt-1 flex items-center gap-1 text-[10px] text-white/80">
                {isGenerating ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5 border border-white/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    Matching art…
                  </span>
                ) : customPhoto ? (
                  <button
                    type="button"
                    onClick={onOpenGallery}
                    className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5 border border-white/15 hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    <span>📷</span>
                    <span>Custom background</span>
                  </button>
                ) : isAiGenerated ? (
                  <button
                    type="button"
                    onClick={onOpenGallery}
                    className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5 border border-white/15 hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    <span>✨</span>
                    <span>AI vibrant watercolor</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenGallery}
                    className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5 border border-white/10 hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    <span>🎨</span>
                    <span>Vibrant atmosphere</span>
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
              <h3 className="font-semibold text-sm leading-none">{t("what_to_wear", "What to Wear")}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Tailored for {currentInfo.desc.toLowerCase()} & {w.current.temp}°{tempSymbol}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            {(["casual", "business", "sport"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setWearStyle(mode)}
                className={`rounded-md px-2.5 py-1 capitalize font-medium transition-colors ${
                  wearStyle === mode
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode}
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
            <span>Wind</span>
            <span>💨</span>
          </div>
          <div className="mt-1 text-lg font-bold">
            {w.current.windSpeed} <span className="text-xs font-normal text-muted-foreground">{windUnit}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">{w.current.windDirection}° direction</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>Humidity</span>
            <span>💧</span>
          </div>
          <div className="mt-1 text-lg font-bold">{w.current.humidity}%</div>
          <div className="text-[10px] text-muted-foreground">Dew point comfortable</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>UV Index</span>
            <span>☀️</span>
          </div>
          <div className="mt-1 text-lg font-bold">{w.current.uvIndex ?? "—"}</div>
          <div className="text-[10px] text-muted-foreground">{uvCategory(w.current.uvIndex ?? 0)}</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>Air Quality</span>
            <span>🍃</span>
          </div>
          <div className="mt-1 text-lg font-bold">{w.current.aqi ?? "—"}</div>
          <div className="text-[10px] text-muted-foreground">{aqiCategory(w.current.aqi ?? 0).label}</div>
        </div>
      </section>

      {/* 5. HOURLY FORECAST (24 HOURS) */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground mb-3">
          24-Hour Forecast
        </h3>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {displayHours.map((h, i) => {
            const isDayForHour = isHourDaytime(h.time);
            return (
              <div
                key={i}
                className="flex flex-col items-center justify-between min-w-[72px] shrink-0 rounded-xl border border-border/60 bg-muted/20 p-2.5 text-center"
              >
                <span className="text-[11px] font-medium text-muted-foreground">
                  {i === 0 ? "Now" : h.time.slice(11, 16)}
                </span>
                <WeatherIcon
                  code={h.code}
                  isDay={isDayForHour}
                  className="my-1.5 h-7 w-7"
                />
                <span className="text-sm font-bold">{h.temp}°</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 max-w-[65px] leading-tight">
                  {describe(h.code)}
                </span>
                {h.precipProb > 0 && (
                  <span className="mt-1 text-[9px] font-medium text-blue-500">
                    {h.precipProb}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. 7-DAY EXTENDED FORECAST */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground mb-3">
          7-Day Forecast
        </h3>

        <div className="divide-y divide-border/60">
          {w.daily.map((day, i) => {
            const dObj = new Date(day.date + "T12:00:00");
            const dayName = i === 0 ? "Today" : dObj.toLocaleDateString(undefined, { weekday: "short" });

            return (
              <div key={day.date} className="flex items-center justify-between py-2.5 text-xs">
                <span className="w-14 font-medium">{dayName}</span>

                <div className="flex items-center gap-2 flex-1 px-2">
                  <WeatherIcon code={day.code} isDay={1} className="h-5 w-5 shrink-0" />
                  <span className="text-muted-foreground truncate">{describe(day.code)}</span>
                </div>

                <div className="flex items-center gap-3">
                  {day.precipProb > 0 && (
                    <span className="text-[10px] font-medium text-blue-500 w-8 text-right">
                      {day.precipProb}%
                    </span>
                  )}
                  <span className="font-bold w-7 text-right">{day.maxTemp}°</span>
                  <span className="text-muted-foreground w-7 text-right">{day.minTemp}°</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Attribution footer */}
      <footer className="mt-6 text-center text-[11px] text-muted-foreground/70 pb-4">
        Weather data by Open-Meteo • Curated AI Watercolor Backgrounds
      </footer>
    </>
  );
}
