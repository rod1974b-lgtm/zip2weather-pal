// src/components/WeatherView.tsx (Part 1 of 2: Setup & Logic)
import React, { useState, useEffect } from "react";
import type { TFunction } from "i18next";
import { type Weather, type WeatherUnit, type Place } from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { useTranslation } from "react-i18next";
import {
  getAllAvailableArtworks,
  getCityWeatherBackground,
} from "@/lib/aiWatercolorGenerator";
import { AiGalleryModal } from "@/components/AiGalleryModal";

export interface TickerAlertItem {
  id: string;
  text?: string;
  severity: "disaster" | "warning" | "advisory" | "all-clear" | "danger";
  tag?: string;
  tagKey?: string;
  category?: string;
  source?: string;
  headline?: string;
  headlineTh?: string;
  headlineEn?: string;
  urgency?: string;
  timeAgo?: string;
}

interface WeatherViewProps {
  weather?: Weather | null;
  w?: Weather | null;
  activeAlerts?: TickerAlertItem[];
  disasters?: TickerAlertItem[];
  unit: WeatherUnit;
  loading: boolean;
  onRefresh: () => void;
  onSelectBg?: (url: string) => void;
  onSelectBackground?: (url: string) => void;
  isFav?: boolean;
  onToggleFavorite?: () => void;
  onOpenAiGallery?: () => void;
  customBgUrl?: string | null;
}

type WearCategory = "casual" | "business" | "sports";

const WMO_KEY_MAP: Record<number, { key: string; fallback: string }> = {
  0: { key: "cond_clear", fallback: "Clear sky" },
  1: { key: "cond_partly_cloudy", fallback: "Partly cloudy" },
  2: { key: "cond_partly_cloudy", fallback: "Partly cloudy" },
  3: { key: "cond_overcast", fallback: "Overcast" },
  45: { key: "cond_fog", fallback: "Fog" },
  48: { key: "cond_fog", fallback: "Fog" },
  51: { key: "cond_drizzle", fallback: "Drizzle" },
  53: { key: "cond_drizzle", fallback: "Drizzle" },
  55: { key: "cond_drizzle", fallback: "Drizzle" },
  56: { key: "cond_drizzle", fallback: "Drizzle" },
  57: { key: "cond_drizzle", fallback: "Drizzle" },
  61: { key: "cond_rain", fallback: "Rain" },
  63: { key: "cond_rain", fallback: "Rain" },
  65: { key: "cond_heavy_rain", fallback: "Heavy rain" },
  66: { key: "cond_freezing_rain", fallback: "Freezing rain" },
  67: { key: "cond_freezing_rain", fallback: "Heavy freezing rain" },
  71: { key: "cond_snow", fallback: "Slight snow" },
  73: { key: "cond_snow", fallback: "Moderate snow" },
  75: { key: "cond_snow", fallback: "Heavy snow" },
  77: { key: "cond_snow", fallback: "Snow grains" },
  80: { key: "cond_rain_showers", fallback: "Rain showers" },
  81: { key: "cond_rain_showers", fallback: "Heavy rain showers" },
  82: { key: "cond_violent_rain_showers", fallback: "Violent rain showers" },
  85: { key: "cond_snow_showers", fallback: "Snow showers" },
  86: { key: "cond_snow_showers", fallback: "Heavy snow showers" },
  95: { key: "cond_thunderstorm", fallback: "Thunderstorm" },
  96: { key: "cond_thunderstorm_hail", fallback: "Thunderstorm with hail" },
  99: { key: "cond_thunderstorm_hail", fallback: "Thunderstorm with heavy hail" },
};

function getConditionLabel(code: number, t: TFunction): string {
  const match = WMO_KEY_MAP[code];
  if (match) return t(match.key, match.fallback);
  return t("cond_cloudy", "Cloudy");
}

function getUvLabel(uv: number, t: TFunction): string {
  if (uv <= 2) return t("uv_low", "Low");
  if (uv <= 5) return t("uv_moderate", "Moderate");
  if (uv <= 7) return t("uv_high", "High");
  if (uv <= 10) return t("uv_very_high", "Very High");
  return t("uv_extreme", "Extreme");
}

function getAqiLabel(aqi: number, t: TFunction): string {
  if (aqi <= 50) return t("aqi_good", "Good");
  if (aqi <= 100) return t("aqi_moderate", "Moderate");
  if (aqi <= 150) return t("aqi_unhealthy_sensitive", "Unhealthy (Sensitive)");
  if (aqi <= 200) return t("aqi_unhealthy", "Unhealthy");
  return t("aqi_hazardous", "Hazardous");
}

const WEAR_CATEGORIES = {
  en: { casual: "Casual", business: "Business", sports: "Active" },
  th: { casual: "ลำลอง", business: "ทำงาน", sports: "ออกกำลังกาย" },
};

const DAY_LABELS: Record<string, string> = { en: "Day", th: "กลางวัน" };
const NIGHT_LABELS: Record<string, string> = { en: "Night", th: "กลางคืน" };

const SPEED_UNITS = {
  en: { metric: "km/h", imperial: "mph" },
  th: { metric: "กม./ชม.", imperial: "ไมล์/ชม." },
};

// Realistic clothing recommendations engine
function getRealisticClothingAdvice(
  celsius: number,
  conditionCode: number,
  category: WearCategory,
  windSpeedKmH: number,
  lang: string
): string {
  const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(conditionCode);
  const isSnow = [71, 73, 75, 77, 85, 86].includes(conditionCode);

  if (lang === "th") {
    if (celsius >= 30) {
      if (category === "casual")
        return isRain
          ? "เสื้อยืดเนื้อโปร่งหรือลินิน กางเกงขาสั้น และรองเท้ากันน้ำ"
          : "เสื้อยืดคอตตอนบาง กางเกงขาสั้น และแว่นตากันแดด";
      if (category === "business")
        return "เสื้อเชิ้ตแขนสั้นผ้าฝ้าย กางเกงสแล็คผ้าบางน้ำหนักเบา";
      return "เสื้อกล้ามหรือเสื้อวิ่งระบายอากาศ กางเกงวิ่งขาสั้น ดื่มน้ำบ่อยๆ";
    }
    if (celsius >= 22) {
      if (category === "casual")
        return "เสื้อยืดหรือโปโล กางเกงยีนส์ขายาว สบายๆ ตลอดวัน";
      if (category === "business")
        return "เสื้อเชิ้ตแขนยาว กางเกงชิโน่ หรือเบลเซอร์ผ้าบาง";
      return "ชุดกีฬามาตรฐานระบายเหงื่อได้ดี รองเท้าวิ่งน้ำหนักเบา";
    }
    if (celsius >= 15) {
      if (category === "casual")
        return "เสื้อแขนยาว มีแจ็กเก็ตหรือคาร์ดิแกนบางสวมทับ";
      if (category === "business")
        return "สูทมาตรฐาน สวมสเวตเตอร์บางด้านในหากอยู่ในห้องแอร์";
      return "เสื้อวิ่งแขนยาว กางเกงรัดรูปขายาวเพื่อความอบอุ่น";
    }
    return "เสื้อกันหนาวหนา เสื้อโค้ท หรือแจ็กเก็ตขนเป็ด พร้อมผ้าพันคอ";
  }

  // English recommendations
  if (celsius >= 30) {
    if (category === "casual")
      return isRain
        ? "Light breathable linen or cotton tee, quick-dry shorts, and waterproof slip-ons."
        : "Breathable cotton tee, light shorts, and UV sunglasses. Stay well hydrated!";
    if (category === "business")
      return "Lightweight linen or tropical wool dress shirt with breathable tailored trousers.";
    return "Ultralight moisture-wicking singlet and running shorts. High electrolyte intake recommended.";
  }
  if (celsius >= 22) {
    if (category === "casual")
      return isRain
        ? "Comfortable tee, denim trousers, and a packable rain shell."
        : "Standard tee or polo, relaxed jeans or chinos, and comfortable sneakers.";
    if (category === "business")
      return "Long-sleeve button-up dress shirt, tailored chinos, and loafers.";
    return "Standard athletic technical tee and shorts or lightweight joggers.";
  }
  if (celsius >= 15) {
    if (category === "casual")
      return "Layer a light hoodie, knit sweater, or denim jacket over your casual tee.";
    if (category === "business")
      return "Tailored wool blazer over a crisp collared shirt with dress trousers.";
    return "Long-sleeve training top with compression tights or windbreaker.";
  }
  return isSnow
    ? "Heavy thermal down parka, insulated trousers, beanie, and winter boots."
    : "Warm wool coat, insulated knit sweater, long trousers, and scarf.";
}

function getSmartAccessories(
  conditionCode: number,
  uv: number,
  windKmH: number,
  lang: string
): string[] {
  const acc: string[] = [];
  const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(conditionCode);

  if (lang === "th") {
    if (isRain) acc.push("ร่มกันฝน", "รองเท้ากันน้ำ");
    if (uv >= 6) acc.push("แว่นกันแดด", "ครีมกันแดด SPF50+");
    if (windKmH >= 35) acc.push("เสื้อกันลม");
    if (acc.length === 0) acc.push("พกน้ำดื่ม");
    return acc;
  }

  if (isRain) acc.push("Compact Umbrella", "Waterproof Footwear");
  if (uv >= 6) acc.push("UV Sunglasses", "Sunscreen SPF50+");
  if (windKmH >= 35) acc.push("Wind Shell Jacket");
  if (acc.length === 0) acc.push("Hydration Flask");
  return acc;
}

export const WeatherView: React.FC<WeatherViewProps> = ({
  weather,
  w: legacyW,
  activeAlerts = [],
  disasters = [],
  unit,
  loading,
  onRefresh,
  onSelectBg,
  onSelectBackground,
  isFav = false,
  onToggleFavorite,
  onOpenAiGallery,
  customBgUrl,
}) => {
  const w = weather || legacyW;
  const { t, i18n } = useTranslation();
  const lang = i18n?.language?.startsWith("th") ? "th" : "en";

  const [wearCategory, setWearCategory] = useState<WearCategory>("casual");
  const [isSkyModalOpen, setIsSkyModalOpen] = useState(false);
  const [heroBgUrl, setHeroBgUrl] = useState<string | null>(null);

  const cityStorageKey = w?.place?.name
    ? `weather:custom-bg:${w.place.name.trim().toLowerCase()}`
    : null;

  useEffect(() => {
    if (customBgUrl !== undefined) {
      setHeroBgUrl(customBgUrl);
      return;
    }
    if (!w?.place?.name) return;

    if (cityStorageKey) {
      const stored = localStorage.getItem(cityStorageKey);
      if (stored) {
        setHeroBgUrl(stored);
        return;
      }
    }

    const available = getAllAvailableArtworks(w.place.name);
    const conditionStr = getConditionLabel(w.current.code, t);
    const firstArt = available[0]?.url;

    if (firstArt) {
      setHeroBgUrl(firstArt);
    } else {
      getCityWeatherBackground(
        w.place.name,
        conditionStr,
        w.current.code,
        w.current.temp,
        (loadedUrl) => {
          setHeroBgUrl(loadedUrl);
        },
        w.place.country,
        w.place.lat,
        w.place.lon
      )
        .then((res) => {
          if (res?.initialBg && !res.initialBg.startsWith("linear-gradient")) {
            setHeroBgUrl(res.initialBg);
          }
        })
        .catch(() => {});
    }
  }, [w?.place?.name, w?.current?.code, cityStorageKey, customBgUrl]);
