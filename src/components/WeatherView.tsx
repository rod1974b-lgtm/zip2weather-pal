// src/components/WeatherView.tsx

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  type Weather,
  describe,
  getClothingAdvice,
  aqiCategory,
  uvCategory,
} from "@/lib/weather";
import { getCityWeatherBackground } from "@/lib/aiWatercolorGenerator";

export interface TickerAlertItem {
  icon: string;
  tag: string;
  text: string;
  severity: "disaster" | "warning" | "caution" | "clear";
}

function formatTimeAgo(timestamp: number): string {
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
  disasters: TickerAlertItem[];
  refreshing: boolean;
  isFav: boolean;
  onToggleFav: () => void;
  onRefresh: () => void;
}

export function WeatherView({
  w,
  disasters,
  refreshing,
  isFav,
  onToggleFav,
  onRefresh,
}: WeatherViewProps) {
  const { t } = useTranslation();
  const d = describe(w.current.code);
  const windUnit = w.unit === "imperial" ? "mph" : "km/h";
  const precipUnit = w.unit === "imperial" ? "in" : "mm";
  const tempSymbol = w.unit === "imperial" ? "°F" : "°C";

  const [heroBg, setHeroBg] = useState<string>("");
  const [wearStyle, setWearStyle] = useState<"casual" | "business" | "sport">("casual");
  const baseAdvice = getClothingAdvice(w);
  const aqiInfo = w.current.aqi !== undefined ? aqiCategory(w.current.aqi) : null;

  const tempC = w.unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  const isRainy = w.current.code >= 51 && w.current.code <= 82;
  const isFreezing = tempC <= 5;
  const isWarm = tempC >= 22;

  // AI Watercolor Background Effect
  useEffect(() => {
    if (!w?.place?.name) return;
    let active = true;

    getCityWeatherBackground(
      w.place.name,
      d.label,
      w.current.code,
      Math.round(tempC),
      (aiUrl) => {
        if (active) setHeroBg(aiUrl);
      }
    ).then((instant) => {
      if (active && instant) setHeroBg(instant);
    });

    return () => {
      active = false;
    };
  }, [w.place.name, w.current.code, w.current.temp, w.unit, d.label, tempC]);

  const hasDisaster = disasters.some((a) => a.severity === "disaster");
  const hasWarning = disasters.some((a) => a.severity === "warning");
  const hasCaution = disasters.some((a) => a.severity === "caution");

  let tailoredAdvice = baseAdvice;
  if (wearStyle === "business") {
    if (isFreezing) {
      tailoredAdvice =
        "Wool overcoat, tailored suit or knit blazer, leather dress shoes, and a scarf." +
        (isRainy ? " Carry a classic dark umbrella." : "");
    } else if (isWarm) {
      tailoredAdvice =
        "Breathable linen shirt or blouse, lightweight slacks or pencil skirt, loafers." +
        (w.current.uvIndex >= 6 ? " Add UV-rated sunglasses." : "");
    } else {
      tailoredAdvice = "Structured blazer, crisp button-down, chinos or tailored trousers, and dress shoes.";
    }
  } else if (wearStyle === "sport") {
    if (isFreezing) {
      tailoredAdvice =
        "Thermal compression base layer, windbreaker running jacket, gloves, and fleece-lined tights." +
        (isRainy ? " Water-repellent trail runners." : "");
    } else if (isWarm) {
      tailoredAdvice =
        "Moisture-wicking mesh tee, lightweight shorts, running cap, and plenty of hydration." +
        (w.current.uvIndex >= 6 ? " Sweatproof sunscreen." : "");
    } else {
      tailoredAdvice = "Breathable athletic layers, moisture-wicking hoodie or track jacket, and supportive trainers.";
    }
  }

  let outdoorTip = `💡 ${t("best_time")}: Mid-afternoon (2–4 PM)`;
  if (tempC >= 32) {
    outdoorTip = `💡 ${t("best_time")}: Early morning (before 9 AM) or evening to avoid peak heat`;
  } else if (isFreezing) {
    outdoorTip = `💡 ${t("best_time")}: Midday (12–2 PM) when temperatures and sun are highest`;
  } else if (isRainy) {
    outdoorTip = `💡 ${t("best_time")}: Check hourly rain radar for momentary clearing windows`;
  }

  function handleShare() {
    const text = `Today in ${w.place.name}: ${Math.round(w.current.temp)}${tempSymbol}, ${d.label}. What to wear (${wearStyle}): ${tailoredAdvice}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: `Weather & Outfit — ${w.place.name}`, text }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert("Outfit recommendation copied to clipboard!");
    }
  }

  return (
    <>
      {/* 1. HERO CARD WITH AI VIBRANT WATERCOLOR */}
      <section
        className="relative mt-4 overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-all duration-700 bg-slate-900 min-h-[190px]"
        style={{
          backgroundImage: heroBg ? `url(${heroBg})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-100 drop-shadow-sm">
                  {w.place.name}
                  {w.place.country ? `, ${w.place.country}` : ""}
                </p>
                <button
                  type="button"
                  onClick={onToggleFav}
                  className="text-base text-yellow-400 hover:scale-110 transition-transform"
                  title={isFav ? "Remove from favorites" : "Save to favorites"}
                  aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
                >
                  {isFav ? "★" : "☆"}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-6xl drop-shadow-md" role="img" aria-label={d.label}>
                  {d.icon}
                </span>
                <div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-6xl font-bold tracking-tight text-white drop-shadow-md">
                      {Math.round(w.current.temp)}
                    </p>
                    <span className="text-2xl font-semibold text-slate-200 drop-shadow-sm">
                      {tempSymbol}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 drop-shadow-sm">
                    {d.label} · {t("feels_like")} {Math.round(w.current.feels)}{tempSymbol}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh forecast"
              aria-label="Refresh forecast"
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 backdrop-blur-md px-2.5 py-1 text-xs text-white hover:bg-black/50 transition-colors"
            >
              <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>🔄</span>
              <span>{refreshing ? "Updating…" : formatTimeAgo(w.fetchedAt)}</span>
            </button>
          </div>
        </div>

        <div className="absolute bottom-2 right-2.5 z-10 text-[10px] font-medium tracking-wide text-white/70 drop-shadow-sm pointer-events-none">
          🎨 AI watercolor
        </div>
      </section>

      {/* 2. WHAT TO WEAR SECTION */}
      <section className="mt-3 rounded-2xl border border-border/80 bg-card p-4 text-card-foreground shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">👕</span>
            <h2 className="text-base font-bold tracking-tight">{t("what_to_wear")}</h2>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-card-foreground hover:bg-accent transition-colors"
            title="Share outfit advice"
          >
            <span>↗</span>
            <span>Share</span>
          </button>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-card-foreground">
          {tailoredAdvice}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWearStyle("casual")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              wearStyle === "casual"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-input bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            Casual
          </button>
          <button
            type="button"
            onClick={() => setWearStyle("business")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              wearStyle === "business"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-input bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            Business
          </button>
          <button
            type="button"
            onClick={() => setWearStyle("sport")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              wearStyle === "sport"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-input bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            Sport
          </button>
        </div>

        <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
          {outdoorTip}
        </div>
      </section>

      {/* 3. ALERTS TICKER / ALL CLEAR BANNER */}
      {!hasDisaster && !hasWarning && !hasCaution ? (
        <div className="mt-3 flex w-full min-h-[56px] flex-wrap items-center overflow-visible rounded-lg bg-green-500 px-3 py-2 text-xs shadow-2xs">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium leading-[18px] text-white break-words whitespace-normal">
              All clear - No severe weather expected in your area today. Enjoy your day!
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`mt-3 overflow-hidden rounded-xl border text-xs shadow-2xs ${
            hasDisaster
              ? "border-red-600/60 bg-red-600/15 text-red-950 dark:text-red-200"
              : hasWarning
              ? "border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-200"
              : "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200"
          }`}
        >
          <div className="flex items-center">
            <div
              className={`flex shrink-0 items-center gap-1.5 border-r px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${
                hasDisaster
                  ? "border-red-600/40 bg-red-600/25 text-red-700 dark:text-red-300"
                  : hasWarning
                  ? "border-red-500/30 bg-red-500/20 text-red-600 dark:text-red-400"
                  : "border-amber-500/30 bg-amber-500/20 text-amber-600 dark:text-amber-400"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    hasDisaster ? "bg-red-500" : hasWarning ? "bg-red-400" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    hasDisaster ? "bg-red-600" : hasWarning ? "bg-red-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <span>{hasDisaster ? "🚨 DISASTERS TICKER" : hasWarning ? "⚠️ ALERTS TICKER" : "⚡ ADVISORY TICKER"}</span>
            </div>

            <div className="relative flex-1 overflow-hidden py-2">
              <div className="weather-ticker-track flex w-max items-center gap-8 whitespace-nowrap hover:[animation-play-state:paused]">
                {disasters.concat(disasters).map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 text-card-foreground">
                    <span className="text-sm">{item.icon}</span>
                    <span className="font-semibold text-foreground">[{item.tag}]:</span>
                    <span className="font-medium">{item.text}</span>
                    <span className="font-light text-muted-foreground/50">✦</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. KEY METRICS */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-border pt-4 sm:grid-cols-5">
        <div className="rounded-lg bg-muted/30 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">{t("humidity")}</span>
          <p className="text-base font-semibold">{w.current.humidity}%</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">{t("wind")}</span>
          <p className="text-base font-semibold">
            {Math.round(w.current.wind)} <span className="text-xs font-normal text-muted-foreground">{windUnit}</span>
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">{t("uv")}</span>
          <p className="text-base font-semibold">
            {w.current.uvIndex}{" "}
            <span className="text-[11px] font-normal text-muted-foreground">({uvCategory(w.current.uvIndex)})</span>
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">{t("air_quality")}</span>
          <p className="text-base font-semibold">
            {w.current.aqi !== undefined ? (
              <>
                {w.current.aqi}{" "}
                <span className={`text-[11px] font-medium ${aqiInfo?.color}`}>({aqiInfo?.label})</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">--</span>
            )}
          </p>
        </div>
        <div className="col-span-2 rounded-lg bg-muted/30 p-2.5 text-center sm:col-span-1">
          <span className="text-xs text-muted-foreground">{t("precipitation")}</span>
          <p className="text-base font-semibold">
            {w.current.precipitation} <span className="text-xs font-normal text-muted-foreground">{precipUnit}</span>
          </p>
        </div>
      </div>

      {/* 5. SUNRISE / SUNSET */}
      {(w.sun.sunrise !== "--:--" || w.sun.sunset !== "--:--") && (
        <div className="mt-3 flex items-center justify-around rounded-lg bg-muted/20 py-2 text-xs text-muted-foreground">
          <span>🌅 {t("sunrise")}: <strong className="text-card-foreground">{w.sun.sunrise}</strong></span>
          <span>🌇 {t("sunset")}: <strong className="text-card-foreground">{w.sun.sunset}</strong></span>
        </div>
      )}

      {/* 6. HOURLY FORECAST (72px cards with wrapping words) */}
      <section className="mt-6">
        <h2 className="mb-2 font-semibold">{t("today")}</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {w.hourly.map((h) => {
            const desc = describe(h.code);
            return (
              <div
                key={h.time}
                className="flex w-[72px] min-w-[72px] flex-shrink-0 min-h-[96px] flex-col items-center justify-between rounded-xl bg-card p-2 text-center text-card-foreground shadow-2xs"
              >
                <p className="text-xs text-muted-foreground">{h.time.slice(11, 16)}</p>
                <p className="my-0.5 text-xl">{desc.icon}</p>
                <div className="flex w-full min-w-0 flex-1 items-center justify-center">
                  <div
                    className="text-[11px] font-medium leading-[13px] text-muted-foreground break-words line-clamp-2 text-center"
                    title={desc.label}
                  >
                    {desc.label}
                  </div>
                </div>
                <p className="font-semibold">{Math.round(h.temp)}°</p>
                {h.precipProb > 0 && (
                  <span className="mt-0.5 block text-[10px] font-medium text-blue-500">
                    💧{h.precipProb}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. 7-DAY FORECAST */}
      <section className="mt-6">
        <h2 className="mb-2 font-semibold">{t("seven_day")}</h2>
        <ul className="divide-y divide-border rounded-lg bg-card text-card-foreground shadow-2xs">
          {w.daily.map((day, i) => {
            const desc = describe(day.code);
            return (
              <li key={day.date} className="flex items-center justify-between gap-2 px-4 py-3">
                <span className="w-20 shrink-0 text-sm font-medium sm:w-24">
                  {i === 0 ? t("today") : new Date(day.date + "T12:00").toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="shrink-0 text-xl" role="img" aria-label={desc.label}>
                    {desc.icon}
                  </span>
                  <span className="truncate text-xs font-normal text-card-foreground sm:text-sm">
                    {desc.label}
                  </span>
                  {day.precipProbMax > 0 && (
                    <span className="shrink-0 text-xs font-medium text-blue-500">
                      💧{day.precipProbMax}%
                    </span>
                  )}
                </div>
                <span className="w-20 shrink-0 text-right text-sm sm:w-24">
                  <span className="font-semibold">{Math.round(day.max)}°</span>{" "}
                  <span className="text-muted-foreground">{Math.round(day.min)}°</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Data by{" "}
        <a className="underline hover:text-foreground" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
          Open-Meteo
        </a>
        ,{" "}
        <a className="underline hover:text-foreground" href="https://earthquake.usgs.gov/" target="_blank" rel="noopener noreferrer">
          USGS
        </a>
        , TMD &{" "}
        <a className="underline hover:text-foreground" href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer">
          NWS
        </a>
      </p>

      <style>{`
        @keyframes weatherTickerAnimation {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .weather-ticker-track {
          animation: weatherTickerAnimation 90s linear infinite;
        }
        .weather-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </>
  );
}
