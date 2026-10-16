// src/components/WeatherView.tsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { describe, uvCategory, aqiCategory, type Weather } from "@/lib/weather";
import {
  getCityWeatherBackground,
  getAllAvailableArtworks,
  saveCustomArtChoice,
} from "@/lib/aiWatercolorGenerator";

export interface TickerAlertItem {
  icon: string;
  tag: string;
  text: string;
  severity: "disaster" | "warning" | "advisory" | string;
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

  // Custom photo & Art switcher states (saved per city)
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [showArtMenu, setShowArtMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const artMenuRef = useRef<HTMLDivElement>(null);

  const tempC = w.unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  const isRainy = w.current.code >= 51 && w.current.code <= 82;
  const isFreezing = tempC <= 5;
  const isWarm = tempC >= 22;

  const hasDisaster = disasters?.some((alert) => alert.severity === "disaster");
  const hasWarning = disasters?.some((alert) => alert.severity === "warning");

  // Load custom photo for current city
  useEffect(() => {
    if (!w?.place?.name) return;
    try {
      const saved = localStorage.getItem(`weather:custom-bg:${w.place.name}`);
      setCustomPhoto(saved || null);
    } catch {
      setCustomPhoto(null);
    }
  }, [w?.place?.name]);

  // Close art menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (artMenuRef.current && !artMenuRef.current.contains(e.target as Node)) {
        setShowArtMenu(false);
      }
    }
    if (showArtMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showArtMenu]);

  // Curated & Dynamic Landmark Scanner Background Effect
  useEffect(() => {
    if (!w?.place?.name) return;
    if (customPhoto) return; // Custom photo takes precedence

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
      w.place.country,
      w.place.lat,
      w.place.lon
    )
      .then(({ initialBg, isAi }) => {
        if (!active) return;
        setHeroBg(initialBg);
        setIsAiGenerated(isAi);
        if (isAi) setIsGenerating(false);
      })
      .catch(() => {
        if (active) setIsGenerating(false);
      });

    return () => {
      active = false;
    };
  }, [w.place.name, w.place.lat, w.place.lon, w.current.code, d.label, tempC, w.place.country, customPhoto]);

  // Handle local image upload with canvas compression
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        try {
          localStorage.setItem(`weather:custom-bg:${w.place.name}`, dataUrl);
        } catch (err) {
          console.warn("Storage quota exceeded, keeping in session only", err);
        }
        setCustomPhoto(dataUrl);
        setShowArtMenu(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // Remove custom photo & restore watercolor
  function handleRemoveCustomPhoto() {
    try {
      localStorage.removeItem(`weather:custom-bg:${w.place.name}`);
    } catch {}
    setCustomPhoto(null);
    setShowArtMenu(false);
  }

  // Cycle to next artwork in the city/weather list
  function handleCycleArtwork() {
    const options = getAllAvailableArtworks(
      w.place.name,
      w.current.code,
      d.label,
      w.place.country
    );

    if (!options.length) return;

    const currentIdx = options.findIndex((url) => heroBg.includes(url));
    const nextIdx = (currentIdx + 1) % options.length;
    const nextUrl = options[nextIdx];

    saveCustomArtChoice(w.place.name, nextUrl);
    setHeroBg(nextUrl);
    setIsAiGenerated(true);
    setIsGenerating(false);
    setShowArtMenu(false);
  }

  // Restore dynamic auto artwork
  function handleAutoArtwork() {
    if (customPhoto) handleRemoveCustomPhoto();
    try {
      localStorage.removeItem(`weather:custom-art:${w.place.name.toLowerCase().trim()}`);
    } catch {}

    setIsGenerating(true);
    getCityWeatherBackground(
      w.place.name,
      d.label,
      w.current.code,
      Math.round(tempC),
      (aiUrl) => {
        if (aiUrl) {
          setHeroBg(aiUrl);
          setIsAiGenerated(true);
          setIsGenerating(false);
        }
      },
      w.place.country,
      w.place.lat,
      w.place.lon
    )
      .then(({ initialBg, isAi }) => {
        setHeroBg(initialBg);
        setIsAiGenerated(isAi);
        setIsGenerating(false);
      })
      .catch(() => setIsGenerating(false));

    setShowArtMenu(false);
  }

  // Tailored clothing advice
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

  // Hero background computation
  const isGradient = heroBg.startsWith("linear-gradient");
  const bgStyle = customPhoto
    ? {
        backgroundImage: `url("${customPhoto}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : heroBg
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
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
        aria-hidden="true"
      />

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
              <span>
                {hasDisaster
                  ? "🚨 DISASTERS TICKER"
                  : hasWarning
                  ? "⚠️ ALERTS TICKER"
                  : "⚡ ADVISORY TICKER"}
              </span>
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
        </section>
      ) : (
        <section className="mt-3">
          <div className="flex w-full min-h-[56px] flex-wrap items-center overflow-visible rounded-xl bg-green-500 px-4 py-3 text-xs shadow-xs">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium leading-[18px] text-white break-words whitespace-normal">
                🛡️ All clear - No severe weather expected in your area today. Enjoy your day!
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. HERO CARD WITH VIBRANT ART, DIRECT ART CONTROLS & SPINNER */}
      <section
        className="relative mt-4 overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-all duration-700 bg-slate-900 min-h-[190px]"
        style={bgStyle}
      >
        <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" />

        {/* Spinner while discovering or downloading art */}
        {!customPhoto && isGenerating && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md shadow-sm">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Scanning landmark art…</span>
          </div>
        )}

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
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

                {/* Direct Art Controls Popover */}
                <div className="relative inline-block" ref={artMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowArtMenu((prev) => !prev)}
                    className="flex items-center gap-1 rounded-full border border-white/25 bg-black/35 backdrop-blur-md px-2 py-0.5 text-[11px] font-medium text-white hover:bg-black/55 transition-colors"
                    title="Change artwork or upload photo"
                    aria-label="Change artwork or upload photo"
                  >
                    <span>🎨</span>
                    <span>Art</span>
                    <span className="text-[9px] opacity-70">▾</span>
                  </button>

                  {showArtMenu && (
                    <div className="absolute left-0 top-full mt-1.5 z-40 w-48 rounded-xl border border-white/20 bg-slate-900/95 backdrop-blur-md p-1.5 text-xs text-white shadow-2xl ring-1 ring-black/20">
                      <button
                        type="button"
                        onClick={handleAutoArtwork}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10 transition-colors"
                      >
                        <span>🎨</span>
                        <span>Auto (Weather & Landmark)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCycleArtwork}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10 transition-colors"
                      >
                        <span>🔁</span>
                        <span>Next artwork</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10 transition-colors"
                      >
                        <span>📷</span>
                        <span>Upload photo</span>
                      </button>

                      {customPhoto && (
                        <button
                          type="button"
                          onClick={handleRemoveCustomPhoto}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-red-300 hover:bg-red-500/20 transition-colors"
                        >
                          <span>🗑️</span>
                          <span>Remove custom photo</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
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
                    {d.label} · {t("feels_like")} {Math.round(w.current.feels)}
                    {tempSymbol}
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
                !customPhoto && isGenerating ? "mt-7" : ""
              }`}
            >
              <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>🔄</span>
              <span>{formatTimeAgo(w.fetchedAt)}</span>
            </button>
          </div>
        </div>

        {/* Badge in bottom right */}
        <div className="absolute bottom-3 right-3 z-20">
          {customPhoto ? (
            <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-emerald-200 backdrop-blur-md border border-emerald-400/30">
              <span>📷 Your photo</span>
            </div>
          ) : isAiGenerated ? (
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

      {/* 3. WHAT TO WEAR SECTION */}
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
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <span className="text-2xl select-none">
            {wearStyle === "casual" ? "👟" : wearStyle === "business" ? "💼" : "🏃"}
          </span>
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-foreground/90 font-medium">{tailoredAdvice}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              💡 {t("best_time")}:{" "}
              {isRainy
                ? "Rain expected today. Indoor spots recommended."
                : tempC > 30
                  ? "Early morning or after 17:00 when temperatures ease."
                  : "Midday to afternoon conditions are great for outdoors."}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end border-t border-border/40 pt-2 text-xs">
          <button
            type="button"
            onClick={() => {
              const text = `Today in ${w.place.name}: ${Math.round(w.current.temp)}${tempSymbol}, ${d.label}. Wear advice: ${tailoredAdvice}`;
              if (navigator.share) {
                navigator.share({ title: "My Weather Pal", text }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(text);
              }
            }}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <span>📤 Share outfit tip</span>
          </button>
        </div>
      </section>

      {/* 4. CURRENT METRICS GRID */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <p className="text-xs text-muted-foreground">{t("humidity")}</p>
          <p className="mt-1 text-lg font-bold">{w.current.humidity}%</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <p className="text-xs text-muted-foreground">{t("wind")}</p>
          <p className="mt-1 text-lg font-bold">
            {Math.round(w.current.wind)} {windUnit}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <p className="text-xs text-muted-foreground">{t("uv")}</p>
          <p className="mt-1 text-lg font-bold">
            {Math.round(w.current.uvIndex ?? 0)}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({uvCategory(w.current.uvIndex ?? 0)})
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <p className="text-xs text-muted-foreground">{t("air_quality")}</p>
          <p className="mt-1 text-lg font-bold">
            {w.current.aqi !== undefined ? (
              <>
                {w.current.aqi}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({aqiCategory(w.current.aqi).label})
                </span>
              </>
            ) : (
              "Good"
            )}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <p className="text-xs text-muted-foreground">{t("precipitation")}</p>
          <p className="mt-1 text-lg font-bold">
            {w.current.precipitation} {precipUnit}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <p className="text-xs text-muted-foreground">{t("sunrise")}</p>
          <p className="mt-1 text-lg font-bold">{w.sun?.sunrise?.slice(11, 16) || "--:--"}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <p className="text-xs text-muted-foreground">{t("sunset")}</p>
          <p className="mt-1 text-lg font-bold">{w.sun?.sunset?.slice(11, 16) || "--:--"}</p>
        </div>
      </section>

      {/* 5. HOURLY FORECAST */}
      <section className="mt-4 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <h3 className="font-semibold text-sm mb-3">{t("today")}</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {w.hourly.slice(0, 24).map((h, i) => {
            const hDesc = describe(h.code);
            return (
              <div
                key={i}
                className="flex w-[72px] shrink-0 flex-col items-center rounded-lg border border-border/40 bg-muted/40 p-2 text-center"
              >
                <span className="text-xs text-muted-foreground">{h.time.slice(11, 16)}</span>
                <span className="my-1 text-xl">{hDesc.icon}</span>
                <span className="text-sm font-bold">
                  {Math.round(h.temp)}
                  {tempSymbol}
                </span>
                <span className="mt-1 text-[10px] text-muted-foreground line-clamp-2 break-words">
                  {hDesc.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. 7-DAY FORECAST */}
      <section className="mt-4 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <h3 className="font-semibold text-sm mb-3">{t("seven_day")}</h3>
        <div className="divide-y divide-border/40">
          {w.daily.map((dItem, i) => {
            const dayDesc = describe(dItem.code);
            const dayName =
              i === 0
                ? "Today"
                : new Date(dItem.date + "T12:00:00").toLocaleDateString(undefined, {
                    weekday: "short",
                  });
            return (
              <div key={dItem.date} className="flex items-center justify-between py-2.5 text-sm">
                <span className="w-16 font-medium">{dayName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{dayDesc.icon}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {dayDesc.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">
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

      {/* Attribution */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Data by{" "}
        <a
          className="underline hover:text-foreground"
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open-Meteo
        </a>
        ,{" "}
        <a
          className="underline hover:text-foreground"
          href="https://earthquake.usgs.gov/"
          target="_blank"
          rel="noopener noreferrer"
        >
          USGS
        </a>
        , TMD &{" "}
        <a
          className="underline hover:text-foreground"
          href="https://www.weather.gov/"
          target="_blank"
          rel="noopener noreferrer"
        >
          NWS
        </a>
      </p>

      {/* 35s ticker animation styling */}
      <style>{`
        @keyframes weatherTickerAnimation {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .weather-ticker-track {
          animation: weatherTickerAnimation 35s linear infinite;
        }
        .weather-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </>
  );
}
