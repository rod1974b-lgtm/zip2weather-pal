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

  // AI Watercolor Background Effect with Verified Preloading
  useEffect(() => {
    if (!w?.place?.name) return;
    let active = true;

    setIsGenerating(true);
    setIsAiGenerated(false);

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
        if (isAi) {
          setIsGenerating(false);
        }
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
      {/* 1. HERO CARD WITH AI VIBRANT WATERCOLOR, SPINNER & BADGE */}
      <section
        className="relative mt-4 overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-all duration-700 bg-slate-900 min-h-[190px]"
        style={bgStyle}
      >
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]" />

        {/* Spinner while AI generates art */}
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
              <span>{refreshing ? "Updating…" : formatTimeAgo(w.fetchedAt)}</span>
            </button>
          </div>
        </div>

        {/* AI badge - bottom right */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 pointer-events-none">
          {isAiGenerated ? (
            <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md">
              <span>✨</span>
              <span>AI vibrant watercolor</span>
            </div>
          ) : (
            <div className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur-sm">
              Vibrant atmosphere
            </div>
          )}
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
            className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <span>↗</span>
            <span>Share</span>
          </button>
        </div>

        <div className="mt-3 flex gap-1.5">
          {(["casual", "business", "sport"] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setWearStyle(style)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                wearStyle === style
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {style}
            </button>
          ))}
        </div>

        <p className="mt-3 text-sm text-foreground leading-relaxed">{tailoredAdvice}</p>

        <div className="mt-3 rounded-lg border border-amber-200/60 bg-amber-50/70 p-2.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          {outdoorTip}
        </div>
      </section>

      {/* 3. ALERTS TICKER */}
      {disasters.length === 0 ? (
        <section
          aria-label="Disaster & Weather Status"
          className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-emerald-900 dark:text-emerald-200"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              {t("all_clear")}
            </span>
            <span className="text-xs font-medium leading-tight">
              No earthquakes, floods, or weather emergencies detected in this region.
            </span>
          </div>
        </section>
      ) : (
        <section
          aria-label="Active Disaster & Weather Advisories"
          className={`mt-3 overflow-hidden rounded-xl border text-xs shadow-xs ${
            hasDisaster
              ? "border-red-600 bg-red-600/15 text-red-950 dark:text-red-100"
              : hasWarning
              ? "border-amber-500/70 bg-amber-500/15 text-amber-950 dark:text-amber-100"
              : "border-sky-500/60 bg-sky-500/15 text-sky-950 dark:text-sky-100"
          }`}
        >
          <div className="group relative flex items-center overflow-hidden py-2 px-3">
            <div className="z-10 flex shrink-0 items-center gap-1.5 pr-2 font-bold tracking-wider">
              <span className="inline-block h-2 w-2 animate-ping rounded-full bg-red-500" />
              <span>⚠️ {t("alerts")} TICKER</span>
            </div>
            <div className="overflow-hidden whitespace-nowrap mask-gradient flex-1">
              <div className="inline-block animate-[ticker_90s_linear_infinite] group-hover:[animation-play-state:paused]">
                {disasters.map((item, idx) => (
                  <span key={idx} className="mx-4 inline-flex items-center gap-1.5 font-medium">
                    <span>{item.icon}</span>
                    <strong className="font-semibold uppercase tracking-wide">[{item.tag}]:</strong>
                    <span>{item.text}</span>
                    <span className="ml-3 text-muted-foreground/60">•</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. KEY METRICS */}
      <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-card p-3 text-center shadow-xs">
          <p className="text-xs text-muted-foreground">{t("humidity")}</p>
          <p className="mt-1 text-lg font-bold">{w.current.humidity}%</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-3 text-center shadow-xs">
          <p className="text-xs text-muted-foreground">{t("wind")}</p>
          <p className="mt-1 text-lg font-bold">
            {Math.round(w.current.wind)} <span className="text-xs font-normal">{windUnit}</span>
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-3 text-center shadow-xs">
          <p className="text-xs text-muted-foreground">{t("uv")}</p>
          <p className="mt-1 text-lg font-bold">
            {Math.round(w.current.uvIndex ?? 0)}{" "}
            <span className="text-xs font-normal">({uvCategory(w.current.uvIndex ?? 0)})</span>
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-3 text-center shadow-xs">
          <p className="text-xs text-muted-foreground">{t("air_quality")}</p>
          <p className="mt-1 text-lg font-bold">
            {w.current.aqi !== undefined ? (
              <>
                {w.current.aqi}{" "}
                <span className={`text-xs font-normal ${aqiInfo?.color}`}>
                  ({aqiInfo?.label})
                </span>
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
      </section>

      {/* 5. PRECIPITATION & SUNRISE/SUNSET */}
      <section className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/80 bg-card p-3 text-center shadow-xs">
          <p className="text-xs text-muted-foreground">{t("precipitation")}</p>
          <p className="mt-1 text-base font-bold">
            {w.current.precipitation} <span className="text-xs font-normal">{precipUnit}</span>
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-3 text-center shadow-xs">
          <p className="text-xs text-muted-foreground">
            {t("sunrise")} / {t("sunset")}
          </p>
          <p className="mt-1 text-sm font-semibold">
            ☀️ {w.sun?.sunrise || "—"} · 🌙 {w.sun?.sunset || "—"}
          </p>
        </div>
      </section>

      {/* 6. HOURLY FORECAST */}
      <section className="mt-4 rounded-2xl border border-border/80 bg-card p-4 text-card-foreground shadow-sm">
        <h2 className="text-sm font-bold tracking-tight text-foreground">{t("today")}</h2>
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {w.hourly.map((h, i) => {
            const hd = describe(h.code);
            return (
              <div
                key={i}
                className="flex w-[72px] shrink-0 flex-col items-center justify-between rounded-xl bg-accent/40 p-2 text-center"
              >
                <span className="text-xs text-muted-foreground font-medium">{h.time.slice(11, 16)}</span>
                <span className="my-1 text-xl" role="img" aria-label={hd.label}>
                  {hd.icon}
                </span>
                <span className="text-sm font-bold">
                  {Math.round(h.temp)}
                  {tempSymbol}
                </span>
                <span className="mt-1 text-[10px] text-muted-foreground line-clamp-2 break-words leading-tight">
                  {hd.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. 7-DAY FORECAST */}
      <section className="mt-4 rounded-2xl border border-border/80 bg-card p-4 text-card-foreground shadow-sm">
        <h2 className="text-sm font-bold tracking-tight text-foreground">{t("seven_day")}</h2>
        <div className="mt-3 divide-y divide-border/60">
          {w.daily.map((dItem, i) => {
            const dd = describe(dItem.code);
            return (
              <div key={i} className="flex items-center justify-between py-2.5 text-xs">
                <span className="w-16 font-medium text-foreground">
                  {i === 0
                    ? t("today")
                    : new Date(dItem.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg" role="img" aria-label={dd.label}>
                    {dd.icon}
                  </span>
                  <span className="text-muted-foreground">{dd.label}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-foreground">
                    {Math.round(dItem.max)}
                    {tempSymbol}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(dItem.min)}
                    {tempSymbol}
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
