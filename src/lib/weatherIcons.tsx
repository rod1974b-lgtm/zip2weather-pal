// src/lib/weatherIcons.tsx
import { useState } from "react";

/**
 * Accurately mapped dictionary connecting every semantic weather code to the exact
 * watercolor illustration file that visually depicts it.
 */
export const watercolorIcons: Record<string, string> = {
  // Day
  "01d": "/icons/watercolor/04d_overcast.png",          // Smiling bright sun with rays
  "02d": "/icons/watercolor/11d_thunderstorm.png",      // Sun behind small cloud (mostly clear)
  "03d": "/icons/watercolor/50d_mist.png",              // Two fluffy scattered clouds (partly cloudy)
  "04d_broken": "/icons/watercolor/09d_shower_rain.png",// Fluffy broken clouds
  "04d": "/icons/watercolor/02d_few_clouds.png",        // Dark gray overcast cloud
  "09d_drizzle": "/icons/watercolor/01d_clear_sky.png", // Cloud with 3 light drizzle drops
  "09d": "/icons/watercolor/13d_snow.png",              // Cloud with splashing shower rain drops
  "10d_light": "/icons/watercolor/01d_clear_sky.png",   // Cloud with 3 light rain drops
  "10d": "/icons/watercolor/50d_smoke.png",             // Cloud with steady rainfall
  "10d_heavy": "/icons/watercolor/10d_heavy_rain.png",  // Dark cloud with torrential rain
  "11d": "/icons/watercolor/10d_light_rain.png",        // Dark storm cloud with yellow lightning bolt
  "13d": "/icons/watercolor/01n_clear_night.png",       // Blue sparkling snowflake

  // Night
  "01n": "/icons/watercolor/03d_scattered.png",         // Crescent moon with stars (clear night)
  "02n": "/icons/watercolor/10n_rain_night.png",        // Crescent moon behind small clouds
  "03n": "/icons/watercolor/04n_overcast_night.png",    // Crescent moon behind fluffy scattered clouds
  "04n_broken": "/icons/watercolor/09n_shower_night.png",// Dark clouds covering moon
  "04n": "/icons/watercolor/09n_shower_night.png",      // Overcast night
  "09n_drizzle": "/icons/watercolor/04n_broken_night.png",// Crescent moon with 3 light raindrops
  "09n": "/icons/watercolor/03n_scattered_night.png",   // Night shower with crescent moon
  "10n": "/icons/watercolor/03n_scattered_night.png",   // Night rain with crescent moon
  "11n": "/icons/watercolor/02n_few_clouds_night.png",  // Night thunderstorm cloud with lightning & rain
  "13n": "/icons/watercolor/13n_snow_night.png",        // Snowflake with crescent moon and stars

  // Atmosphere & Conditions
  "50d": "/icons/watercolor/50d_haze_ratchaburi.png",   // Hazy sun through smog
  "50d_mist": "/icons/watercolor/04d_broken.png",       // Three light horizontal wavy mist bands
  "50d_fog": "/icons/watercolor/50d_dust.png",          // Three thick horizontal fog bands
  "50d_haze": "/icons/watercolor/50d_haze_ratchaburi.png", // Muted sun behind atmospheric haze
  "50d_haze_pure": "/icons/watercolor/50d_haze_pure.png", // Swirling dust storm
  "50d_haze_ratchaburi": "/icons/watercolor/09d_drizzle.png", // PM2.5 Ratchaburi Thailand badge
  "50d_dust": "/icons/watercolor/50d_haze_pure.png",    // Swirling golden dust vortex
  "50d_smoke": "/icons/watercolor/50d_haze_ratchaburi.png", // Smoky haze
  "50d_tornado": "/icons/watercolor/50d_tornado.png",   // Swirling tornado funnel
  "50d_wind": "/icons/watercolor/11n_thunderstorm_night.png", // Swirling light blue wind lines
  "50n": "/icons/watercolor/50d_wind.png",              // Night mist/fog with moon
  "50n_mist": "/icons/watercolor/04d_broken.png",       // Night mist bands
  "50n_fog": "/icons/watercolor/50d_wind.png",          // Moon resting behind fog layers
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
  if ((code.startsWith("09") || code.startsWith("10")) && desc.includes("drizzle")) {
    return code.endsWith("n") ? watercolorIcons["09n_drizzle"] : watercolorIcons["09d_drizzle"];
  }

  // Atmosphere by description
  if (code.startsWith("50") || desc.includes("haze") || desc.includes("fog") || desc.includes("mist")) {
    if (desc.includes("mist")) return code.endsWith("n") ? watercolorIcons["50n_mist"] : watercolorIcons["50d_mist"];
    if (desc.includes("fog")) return code.endsWith("n") ? watercolorIcons["50n_fog"] : watercolorIcons["50d_fog"];
    if (desc.includes("pm2.5") || desc.includes("ratchaburi")) return watercolorIcons["50d_haze_ratchaburi"];
    if (desc.includes("haze") || desc.includes("smog")) return watercolorIcons["50d_haze"];
    if (desc.includes("dust") || desc.includes("sand") || desc.includes("ash")) return watercolorIcons["50d_dust"];
    if (desc.includes("smoke")) return watercolorIcons["50d_smoke"];
    if (desc.includes("tornado") || desc.includes("squall")) return watercolorIcons["50d_tornado"];
    if (desc.includes("wind") || desc.includes("breeze")) return watercolorIcons["50d_wind"];
    return watercolorIcons["50d_haze"];
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
 * Maps WMO weather codes (0-99) + is_day (0/1) directly to accurate watercolor icons and condition labels.
 */
export function wmoToIconCode(
  wmoCode: number,
  isDay: number = 1,
  _cityName?: string,
  _aqi?: number
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
      return { iconCode: isNight ? "09n_drizzle" : "09d_drizzle", desc: "Light drizzle" };
    case 53:
      return { iconCode: isNight ? "09n_drizzle" : "09d_drizzle", desc: "Moderate drizzle" };
    case 55:
      return { iconCode: isNight ? "09n" : "09d", desc: "Dense drizzle" };
    case 56:
    case 57:
      return { iconCode: isNight ? "09n_drizzle" : "09d_drizzle", desc: "Freezing drizzle" };
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
      return { iconCode: isNight ? "13n" : "13d", desc: "Light snow" };
    case 73:
      return { iconCode: isNight ? "13n" : "13d", desc: "Moderate snow" };
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
