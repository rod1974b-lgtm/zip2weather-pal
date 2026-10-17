// src/components/WeatherView.tsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { describe, uvCategory, aqiCategory, type Weather } from "@/lib/weather";
import {
  getCityWeatherBackground,
  getAllAvailableArtworks,
  saveCustomArtChoice,
} from "@/lib/aiWatercolorGenerator";
import { WeatherIcon, wmoToIconCode } from "@/lib/weatherIcons";

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
  const currentInfo = wmoToIconCode(w.current.code, w.current.is_day ?? 1, w.place.name, w.current.aqi);
  const windUnit = w.unit === "imperial" ? "mph" : "km/h";
  const precipUnit = w.unit === "imperial" ? "in" : "mm";
  const tempSymbol = w.unit === "imperial" ? "°F" : "°C";

  const [heroBg, setHeroBg] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [wearStyle, setWearStyle] = useState<"casual" | "business" | "sport">("casual");

  // Custom photo & Art switcher states
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

    let isMounted = true;
    setIsGenerating(true);

    getCityWeatherBackground(w.place.name, w.current.code, w.current.temp, w.unit, w.place.country)
      .then((art) => {
        if (!isMounted) return;
        setHeroBg(art.imageUrl);
        setIsAiGenerated(art.isAiGenerated);
        setIsGenerating(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [w?.place?.name, w?.current?.code]);

  // Cycle through next artwork
  const handleCycleArtwork = async () => {
    if (!w?.place?.name) return;
    setIsGenerating(true);

    try {
      const available = await getAllAvailableArtworks(
        w.place.name,
        w.current.code,
        w.current.temp,
        w.unit,
        w.place.country
      );

      if (available.length > 0) {
        const currentIndex = available.findIndex((item) => item.imageUrl === heroBg);
        const nextIndex = (currentIndex + 1) % available.length;
        const nextArt = available[nextIndex];

        setHeroBg(nextArt.imageUrl);
        setIsAiGenerated(nextArt.isAiGenerated);
        saveCustomArtChoice(w.place.name, nextArt.imageUrl);
      }
    } catch (err) {
      console.warn("Could not cycle artwork:", err);
    } finally {
      setIsGenerating(false);
      setShowArtMenu(false);
    }
  };

  // Reset to auto artwork
  const handleAutoArtwork = () => {
    setShowArtMenu(false);
    if (!w?.place?.name) return;
    try {
      localStorage.removeItem(`weather:custom-art:${w.place.name}`);
      localStorage.removeItem(`weather:custom-bg:${w.place.name}`);
    } catch {}
    setCustomPhoto(null);
    setIsGenerating(true);
    getCityWeatherBackground(w.place.name, w.current.code, w.current.temp, w.unit, w.place.country)
      .then((art) => {
        setHeroBg(art.imageUrl);
        setIsAiGenerated(art.isAiGenerated);
      })
      .finally(() => setIsGenerating(false));
  };

  // Upload user's custom photo
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !w?.place?.name) return;
    setShowArtMenu(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          try {
            localStorage.setItem(`weather:custom-bg:${w.place.name}`, dataUrl);
            setCustomPhoto(dataUrl);
          } catch (err) {
            console.warn("Storage quota exceeded for custom photo:", err);
          }
        }
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomPhoto = () => {
    setShowArtMenu(false);
    if (!w?.place?.name) return;
    try {
      localStorage.removeItem(`weather:custom-bg:${w.place.name}`);
    } catch {}
    setCustomPhoto(null);
  };

  // Helper: Determine if an hourly timestamp is daytime using sunrise/sunset
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
            <span className="font-bold uppercase tracking-wider text-[11px]">ALL CLEAR</span>
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
          {/* Top row: City Name, Favorite, Art Controls */}
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

                {/* 🎨 Art Dropdown & Split-Pill Next Arrow */}
                <div className="relative" ref={artMenuRef}>
                  <div className="inline-flex items-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md shadow-xs text-xs text-white">
                    <button
                      type="button"
                      onClick={() => setShowArtMenu(!showArtMenu)}
                      className="flex items-center gap-1 px-2.5 py-1 hover:bg-white/10 transition-colors rounded-l-full"
                      title="Art options"
                    >
                      <span>🎨</span>
                      <span className="font-medium text-[11px]">Art</span>
                      <span className="text-[9px] opacity-70">▾</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCycleArtwork}
                      className="px-2 py-1 border-l border-white/20 hover:bg-white/15 transition-colors rounded-r-full font-bold text-xs"
                      title="Next artwork"
                    >
                      →
                    </button>
                  </div>

                  {/* Art Popover Menu */}
                  {showArtMenu && (
                    <div className="absolute left-0 mt-1.5 w-48 rounded-xl border border-white/15 bg-slate-900/95 p-1.5 text-xs text-white shadow-2xl backdrop-blur-xl z-50">
                      <button
                        type="button"
                        onClick={handleAutoArtwork}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10 transition-colors"
                      >
                        <span>✨</span>
                        <span>Auto (Weather match)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCycleArtwork}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10 transition-colors"
                      >
                        <span>🔄</span>
                        <span>Next artwork (→)</span>
                      </button>

                      <div className="my-1 border-t border-white/10" />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
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

              {/* Main Weather Icon + Temp + Condition */}
              <div className="mt-2 flex items-center gap-4">
                <WeatherIcon
                  wmoCode={w.current.code}
                  isDay={w.current.is_day}
                  description={currentInfo.desc}
                  cityName={w.place.name}
                  aqi={w.current.aqi}
                  className="w-16 h-16 sm:w-20 sm:h-20 shrink-0"
                  fallbackEmoji={d.icon}
                />
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
                    {currentInfo.desc} · {t("feels_like")} {Math.round(w.current.feels)}
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
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 backdrop-blur-md px-2.5 py-1 text-xs text-white hover:bg-black/50 transition-colors"
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

          <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/50 p-0.5 text-xs">
            {(["casual", "business", "sport"] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setWearStyle(style)}
                className={`rounded-md px-2.5 py-1 font-medium capitalize transition-colors ${
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

        <p className="mt-3 text-sm leading-relaxed font-medium">{tailoredAdvice}</p>
      </section>

      {/* 4. KEY METRICS GRID */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <span className="text-xs text-muted-foreground">{t("humidity")}</span>
          <p className="mt-1 text-2xl font-bold">{Math.round(w.current.humidity)}%</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <span className="text-xs text-muted-foreground">{t("wind")}</span>
          <p className="mt-1 text-2xl font-bold">
            {Math.round(w.current.wind)} {windUnit}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <span className="text-xs text-muted-foreground">{t("uv")}</span>
          <p className="mt-1 text-2xl font-bold">
            {w.current.uvIndex} <span className="text-xs font-normal">({uvCategory(w.current.uvIndex)})</span>
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <span className="text-xs text-muted-foreground">{t("air_quality")}</span>
          <p className="mt-1 text-2xl font-bold">
            {w.current.aqi !== undefined ? (
              <>
                {w.current.aqi}{" "}
                <span className={`text-xs font-semibold ${aqiCategory(w.current.aqi).color}`}>
                  ({aqiCategory(w.current.aqi).label})
                </span>
              </>
            ) : (
              "--"
            )}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <span className="text-xs text-muted-foreground">{t("precipitation")}</span>
          <p className="mt-1 text-2xl font-bold">
            {w.current.precipitation} {precipUnit}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
          <span className="text-xs text-muted-foreground">{t("sunrise")} / {t("sunset")}</span>
          <p className="mt-1 text-base font-semibold">
            {w.sun?.sunrise || "--:--"} · {w.sun?.sunset || "--:--"}
          </p>
        </div>
      </section>

      {/* 5. HOURLY FORECAST WITH WATERCOLOR ICONS */}
      <section className="mt-4 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <h3 className="font-semibold text-sm mb-3">{t("today")}</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {w.hourly.slice(0, 24).map((h, i) => {
            const hourIsDay = isHourDaytime(h.time);
            const hourInfo = wmoToIconCode(h.code, hourIsDay, w.place.name);
            const hEmoji = describe(h.code).icon;
            return (
              <div
                key={i}
                className="flex w-[74px] shrink-0 flex-col items-center rounded-lg border border-border/40 bg-muted/40 p-2 text-center"
              >
                <span className="text-xs text-muted-foreground">{h.time.slice(11, 16)}</span>
                <div className="my-1 flex h-8 w-8 items-center justify-center">
                  <WeatherIcon
                    wmoCode={h.code}
                    isDay={hourIsDay}
                    description={hourInfo.desc}
                    className="w-8 h-8"
                    fallbackEmoji={hEmoji}
                  />
                </div>
                <span className="text-sm font-bold">
                  {Math.round(h.temp)}
                  {tempSymbol}
                </span>
                <span className="mt-1 text-[10px] text-muted-foreground line-clamp-2 break-words leading-tight">
                  {hourInfo.desc}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. 7-DAY FORECAST WITH WATERCOLOR ICONS */}
      <section className="mt-4 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <h3 className="font-semibold text-sm mb-3">{t("seven_day")}</h3>
        <div className="divide-y divide-border/40">
          {w.daily.map((dItem, i) => {
            const dayInfo = wmoToIconCode(dItem.code, 1, w.place.name);
            const dayEmoji = describe(dItem.code).icon;
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
                  <div className="flex h-7 w-7 items-center justify-center">
                    <WeatherIcon
                      wmoCode={dItem.code}
                      isDay={1}
                      description={dayInfo.desc}
                      className="w-7 h-7"
                      fallbackEmoji={dayEmoji}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {dayInfo.desc}
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
    </>
  );
}
