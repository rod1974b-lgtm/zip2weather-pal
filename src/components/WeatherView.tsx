import { useEffect, useState, useRef } from "react";
import type { WeatherData } from "@/lib/weather";
import { describeWeather, uvCategory, aqiCategory } from "@/lib/weather";
import {
  getCityWeatherBackground,
  getAllAvailableArtworks,
  saveCustomArtChoice,
} from "@/lib/aiWatercolorGenerator";
import { WeatherIcon, wmoToIconCode } from "@/lib/weatherIcons";
import { AiCustomSceneDialog } from "@/components/AiCustomSceneDialog";

export interface TickerAlertItem {
  icon: string;
  tag: string;
  text: string;
  severity?: "advisory" | "watch" | "warning" | "disaster";
}

interface WeatherViewProps {
  weather: WeatherData;
  disasters?: TickerAlertItem[];
  selectedUnit: "C" | "F";
  onUnitChange: (unit: "C" | "F") => void;
  favorites: { name: string; lat: number; lon: number; admin1?: string; country?: string }[];
  onSelectFavorite: (fav: { name: string; lat: number; lon: number; admin1?: string; country?: string }) => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  onRefresh: () => void;
  lastUpdatedText: string;
}

export function WeatherView({
  weather: w,
  disasters = [],
  selectedUnit,
  onUnitChange,
  favorites: _favorites,
  onSelectFavorite: _onSelectFavorite,
  onToggleFavorite,
  isFavorite,
  onRefresh,
  lastUpdatedText,
}: WeatherViewProps) {
  const d = describeWeather(w.current.code);
  const currentInfo = wmoToIconCode(w.current.code, w.current.is_day, d.label, w.place.name, w.current.aqi);
  const currentDesc = currentInfo.desc;

  // Curated AI Vibrant Watercolor Background State
  const [heroBg, setHeroBg] = useState<string | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Custom photo & Art switcher states
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [showArtMenu, setShowArtMenu] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const artMenuRef = useRef<HTMLDivElement>(null);

  // Close art menu on outside click
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

  const hasDisaster = disasters?.some((alert) => alert.severity === "disaster");

  // Load custom photo / AI artwork for current city
  useEffect(() => {
    if (!w?.place?.name) return;
    try {
      const saved = localStorage.getItem(`weather:custom-bg:${w.place.name.toLowerCase()}`);
      if (saved) {
        setCustomPhoto(saved);
      } else {
        setCustomPhoto(null);
      }
    } catch {
      setCustomPhoto(null);
    }
  }, [w?.place?.name]);

  // Load Curated AI Watercolor Background
  useEffect(() => {
    if (!w?.place?.name) return;

    // If user has a custom photo set for this city, that takes priority
    if (customPhoto) {
      setHeroBg(customPhoto);
      setIsAiGenerated(false);
      setIsGenerating(false);
      return;
    }

    let isMounted = true;
    setIsGenerating(true);

    getCityWeatherBackground(
      w.place.name,
      w.current.code,
      w.current.is_day,
      w.current.temperature,
      currentDesc,
      w.place.latitude,
      w.place.longitude
    ).then((result) => {
      if (!isMounted) return;
      if (result.imageUrl) {
        setHeroBg(result.imageUrl);
        setIsAiGenerated(result.isAi);
      } else {
        setHeroBg(null);
        setIsAiGenerated(false);
      }
      setIsGenerating(false);
    });

    return () => {
      isMounted = false;
    };
  }, [
    w?.place?.name,
    w?.current?.code,
    w?.current?.is_day,
    w?.current?.temperature,
    currentDesc,
    customPhoto,
    w?.place?.latitude,
    w?.place?.longitude,
  ]);

  // Handle Photo Upload via File Input
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !w?.place?.name) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (!base64) return;

      // Compress image via canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", 0.8);
        try {
          localStorage.setItem(`weather:custom-bg:${w.place.name.toLowerCase()}`, compressed);
          setCustomPhoto(compressed);
        } catch (err) {
          console.warn("Storage quota exceeded for custom photo:", err);
          setCustomPhoto(compressed);
        }
        setShowArtMenu(false);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Remove custom photo and restore auto watercolor
  const handleRemoveCustomPhoto = () => {
    if (!w?.place?.name) return;
    try {
      localStorage.removeItem(`weather:custom-bg:${w.place.name.toLowerCase()}`);
      localStorage.removeItem(`weather:custom-art-choice:${w.place.name.toLowerCase()}`);
    } catch (e) {
      console.warn("Failed to clear custom photo:", e);
    }
    setCustomPhoto(null);
    setShowArtMenu(false);
  };

  // Switch to next available artwork for this city
  const handleCycleArtwork = async () => {
    if (!w?.place?.name) return;

    const availableArtworks = getAllAvailableArtworks(
      w.place.name,
      w.current.code,
      w.current.is_day
    );

    if (availableArtworks.length <= 1) {
      setShowArtMenu(false);
      return;
    }

    const currentIndex = heroBg ? availableArtworks.indexOf(heroBg) : -1;
    const nextIndex = (currentIndex + 1) % availableArtworks.length;
    const nextUrl = availableArtworks[nextIndex];

    try {
      localStorage.removeItem(`weather:custom-bg:${w.place.name.toLowerCase()}`);
      saveCustomArtChoice(w.place.name, nextUrl);
    } catch (e) {
      console.warn("Failed to cycle artwork:", e);
    }

    setCustomPhoto(null);
    setHeroBg(nextUrl);
    setIsAiGenerated(true);
    setShowArtMenu(false);
  };

  // Reset back to automated weather matching
  const handleAutoArtwork = () => {
    if (!w?.place?.name) return;
    try {
      localStorage.removeItem(`weather:custom-bg:${w.place.name.toLowerCase()}`);
      localStorage.removeItem(`weather:custom-art-choice:${w.place.name.toLowerCase()}`);
    } catch (e) {
      console.warn("Failed to reset art choice:", e);
    }
    setCustomPhoto(null);
    setShowArtMenu(false);
  };

  // Handle custom AI generated artwork from modal
  const handleCustomAiImageGenerated = (imageUrl: string, targetCity: string) => {
    try {
      localStorage.setItem(`weather:custom-bg:${targetCity.toLowerCase()}`, imageUrl);
      if (targetCity.toLowerCase() === w.place.name.toLowerCase()) {
        setCustomPhoto(imageUrl);
      }
    } catch (err) {
      console.warn("Storage quota exceeded for custom AI artwork:", err);
    }
  };

  // Helper: Determine if an hourly timestamp is daytime using sunrise/sunset
  const isHourDaytime = (timeIso: string): number => {
    if (!w?.sun?.sunrise || !w?.sun?.sunset) return 1;
    const hourTimestamp = new Date(timeIso).getTime();
    const sunriseTimestamp = new Date(w.sun.sunrise).getTime();
    const sunsetTimestamp = new Date(w.sun.sunset).getTime();
    return hourTimestamp >= sunriseTimestamp && hourTimestamp < sunsetTimestamp ? 1 : 0;
  };

  // Clothing advice engine
  const getClothingAdvice = (temp: number, unit: "C" | "F", rainProb: number, uv: number, wind: number) => {
    const tempC = unit === "C" ? temp : ((temp - 32) * 5) / 9;

    let casual = "";
    let business = "";
    let sport = "";

    if (tempC < 5) {
      casual = "Heavy winter coat, scarf, gloves, warm boots";
      business = "Wool overcoat, tailored suit, thermal base layer";
      sport = "Thermal windproof jacket, insulated running tights, beanie";
    } else if (tempC < 15) {
      casual = "Light jacket, sweater or hoodie, jeans";
      business = "Trench coat, blazer, smart trousers";
      sport = "Long-sleeve performance top, lightweight track pants";
    } else if (tempC < 24) {
      casual = "T-shirt, light overshirt or cardigan, chinos";
      business = "Crisp collared shirt, tailored trousers, optional blazer";
      sport = "Breathable t-shirt, shorts or light athletic leggings";
    } else {
      casual = "Breathable cotton/linen t-shirt, shorts, sandals or sneakers";
      business = "Lightweight linen shirt or summer blouse, breathable slacks";
      sport = "Sleeveless moisture-wicking top, running shorts, sweatband";
    }

    const accessories: string[] = [];
    if (rainProb > 40) accessories.push("Umbrella or waterproof jacket");
    if (uv >= 6) accessories.push("UV sunglasses, wide-brim hat, SPF 50+ sunscreen");
    else if (uv >= 3) accessories.push("Sunglasses, SPF 30+ sunscreen");
    if (wind > 25) accessories.push("Windbreaker shell");

    return { casual, business, sport, accessories };
  };

  const clothing = getClothingAdvice(
    w.current.temperature,
    selectedUnit,
    w.daily[0]?.precipitation_probability_max ?? 0,
    w.current.uvIndex ?? 0,
    w.current.windSpeed
  );

  // Background style for Hero Card
  const heroStyle = heroBg
    ? {
        backgroundImage: `url("${heroBg}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  // Compute hourly forecast starting from CURRENT hour rather than midnight
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
              <span>{hasDisaster ? "EMERGENCY" : "ADVISORY"}</span>
            </div>

            <div className="relative flex-1 overflow-hidden py-2">
              <div className="ticker-scroll flex items-center gap-8 whitespace-nowrap pl-4">
                {[...disasters, ...disasters].map((alert, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs">
                    <span>{alert.icon}</span>
                    <span className="font-semibold text-foreground/90">[{alert.tag}]</span>
                    <span>{alert.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-3">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-300">
            <span className="text-sm">🛡️</span>
            <span className="font-semibold uppercase tracking-wider text-[11px]">ALL CLEAR</span>
            <span className="text-muted-foreground">—</span>
            <span className="text-[11px] sm:text-xs">
              No active storm, flood, or earthquake alerts in effect for {w.place.name}.
            </span>
          </div>
        </section>
      )}

      {/* 2. MAIN HERO WEATHER CARD */}
      <section
        style={heroStyle}
        className={`relative mt-4 overflow-hidden rounded-3xl border border-border/40 p-6 shadow-xl transition-all duration-700 ${
          heroBg ? "text-white" : "bg-card text-card-foreground"
        }`}
      >
        {heroBg && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30 pointer-events-none" />
        )}

        <div className="relative z-10 flex flex-col justify-between gap-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-xs">
                  {w.place.name}
                </h2>
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  className="rounded-full p-1.5 text-lg transition-transform hover:scale-110 active:scale-95"
                  aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                >
                  {isFavorite ? "★" : "☆"}
                </button>
              </div>
              <p
                className={`text-xs sm:text-sm font-medium ${
                  heroBg ? "text-white/80" : "text-muted-foreground"
                }`}
              >
                {[w.place.admin1, w.place.country].filter(Boolean).join(", ")}
              </p>
            </div>

            {/* Top Right Controls: Art Menu & Unit Switcher */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5">
                {/* Art Menu Popover */}
                <div className="relative" ref={artMenuRef}>
                  <div className="inline-flex rounded-full border border-white/20 bg-black/40 backdrop-blur-md shadow-sm overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setShowArtMenu(!showArtMenu)}
                      className="flex items-center gap-1 px-2.5 py-1 text-white hover:bg-white/10 transition-colors"
                      title="Art options"
                    >
                      <span>🎨</span>
                      <span className="font-medium text-[11px]">Art</span>
                      <span className="text-[9px] opacity-70">▾</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCycleArtwork}
                      className="px-2 py-1 text-white/90 hover:bg-white/15 hover:text-white transition-colors border-l border-white/15"
                      title="Next artwork"
                      aria-label="Next artwork"
                    >
                      →
                    </button>
                  </div>

                  {/* Art Popover Menu */}
                  {showArtMenu && (
                    <div className="absolute left-0 mt-1.5 w-52 rounded-xl border border-white/15 bg-slate-900/95 p-1.5 text-xs text-white shadow-2xl backdrop-blur-xl z-50">
                      {/* Describe & Generate AI Scene (Purple Gradient) */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowArtMenu(false);
                          setShowAiModal(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600/30 to-indigo-600/30 px-2.5 py-2 text-left font-semibold text-purple-200 hover:from-purple-600/50 hover:to-indigo-600/50 hover:text-white transition-all border border-purple-500/30 mb-1"
                      >
                        <span>✨</span>
                        <span>Describe AI Scene</span>
                      </button>

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

                {/* Unit Switcher */}
                <div className="flex rounded-full border border-border/50 bg-background/50 p-0.5 text-xs font-semibold backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => onUnitChange("C")}
                    className={`rounded-full px-2 py-0.5 transition-colors ${
                      selectedUnit === "C" ? "bg-primary text-primary-foreground shadow-xs" : "opacity-70"
                    }`}
                  >
                    °C
                  </button>
                  <button
                    type="button"
                    onClick={() => onUnitChange("F")}
                    className={`rounded-full px-2 py-0.5 transition-colors ${
                      selectedUnit === "F" ? "bg-primary text-primary-foreground shadow-xs" : "opacity-70"
                    }`}
                  >
                    °F
                  </button>
                </div>
              </div>

              {/* Artwork Indicator Badge */}
              {isGenerating ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                  Painting...
                </span>
              ) : customPhoto ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
                  📷 Your photo
                </span>
              ) : isAiGenerated ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
                  ✨ AI vibrant watercolor
                </span>
              ) : heroBg ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
                  Vibrant atmosphere
                </span>
              ) : null}
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
                <span className="text-5xl sm:text-6xl font-black tracking-tight drop-shadow-md">
                  {Math.round(w.current.temperature)}°
                </span>
                <span className="text-xl font-medium opacity-80">{selectedUnit}</span>
              </div>
              <p className="text-base sm:text-lg font-bold capitalize drop-shadow-xs">
                {currentDesc}
              </p>
              <p
                className={`text-xs ${
                  heroBg ? "text-white/80" : "text-muted-foreground"
                }`}
              >
                Feels like {Math.round(w.current.apparentTemperature)}° • High{" "}
                {Math.round(w.daily[0]?.temperature_2m_max ?? w.current.temperature)}° / Low{" "}
                {Math.round(w.daily[0]?.temperature_2m_min ?? w.current.temperature)}°
              </p>
            </div>
          </div>

          {/* Quick Stats Pill Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-xs">
            <span className="inline-flex items-center gap-1 rounded-lg bg-black/30 px-2.5 py-1 backdrop-blur-sm">
              💧 {w.current.humidity}% Humidity
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-black/30 px-2.5 py-1 backdrop-blur-sm">
              💨 {Math.round(w.current.windSpeed)} km/h Wind
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-black/30 px-2.5 py-1 backdrop-blur-sm">
              ☀️ UV {w.current.uvIndex?.toFixed(1) ?? "--"} ({uvCategory(w.current.uvIndex ?? 0)})
            </span>
            {w.current.aqi !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-black/30 px-2.5 py-1 backdrop-blur-sm">
                🍃 AQI {w.current.aqi} ({aqiCategory(w.current.aqi).label})
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 3. WHAT TO WEAR ADVICE CARD */}
      <section className="mt-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm text-card-foreground">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">👔</span>
          <h3 className="text-sm font-bold tracking-tight uppercase text-muted-foreground">
            What to Wear Today
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="rounded-xl border border-border/40 bg-muted/30 p-2.5">
            <span className="font-semibold text-foreground block mb-1">Casual</span>
            <p className="text-muted-foreground leading-relaxed">{clothing.casual}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/30 p-2.5">
            <span className="font-semibold text-foreground block mb-1">Business</span>
            <p className="text-muted-foreground leading-relaxed">{clothing.business}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/30 p-2.5">
            <span className="font-semibold text-foreground block mb-1">Outdoor & Sport</span>
            <p className="text-muted-foreground leading-relaxed">{clothing.sport}</p>
          </div>
        </div>

        {clothing.accessories.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 text-xs">
            <span className="font-semibold text-foreground">Recommended:</span>
            {clothing.accessories.map((item, idx) => (
              <span
                key={idx}
                className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-primary text-[11px] font-medium"
              >
                {item}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 4. HOURLY FORECAST (24 Hours starting from current hour) */}
      <section className="mt-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm text-card-foreground">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          24-Hour Forecast
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {displayHours.map((h, idx) => {
            const hDate = new Date(h.time);
            const hourLabel =
              idx === 0
                ? "Now"
                : hDate.toLocaleTimeString([], { hour: "numeric", hour12: true });
            const hInfo = describeWeather(h.code);
            const dayStatus = isHourDaytime(h.time);
            const watercolorMapping = wmoToIconCode(h.code, dayStatus, hInfo.label);

            return (
              <div
                key={idx}
                className="flex flex-col items-center justify-between min-w-[72px] rounded-xl border border-border/40 bg-muted/20 p-2 text-center text-xs"
              >
                <span className="text-[11px] font-medium text-muted-foreground">{hourLabel}</span>
                <WeatherIcon
                  wmoCode={h.code}
                  isDay={dayStatus}
                  description={watercolorMapping.desc}
                  cityName={w.place.name}
                  className="my-1.5 w-8 h-8 shrink-0"
                  fallbackEmoji={hInfo.icon}
                />
                <span className="text-sm font-bold text-foreground">
                  {Math.round(h.temperature)}°
                </span>
                <span className="text-[10px] text-muted-foreground line-clamp-2 h-6 leading-tight mt-0.5">
                  {watercolorMapping.desc}
                </span>
                {h.precipitation_probability !== undefined && h.precipitation_probability > 0 && (
                  <span className="text-[10px] text-blue-500 font-medium mt-1">
                    💧{h.precipitation_probability}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. 7-DAY FORECAST */}
      <section className="mt-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm text-card-foreground">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          7-Day Forecast
        </h3>
        <div className="divide-y divide-border/40">
          {w.daily.slice(0, 7).map((dItem, idx) => {
            const date = new Date(dItem.time);
            const dayName =
              idx === 0
                ? "Today"
                : date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
            const dInfo = describeWeather(dItem.code);
            const dayWatercolor = wmoToIconCode(dItem.code, 1, dInfo.label);

            return (
              <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                <span className="w-24 font-medium text-foreground">{dayName}</span>
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <WeatherIcon
                    wmoCode={dItem.code}
                    isDay={1}
                    description={dayWatercolor.desc}
                    cityName={w.place.name}
                    className="w-6 h-6 shrink-0"
                    fallbackEmoji={dInfo.icon}
                  />
                  <span className="text-muted-foreground truncate max-w-[120px] text-[11px]">
                    {dayWatercolor.desc}
                  </span>
                  {dItem.precipitation_probability_max > 0 && (
                    <span className="text-[10px] text-blue-500 font-medium">
                      💧{dItem.precipitation_probability_max}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="font-bold text-foreground">
                    {Math.round(dItem.temperature_2m_max)}°
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(dItem.temperature_2m_min)}°
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. KEY METRICS GRID */}
      <section className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="rounded-xl border border-border/40 bg-card p-3 shadow-xs">
          <span className="text-muted-foreground block text-[11px] font-medium">Humidity</span>
          <span className="text-lg font-bold text-foreground mt-0.5 block">{w.current.humidity}%</span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Dew point: {Math.round(w.current.temperature - (100 - w.current.humidity) / 5)}°
          </span>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-3 shadow-xs">
          <span className="text-muted-foreground block text-[11px] font-medium">Wind</span>
          <span className="text-lg font-bold text-foreground mt-0.5 block">
            {Math.round(w.current.windSpeed)} km/h
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Direction: {w.current.windDirection}°
          </span>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-3 shadow-xs">
          <span className="text-muted-foreground block text-[11px] font-medium">UV Index</span>
          <span className="text-lg font-bold text-foreground mt-0.5 block">
            {w.current.uvIndex?.toFixed(1) ?? "--"}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            {uvCategory(w.current.uvIndex ?? 0)}
          </span>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-3 shadow-xs">
          <span className="text-muted-foreground block text-[11px] font-medium">Air Quality (AQI)</span>
          <span className="text-lg font-bold text-foreground mt-0.5 block">
            {w.current.aqi ?? "--"}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            {w.current.aqi !== undefined ? aqiCategory(w.current.aqi).label : "N/A"}
          </span>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-3 shadow-xs">
          <span className="text-muted-foreground block text-[11px] font-medium">Precipitation</span>
          <span className="text-lg font-bold text-foreground mt-0.5 block">
            {w.current.precipitation ?? 0} mm
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Max today: {w.daily[0]?.precipitation_sum ?? 0} mm
          </span>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-3 shadow-xs">
          <span className="text-muted-foreground block text-[11px] font-medium">Sunrise</span>
          <span className="text-lg font-bold text-foreground mt-0.5 block">
            {w.sun?.sunrise
              ? new Date(w.sun.sunrise).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
              : "--"}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Dawn</span>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-3 shadow-xs">
          <span className="text-muted-foreground block text-[11px] font-medium">Sunset</span>
          <span className="text-lg font-bold text-foreground mt-0.5 block">
            {w.sun?.sunset
              ? new Date(w.sun.sunset).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
              : "--"}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Dusk</span>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-3 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-muted-foreground block text-[11px] font-medium">Updated</span>
            <span className="text-xs font-bold text-foreground mt-0.5 block truncate">
              {lastUpdatedText}
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-1 flex items-center justify-center gap-1 rounded-lg bg-primary/10 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </section>

      {/* Attribution Footer */}
      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Weather data powered by{" "}
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

      {/* AI Custom Scene Generator Dialog */}
      <AiCustomSceneDialog
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        defaultCity={w.place.name}
        weatherDesc={currentDesc}
        onImageGenerated={handleCustomAiImageGenerated}
      />
    </>
  );
}
