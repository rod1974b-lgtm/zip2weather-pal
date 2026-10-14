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

function formatTimeAgo(timestamp?: number): string {
  if (!timestamp || isNaN(timestamp)) return "Just now";
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
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

  // Curated AI Watercolor Background Effect with Landmark Priority
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
              <span>{formatTimeAgo(w.fetchedAt)}</span>
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
            <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-slate-200 backdrop-blur-md border border-white/10">
              <span>Vibrant atmosphere</span>
            </div>
          )}
        </div>
      </section>

      {/* 2. WHAT TO WEAR (COMPETITIVE ADVANTAGE #2) */}
      <section className="mt-4 rounded-xl border border-primary/20 bg-gradient-to-br from-card via-card to-accent/30 p-4 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">👔</span>
            <h3 className="font-semibold">{t("what_to_wear")}</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Live weather advice
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5 text-xs">
            {(["casual", "business", "sport"] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setWearStyle(style)}
                className={`rounded-md px-2 py-1 font-medium capitalize transition-all ${
                  wearStyle === style
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <span className="text-2xl mt-0.5">
            {wearStyle === "casual" ? "👕" : wearStyle === "business" ? "💼" : "🏃"}
          </span>
          <div className="flex-1 text-sm leading-relaxed">
            <p className="font-medium text-foreground">{tailoredAdvice}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              💡 <span className="font-medium">{t("best_time")}:</span>{" "}
              {tempC >= 28
                ? "Early morning before 09:30 or after 17:30 to avoid intense tropical heat and sun exposure."
                : tempC <= 10
                ? "Midday between 11:30 and 15:00 when ambient sunshine and temperatures peak."
                : "Great outdoor conditions throughout the day; keep water handy."}
            </p>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              const text = `Weather in ${w.place.name}: ${Math.round(w.current.temp)}${tempSymbol}, ${d.label}. Recommendation: ${tailoredAdvice}`;
              if (navigator.share) {
                navigator.share({ title: "My Weather Pal Style Advice", text }).catch(() => {});
              } else {
                navigator.clipboard.writeText(text);
              }
            }}
            className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>📤</span> Share advice
          </button>
        </div>
      </section>

      {/* 3. WEATHER ALERTS & DISASTERS TICKER */}
      <section className="mt-4">
        {hasDisaster || hasWarning || hasCaution ? (
          <div className="overflow-hidden rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-card-foreground">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-destructive">
                {t("alerts")} & Natural Disasters
              </span>
            </div>
            <div className="divide-y divide-border/60">
              {disasters
                .filter((d) => d.severity !== "clear")
                .map((a, i) => (
                  <div key={i} className="py-2 first:pt-0 last:pb-0 flex items-start gap-2.5">
                    <span className="text-lg">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold tracking-wide uppercase text-foreground">
                        {a.tag}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">
                        {a.text}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-card-foreground flex items-center gap-2.5">
            <span className="text-xl">🛡️</span>
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                {t("all_clear")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                No active meteorological, seismic, or hydrological disaster emergencies reported for this area.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 4. KEY METRICS */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3 text-card-foreground">
          <p className="text-xs text-muted-foreground">{t("humidity")}</p>
          <p className="mt-1 text-lg font-semibold">{w.current.humidity}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-card-foreground">
          <p className="text-xs text-muted-foreground">{t("wind")}</p>
          <p className="mt-1 text-lg font-semibold">
            {Math.round(w.current.wind)} {windUnit}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-card-foreground">
          <p className="text-xs text-muted-foreground">{t("uv")}</p>
          <p className="mt-1 text-lg font-semibold">
            {w.current.uvIndex ?? 0}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({uvCategory(w.current.uvIndex ?? 0).label})
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-card-foreground">
          <p className="text-xs text-muted-foreground">{t("air_quality")}</p>
          <p className="mt-1 text-lg font-semibold">
            {w.current.aqi !== undefined ? (
              <>
                {w.current.aqi}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({aqiInfo?.label ?? "Good"})
                </span>
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-card-foreground">
          <p className="text-xs text-muted-foreground">{t("precipitation")}</p>
          <p className="mt-1 text-lg font-semibold">
            {w.current.precipitation} {precipUnit}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-card-foreground">
          <p className="text-xs text-muted-foreground">{t("sunrise")}</p>
          <p className="mt-1 text-lg font-semibold">
            {w.sun?.sunrise ? w.sun.sunrise.slice(11, 16) : "06:00"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-card-foreground">
          <p className="text-xs text-muted-foreground">{t("sunset")}</p>
          <p className="mt-1 text-lg font-semibold">
            {w.sun?.sunset ? w.sun.sunset.slice(11, 16) : "18:30"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-card-foreground">
          <p className="text-xs text-muted-foreground">Atmosphere</p>
          <p className="mt-1 text-lg font-semibold">Stable</p>
        </div>
      </section>

      {/* 5. HOURLY FORECAST */}
      <section className="mt-4 rounded-xl border border-border bg-card p-4 text-card-foreground">
        <h3 className="font-semibold">{t("today")}</h3>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {w.hourly.slice(0, 12).map((h, i) => {
            const hDesc = describe(h.code);
            return (
              <div
                key={i}
                className="flex w-[72px] shrink-0 flex-col items-center rounded-lg bg-muted/50 p-2 text-center"
              >
                <span className="text-xs text-muted-foreground">
                  {h.time.slice(11, 16)}
                </span>
                <span className="my-1 text-2xl">{hDesc.icon}</span>
                <span className="text-xs font-semibold">
                  {Math.round(h.temp)}{tempSymbol}
                </span>
                <span className="mt-1 text-[10px] text-muted-foreground line-clamp-2 break-words leading-tight">
                  {hDesc.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. 7-DAY FORECAST */}
      <section className="mt-4 rounded-xl border border-border bg-card p-4 text-card-foreground">
        <h3 className="font-semibold">{t("seven_day")}</h3>
        <div className="mt-3 divide-y divide-border">
          {w.daily.map((dItem, i) => {
            const dayDesc = describe(dItem.code);
            const dayLabel =
              i === 0
                ? "Today"
                : new Date(dItem.date + "T12:00:00").toLocaleDateString(undefined, {
                    weekday: "short",
                  });

            return (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="w-16 font-medium">{dayLabel}</span>
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <span>{dayDesc.icon}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {dayDesc.label}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold">
                    {Math.round(dItem.max)}{tempSymbol}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(dItem.min)}{tempSymbol}
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
