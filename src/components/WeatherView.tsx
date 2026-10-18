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
import { AiCustomSceneDialog } from "@/components/AiCustomSceneDialog";

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
  const [showAiModal, setShowAiModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const artMenuRef = useRef<HTMLDivElement>(null);

  const tempC = w.unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  const isRainy = w.current.code >= 51 && w.current.code <= 82;
  const isFreezing = tempC <= 5;
  const isWarm = tempC >= 22;

  const hasDisaster = disasters?.some((alert) => alert.severity === "disaster");

  // Load custom photo / AI artwork for current city
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

  // Handle custom AI generated artwork from modal
  const handleCustomAiImageGenerated = (imageUrl: string, targetCity: string) => {
    try {
      localStorage.setItem(`weather:custom-bg:${targetCity}`, imageUrl);
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
