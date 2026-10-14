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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [wearStyle, setWearStyle] = useState<"casual" | "business" | "sport">("casual");
  const baseAdvice = getClothingAdvice(w);
  const aqiInfo = w.current.aqi !== undefined ? aqiCategory(w.current.aqi) : null;

  const tempC = w.unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  const isRainy = w.current.code >= 51 && w.current.code <= 82;
  const isFreezing = tempC <= 5;
  const isWarm = tempC >= 22;

  // Curated AI Watercolor Background Effect with Verified Preloading
  useEffect(() => {
    if (!w?.place?.name) return;
    let active = true;

    setIsGenerating(true);

    getCityWeatherBackground(
      w.place.name,
      d.label,
      w.current.code,
      Math.round(tempC),
      (aiUrl) => {
        if (active && aiUrl) {
          setHeroBg(aiUrl);
          setIsAiGenerated(true);
          setIsGenerating(false);
        }
      },
      w.place.country
    )
      .then(({ initialBg, isAi }) => {
        if (!active) return;
        setHeroBg(initialBg);
        setIsAiGenerated(isAi);
        setIsGenerating(false);
      })
      .catch(() => {
        if (active) setIsGenerating(false);
      });

    return () => {
      active = false;
    };
  }, [w.place.name, w.place.country, w.current.code, w.current.temp, w.unit, d.label, tempC]);

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
        "Lightweight linen or breathable cotton dress shirt, tailored chinos, loafers, and sunglasses." +
        (isRainy ? " Keep a compact umbrella handy." : "");
    } else {
      tailoredAdvice =
        "Structured blazer, crisp collared shirt, tailored trousers, and dress shoes." +
        (isRainy ? " Bring an umbrella." : "");
    }
  } else if (wearStyle === "sport") {
    if (isFreezing) {
      tailoredAdvice =
        "Thermal compression base layer, fleece-lined running tights, windbreaker jacket, gloves, and beanie.";
    } else if (isWarm) {
      tailoredAdvice =
        "Breathable moisture-wicking singlet or t-shirt, athletic running shorts, cap, and sports sunglasses.";
    } else {
      tailoredAdvice =
        "Moisture-wicking long sleeve, athletic joggers or training tights, and lightweight running shoes.";
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

  const isGradient = heroBg.startsWith("linear-gradient");
  const bgStyle = heroBg
    ? isGradient
      ? { backgroundImage: heroBg }
      : {
          backgroundImage: `url("${heroBg}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
    : undefined;

  return (
    <>
      {/* 1. HERO CARD WITH VIBRANT WATERCOLOR, SPINNER & BADGE */}
      <section
        className="relative mt-4 overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-all duration-700 bg-slate-900 min-h-[190px]"
        style={bgStyle}
      >
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]" />

        {/* Spinner while loading art */}
        {isGenerating && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md shadow-sm">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Generating vibrant art…</span>
          </div>
        )}

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
              className={`flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 backdrop-blur-md px-2.5 py-1 text-xs text-white hover:bg-black/50 transition-colors ${
                isGenerating ? "mt-7" : ""
              }`}
            >
              <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>🔄</span>
              <span>{formatTimeAgo(w.updatedAt)}</span>
            </button>
          </div>
        </div>

        {/* Badge in bottom right */}
        <div className="absolute bottom-3 right-3 z-20">
          {isAiGenerated ? (
            <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600/80 to-indigo-600/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md shadow-sm border border-purple-400/30">
              <span>✨ AI vibrant watercolor</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-slate-300 backdrop-blur-sm">
              <span>Vibrant atmosphere</span>
            </div>
          )}
        </div>
      </section>

      {/* 2. WHAT TO WEAR — POSITION #2 */}
      <section className="mt-4 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50/40 p-4 shadow-sm dark:border-sky-950/60 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label="Clothing">
              🧥
            </span>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("what_to_wear")}
            </h2>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-white/80 p-0.5 text-xs shadow-sm dark:bg-slate-800">
            {(["casual", "business", "sport"] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setWearStyle(style)}
                className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                  wearStyle === style
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {tailoredAdvice}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-sky-100/80 pt-2.5 text-xs dark:border-slate-800">
          <span className="text-slate-600 dark:text-slate-400 font-medium">
            {outdoorTip}
          </span>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium"
          >
            <span>↗</span>
            <span>Share</span>
          </button>
        </div>
      </section>

      {/* 3. ALERTS & DISASTERS TICKER */}
      {disasters.length > 0 && (
        <section
          aria-label="Active Weather & Disaster Bulletins"
          className={`mt-4 rounded-xl border p-3 ${
            hasDisaster
              ? "border-red-300 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
              : hasWarning
              ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
              : hasCaution
              ? "border-yellow-300 bg-yellow-50 text-yellow-950 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-200"
              : "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wide">
            <span>🚨</span>
            <span>{t("alerts")}</span>
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            {disasters.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span>{item.icon}</span>
                <span>
                  <strong className="mr-1">[{item.tag}]</strong>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. KEY METRICS GRID */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Humidity */}
        <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            💧 {t("humidity")}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            {w.current.humidity}%
          </p>
        </div>

        {/* Wind */}
        <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            💨 {t("wind")}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            {Math.round(w.current.wind)} <span className="text-xs font-normal text-slate-500">{windUnit}</span>
          </p>
        </div>

        {/* UV Index */}
        <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            ☀️ {t("uv")}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            {Math.round(w.current.uvIndex ?? 0)}
            <span className="ml-1 text-xs font-normal text-slate-500">
              ({uvCategory(w.current.uvIndex ?? 0)})
            </span>
          </p>
        </div>

        {/* Air Quality (AQI) */}
        <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            🍃 {t("air_quality")}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            {w.current.aqi ?? "—"}
            {aqiInfo && (
              <span className={`ml-1 text-xs font-normal ${aqiInfo.color}`}>
                ({aqiInfo.label})
              </span>
            )}
          </p>
        </div>

        {/* Precipitation */}
        <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            🌧️ {t("precipitation")}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            {w.current.precip ?? 0} <span className="text-xs font-normal text-slate-500">{precipUnit}</span>
          </p>
        </div>

        {/* Sunrise */}
        <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            🌅 {t("sunrise")}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            {w.sun?.sunrise ? w.sun.sunrise.slice(11, 16) : "—"}
          </p>
        </div>

        {/* Sunset */}
        <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            🌇 {t("sunset")}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            {w.sun?.sunset ? w.sun.sunset.slice(11, 16) : "—"}
          </p>
        </div>

        {/* Pressure */}
        <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            🌡️ Pressure
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            {w.current.pressure ? `${Math.round(w.current.pressure)} hPa` : "—"}
          </p>
        </div>
      </section>

      {/* 5. HOURLY FORECAST */}
      {w.hourly && w.hourly.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {t("today")} (Hourly)
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {w.hourly.slice(0, 24).map((h, i) => {
              const hd = describe(h.code);
              return (
                <div
                  key={i}
                  className="flex min-w-[72px] flex-col items-center justify-between rounded-xl border border-slate-200/70 bg-white/70 p-2.5 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {h.time.slice(11, 16)}
                  </p>
                  <span className="my-1.5 text-2xl" role="img" aria-label={hd.label}>
                    {hd.icon}
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {Math.round(h.temp)}{tempSymbol}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight break-words">
                    {hd.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. 7-DAY FORECAST */}
      {w.daily && w.daily.length > 0 && (
        <section className="mt-6 mb-8">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {t("seven_day")}
          </h2>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/70 bg-white/70 shadow-xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
            {w.daily.map((dItem, i) => {
              const dd = describe(dItem.code);
              const dayLabel =
                i === 0
                  ? t("today")
                  : new Date(dItem.date + "T12:00:00").toLocaleDateString(undefined, {
                      weekday: "short",
                    });

              return (
                <div key={i} className="flex items-center justify-between p-3 text-sm">
                  <div className="flex items-center gap-3 w-28">
                    <span className="text-xl" role="img" aria-label={dd.label}>
                      {dd.icon}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {dayLabel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 flex-1 text-center truncate px-2">
                    {dd.label}
                  </p>

                  <div className="flex items-center gap-2 w-20 justify-end font-semibold">
                    <span className="text-slate-900 dark:text-slate-100">
                      {Math.round(dItem.max)}°
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-xs">
                      {Math.round(dItem.min)}°
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
