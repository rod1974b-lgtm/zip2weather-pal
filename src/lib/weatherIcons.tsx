// src/lib/weatherIcons.tsx
import { useState } from "react";

/**
 * Accurately mapped dictionary connecting every semantic weather code to the exact
 * watercolor illustration file in public/icons/watercolor/
 */
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

  // Atmosphere & Conditions
  "50d": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_mist": "/icons/watercolor/50d_mist.png",
  "50d_fog": "/icons/watercolor/50d_fog.png",
  "50d_haze": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_dust": "/icons/watercolor/50d_dust.png",
  "50d_smoke": "/icons/watercolor/50d_smoke.png",
  "50d_tornado": "/icons/watercolor/50d_tornado.png",
  "50d_wind": "/icons/watercolor/50d_wind.png",
  "50n": "/icons/watercolor/50d_wind.png",
  "50n_mist": "/icons/watercolor/50d_mist.png",
  "50n_fog": "/icons/watercolor/50d_fog.png",
};

export const fallbackIcons: Record<string, string> = {
  "01d": "☀️",
  "01n": "🌙",
  "02d": "🌤️",
  "02n": "🌙☁️",
  "03d": "⛅",
  "03n": "🌙☁️",
  "04d": "☁️",
  "04d_broken": "🌥️",
  "04n": "☁️",
  "04n_broken": "🌙☁️",
  "09d": "🌧️",
  "09d_drizzle": "🌦️",
  "09n": "🌧️",
  "09n_drizzle": "🌦️",
  "10d": "🌧️",
  "10d_light": "🌦️",
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
  "50n": "🌫️",
};

/**
 * Standard icon code resolver
 */
export function getWeatherIcon(iconCode: string, description?: string): string {
  const code = (iconCode || "01d").toLowerCase();
  const desc = (description || "").toLowerCase();

  if (code.startsWith("10") && (desc.includes("heavy") || desc.includes("torrential") || desc.includes("downpour"))) {
    return watercolorIcons["10d_heavy"];
  }

  if ((code.startsWith("09") || code.startsWith("10")) && desc.includes("drizzle")) {
    return code.endsWith("n") ? (watercolorIcons["09n_drizzle"] || watercolorIcons["09d_drizzle"]) : watercolorIcons["09d_drizzle"];
  }

  if (code.startsWith("50") || desc.includes("haze") || desc.includes("fog") || desc.includes("mist")) {
    if (desc.includes("mist")) return code.endsWith("n") ? watercolorIcons["50n_mist"] : watercolorIcons["50d_mist"];
    if (desc.includes("fog")) return code.endsWith("n") ? watercolorIcons["50n_fog"] : watercolorIcons["50d_fog"];
    if (desc.includes("haze") || desc.includes("smog") || desc.includes("pm2.5")) return watercolorIcons["50d_haze"];
    if (desc.includes("dust") || desc.includes("sand")) return watercolorIcons["50d_dust"];
    if (desc.includes("smoke")) return watercolorIcons["50d_smoke"];
    if (desc.includes("tornado")) return watercolorIcons["50d_tornado"];
    if (desc.includes("wind")) return watercolorIcons["50d_wind"];
    return watercolorIcons["50d"];
  }

  if (watercolorIcons[code]) return watercolorIcons[code];

  const dayCode = code.replace("n", "d");
  const nightCode = code.replace("d", "n");
  return (
    watercolorIcons[code] ||
    watercolorIcons[dayCode] ||
    watercolorIcons[nightCode] ||
    watercolorIcons["01d"]
  );
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

/**
 * Open-Meteo (WMO) to Watercolor Icon Adapter
 */
export function wmoToIconCode(
  wmoCode: number,
  isDay: number = 1
): { iconCode: string; desc: string } {
  const isNight = isDay === 0;

  switch (wmoCode) {
    case 0:
      return { iconCode: isNight ? "01n" : "01d", desc: isNight ? "Clear night" : "Clear sky" };
    case 1:
      return { iconCode: isNight ? "02n" : "02d", desc: isNight ? "Mostly clear" : "Mainly clear" };
    case 2:
      return { iconCode: isNight ? "03n" : "03d", desc: "Partly cloudy" };
    case 3:
      return { iconCode: isNight ? "04n" : "04d", desc: "Overcast" };
    case 45:
      return { iconCode: isNight ? "50n_fog" : "50d_fog", desc: "Fog" };
    case 48:
      return { iconCode: isNight ? "50n_mist" : "50d_mist", desc: "Depositing rime fog" };
    case 51:
    case 53:
      return { iconCode: isNight ? "09n_shower" : "09d_drizzle", desc: "Drizzle" };
    case 55:
      return { iconCode: isNight ? "09n" : "09d", desc: "Dense drizzle" };
    case 56:
    case 57:
      return { iconCode: isNight ? "09n" : "09d_drizzle", desc: "Freezing drizzle" };
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
      return { iconCode: isNight ? "13n" : "13d", desc: "Snow fall" };
    case 75:
    case 77:
      return { iconCode: isNight ? "13n" : "13d", desc: "Heavy snowfall" };
    case 80:
      return { iconCode: isNight ? "09n" : "09d", desc: "Rain showers" };
    case 81:
    case 82:
      return { iconCode: isNight ? "09n" : "10d_heavy", desc: "Heavy rain showers" };
    case 85:
    case 86:
      return { iconCode: isNight ? "13n" : "13d", desc: "Snow showers" };
    case 95:
      return { iconCode: isNight ? "11n" : "11d", desc: "Thunderstorm" };
    case 96:
    case 99:
      return { iconCode: isNight ? "11n" : "11d", desc: "Severe thunderstorm" };
    default:
      return { iconCode: isNight ? "01n" : "01d", desc: isNight ? "Clear night" : "Clear" };
  }
}

interface WeatherIconProps {
  iconCode?: string;
  wmoCode?: number;
  isDay?: number;
  description?: string;
  className?: string;
  fallbackEmoji?: string;
}

export function WeatherIcon({
  iconCode,
  wmoCode,
  isDay = 1,
  description,
  className = "w-8 h-8",
  fallbackEmoji,
}: WeatherIconProps) {
  const [imgFailed, setImgFailed] = useState(false);

  let resolvedCode = iconCode;
  let resolvedDesc = description;

  if (wmoCode !== undefined) {
    const mapped = wmoToIconCode(wmoCode, isDay);
    resolvedCode = mapped.iconCode;
    resolvedDesc = resolvedDesc || mapped.desc;
  }

  const { url, fallback } = getWeatherIconWithFallback(resolvedCode || "01d", resolvedDesc);
  const emoji = fallbackEmoji || fallback;

  if (imgFailed || !url) {
    return (
      <span className={`inline-flex items-center justify-center select-none text-2xl ${className}`} aria-hidden="true">
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={resolvedDesc || "weather icon"}
      className={`inline-block object-contain transition-opacity duration-200 select-none ${className}`}
      loading="lazy"
      onError={() => setImgFailed(true)}
    />
  );
}
