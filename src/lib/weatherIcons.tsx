// src/lib/weatherIcons.tsx
import { useState } from "react";

export const watercolorIcons: Record<string, string> = {
  // Day
  "01d": "/icons/watercolor/01d_clear_sky.png",
  "02d": "/icons/watercolor/02d_few_clouds.png",
  "03d": "/icons/watercolor/03d_scattered.png",
  "04d": "/icons/watercolor/04d_overcast.png",
  "04d_broken": "/icons/watercolor/04d_broken.png",
  "09d": "/icons/watercolor/09d_shower_rain.png",
  "09d_drizzle": "/icons/watercolor/09d_drizzle.png",
  "10d": "/icons/watercolor/10d_light_rain.png",
  "10d_light": "/icons/watercolor/10d_light_rain.png",
  "10d_heavy": "/icons/watercolor/10d_heavy_rain.png",
  "11d": "/icons/watercolor/11d_thunderstorm.png",
  "13d": "/icons/watercolor/13d_snow.png",

  // Night
  "01n": "/icons/watercolor/01n_clear_night.png",
  "02n": "/icons/watercolor/02n_few_clouds_night.png",
  "03n": "/icons/watercolor/03n_scattered_night.png",
  "04n": "/icons/watercolor/04n_overcast_night.png",
  "04n_broken": "/icons/watercolor/04n_broken_night.png",
  "09n": "/icons/watercolor/09n_shower_night.png",
  "10n": "/icons/watercolor/10n_rain_night.png",
  "11n": "/icons/watercolor/11n_thunderstorm_night.png",
  "13n": "/icons/watercolor/13n_snow_night.png",

  // Atmosphere 50d (Ratchaburi haze, dust, mist, fog, smoke, wind)
  "50d": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_mist": "/icons/watercolor/50d_mist.png",
  "50d_fog": "/icons/watercolor/50d_fog.png",
  "50d_haze": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_haze_pure": "/icons/watercolor/50d_haze_pure.png",
  "50d_haze_ratchaburi": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_dust": "/icons/watercolor/50d_dust.png",
  "50d_sand": "/icons/watercolor/50d_dust.png",
  "50d_smoke": "/icons/watercolor/50d_smoke.png",
  "50d_tornado": "/icons/watercolor/50d_tornado.png",
  "50d_wind": "/icons/watercolor/50d_wind.png",
  "50n": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50n_mist": "/icons/watercolor/50d_mist.png",
  "50n_fog": "/icons/watercolor/50d_fog.png",
};

export const fallbackIcons: Record<string, string> = {
  "01d": "☀️",
  "01n": "🌙",
  "02d": "⛅",
  "02n": "🌙☁️",
  "03d": "⛅",
  "03n": "🌙☁️",
  "04d": "☁️",
  "04d_broken": "☁️",
  "04n": "☁️",
  "04n_broken": "☁️",
  "09d": "🌧️",
  "09d_drizzle": "🌦️",
  "09n": "🌧️",
  "10d": "🌧️",
  "10d_heavy": "⛈️",
  "10n": "🌧️",
  "11d": "⛈️",
  "11n": "⛈️",
  "13d": "❄️",
  "13n": "❄️",
  "50d": "🌫️",
  "50d_mist": "🌫️",
  "50d_fog": "🌁",
  "50d_haze": "🌫️",
  "50d_haze_ratchaburi": "🌫️",
  "50n": "🌫️",
};

/**
 * Standard icon code resolver
 */
export function getWeatherIcon(iconCode: string, description?: string): string {
  const code = (iconCode || "01d").toLowerCase();
  const desc = (description || "").toLowerCase();

  // Heavy rain detection by description
  if (code.startsWith("10") && (desc.includes("heavy") || desc.includes("torrential") || desc.includes("downpour"))) {
    return watercolorIcons["10d_heavy"];
  }

  // Drizzle detection
  if (code.startsWith("09") && desc.includes("drizzle")) {
    return watercolorIcons["09d_drizzle"];
  }

  // Atmosphere by description
  if (code.startsWith("50") || desc.includes("haze") || desc.includes("fog") || desc.includes("mist")) {
    if (desc.includes("mist")) return code.endsWith("n") ? watercolorIcons["50n_mist"] : watercolorIcons["50d_mist"];
    if (desc.includes("fog")) return code.endsWith("n") ? watercolorIcons["50n_fog"] : watercolorIcons["50d_fog"];
    if (desc.includes("haze") || desc.includes("pm2.5") || desc.includes("smog")) return watercolorIcons["50d_haze_ratchaburi"];
    if (desc.includes("dust") || desc.includes("sand") || desc.includes("ash")) return watercolorIcons["50d_dust"];
    if (desc.includes("smoke")) return watercolorIcons["50d_smoke"];
    if (desc.includes("tornado") || desc.includes("squall")) return watercolorIcons["50d_tornado"];
    if (desc.includes("wind") || desc.includes("breeze")) return watercolorIcons["50d_wind"];
    return watercolorIcons["50d_haze_ratchaburi"];
  }

  if (watercolorIcons[code]) return watercolorIcons[code];

  // Cross-fallback day <-> night
  const dayCode = code.replace("n", "d");
  const nightCode = code.replace("d", "n");
  return (
    watercolorIcons[code] ||
    watercolorIcons[dayCode] ||
    watercolorIcons[nightCode] ||
    watercolorIcons["01d"]
  );
}

/**
 * Open-Meteo (WMO) to Watercolor Icon Adapter
 * Maps WMO weather codes (0-99) + is_day (0/1) + city/AQI to the 28 watercolor icons
 */
export function wmoToIconCode(
  wmoCode: number,
  isDay: number = 1,
  cityName?: string,
  aqi?: number
): { iconCode: string; desc: string } {
  const isNight = isDay === 0;
  const isRatchaburi = cityName?.toLowerCase().includes("ratchaburi");

  // Check high haze / dust / Ratchaburi atmosphere
  if ((isRatchaburi && (wmoCode === 45 || wmoCode === 48 || (aqi && aqi > 90))) || (aqi && aqi > 150)) {
    return { iconCode: "50d_haze_ratchaburi", desc: "Haze & PM2.5" };
  }

  switch (wmoCode) {
    case 0:
      return { iconCode: isNight ? "01n" : "01d", desc: "Clear sky" };
    case 1:
      return { iconCode: isNight ? "02n" : "02d", desc: "Few clouds" };
    case 2:
      return { iconCode: isNight ? "03n" : "03d", desc: "Scattered clouds" };
    case 3:
      return { iconCode: isNight ? "04n" : "04d", desc: "Overcast" };
    case 45:
      return { iconCode: isNight ? "50n_fog" : "50d_fog", desc: "Fog" };
    case 48:
      return { iconCode: isNight ? "50n_mist" : "50d_mist", desc: "Depositing rime fog" };
    case 51:
    case 53:
    case 55:
      return { iconCode: "09d_drizzle", desc: "Drizzle" };
    case 56:
    case 57:
      return { iconCode: "09d_drizzle", desc: "Freezing drizzle" };
    case 61:
      return { iconCode: isNight ? "10n" : "10d_light", desc: "Light rain" };
    case 63:
      return { iconCode: isNight ? "10n" : "10d", desc: "Moderate rain" };
    case 65:
      return { iconCode: isNight ? "10n" : "10d_heavy", desc: "Heavy rain" };
    case 66:
    case 67:
      return { iconCode: isNight ? "10n" : "10d_heavy", desc: "Freezing rain" };
    case 71:
    case 73:
    case 75:
    case 77:
      return { iconCode: isNight ? "13n" : "13d", desc: "Snowfall" };
    case 80:
      return { iconCode: isNight ? "09n" : "09d", desc: "Rain showers" };
    case 81:
    case 82:
      return { iconCode: isNight ? "09n" : "10d_heavy", desc: "Violent rain showers" };
    case 85:
    case 86:
      return { iconCode: isNight ? "13n" : "13d", desc: "Snow showers" };
    case 95:
      return { iconCode: isNight ? "11n" : "11d", desc: "Thunderstorm" };
    case 96:
    case 99:
      return { iconCode: isNight ? "11n" : "11d", desc: "Thunderstorm with hail" };
    default:
      return { iconCode: isNight ? "01n" : "01d", desc: "Clear" };
  }
}

export function getWeatherIconWithFallback(iconCode: string, description?: string) {
  const url = getWeatherIcon(iconCode, description);
  const fallback =
    fallbackIcons[iconCode] ||
    fallbackIcons[iconCode.replace("n", "d")] ||
    fallbackIcons[iconCode.split("_")[0]] ||
    "⛅";
  return { url, fallback };
}

interface WeatherIconProps {
  iconCode?: string;
  wmoCode?: number;
  isDay?: number;
  description?: string;
  cityName?: string;
  aqi?: number;
  className?: string;
  fallbackEmoji?: string;
}

/**
 * Reusable Weather Icon component with zero broken-image boxes
 */
export function WeatherIcon({
  iconCode,
  wmoCode,
  isDay = 1,
  description,
  cityName,
  aqi,
  className = "w-16 h-16",
  fallbackEmoji,
}: WeatherIconProps) {
  const resolvedCode =
    iconCode ?? (wmoCode !== undefined ? wmoToIconCode(wmoCode, isDay, cityName, aqi).iconCode : "01d");
  const resolvedDesc =
    description ?? (wmoCode !== undefined ? wmoToIconCode(wmoCode, isDay, cityName, aqi).desc : "");

  const { url, fallback } = getWeatherIconWithFallback(resolvedCode, resolvedDesc);
  const [imgError, setImgError] = useState(false);

  if (!url || imgError) {
    return (
      <span
        className={`${className} flex items-center justify-center select-none text-3xl sm:text-4xl leading-none`}
        role="img"
        aria-label={resolvedDesc || resolvedCode}
      >
        {fallbackEmoji || fallback}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={resolvedDesc || resolvedCode}
      className={`${className} object-contain transition-transform duration-300 drop-shadow-md select-none`}
      onError={() => setImgError(true)}
      loading="lazy"
      draggable={false}
      style={{ filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25))" }}
    />
  );
}
