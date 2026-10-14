// src/lib/aiWatercolorGenerator.ts

export function generateWatercolorPrompt(city: string, weatherDesc: string, temp: number): string {
  const landmarks: Record<string, string> = {
    skopje: "Stone Bridge and Fortress Kale, Vardar River",
    ratchaburi: "rice fields with water buffalo, Thai countryside",
    bangkok: "Wat Arun Temple, Chao Phraya River, golden spires",
    tokyo: "Tokyo Tower and cherry blossoms",
    kyoto: "Fushimi Inari gates and traditional temple",
    london: "Big Ben and Thames River",
    paris: "Eiffel Tower and Seine",
    "new york": "Manhattan skyline and Central Park",
  };

  let landmark = "";
  const cityLower = city.toLowerCase();
  for (const [key, value] of Object.entries(landmarks)) {
    if (cityLower.includes(key)) {
      landmark = value;
      break;
    }
  }
  if (!landmark) landmark = `famous landmarks of ${city}`;

  return `vibrant watercolor painting of ${city}, ${landmark}, ${weatherDesc} weather, ${temp}°C, highly saturated vivid colors, artistic, for weather app hero card background`;
}

interface WatercolorCache {
  [key: string]: {
    imageUrl: string;
    city: string;
    weather: string;
    timestamp: number;
  };
}

const CACHE_KEY = "ai_watercolor_cache";

function getCache(): WatercolorCache {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setCache(key: string, data: { imageUrl: string; city: string; weather: string; timestamp: number }) {
  if (typeof window === "undefined") return;
  try {
    const current = getCache();
    current[key] = data;
    localStorage.setItem(CACHE_KEY, JSON.stringify(current));
  } catch {}
}

export async function generateWatercolorImage(city: string, weatherDesc: string, temp: number): Promise<string> {
  const cacheKey = `${city.toLowerCase()}_${weatherDesc.toLowerCase()}`.replace(/\s+/g, "_");
  const cache = getCache();
  if (cache[cacheKey]?.imageUrl) {
    return cache[cacheKey].imageUrl;
  }

  const prompt = generateWatercolorPrompt(city, weatherDesc, temp);
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&model=flux&enhance=true&nologo=true&seed=${Math.floor(
    Math.random() * 10000
  )}`;

  setCache(cacheKey, {
    imageUrl,
    city,
    weather: weatherDesc,
    timestamp: Date.now(),
  });

  if (typeof window !== "undefined") {
    const img = new Image();
    img.src = imageUrl;
  }

  return imageUrl;
}

export function getInstantBackground(city: string, weatherCodeOrIcon: string | number): string {
  const cityLower = city.toLowerCase();
  if (cityLower.includes("ratchaburi")) return "/backgrounds/vibrant/ratchaburi_haze.jpg";
  if (cityLower.includes("skopje")) return "/backgrounds/vibrant/skopje_rain.jpg";
  if (cityLower.includes("bangkok")) return "/backgrounds/vibrant/bangkok_sunny.jpg";
  if (cityLower.includes("tokyo") || cityLower.includes("kyoto")) return "/backgrounds/vibrant/kyoto_rain.jpg";
  if (cityLower.includes("new york")) return "/backgrounds/vibrant/cloudy_ny.jpg";

  const code = Number(weatherCodeOrIcon);
  if (code === 0 || code === 1) return "/backgrounds/vibrant/sunny_bangkok.jpg";
  if (code >= 2 && code <= 3) return "/backgrounds/vibrant/overcast.jpg";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "/backgrounds/vibrant/rain_skopje.jpg";
  if (code >= 95) return "/backgrounds/vibrant/storm.jpg";
  if (code >= 71 && code <= 77) return "/backgrounds/vibrant/snow_swiss.jpg";
  if (code === 45 || code === 48) return "/backgrounds/vibrant/haze_ratchaburi.jpg";

  return "/backgrounds/vibrant/rain_skopje.jpg";
}

export async function getCityWeatherBackground(
  city: string,
  weatherDesc: string,
  weatherCode: string | number,
  temp: number,
  onGenerated?: (url: string) => void
): Promise<string> {
  if (typeof window !== "undefined") {
    const manual = localStorage.getItem("weather:sky-pref") || localStorage.getItem("app_background");
    if (manual && manual !== "auto") {
      return `/backgrounds/vibrant/${manual}.jpg`;
    }
  }

  const cacheKey = `${city.toLowerCase()}_${weatherDesc.toLowerCase()}`.replace(/\s+/g, "_");
  const cache = getCache();
  if (cache[cacheKey]?.imageUrl) {
    return cache[cacheKey].imageUrl;
  }

  const instant = getInstantBackground(city, weatherCode);

  generateWatercolorImage(city, weatherDesc, temp)
    .then((url) => {
      if (onGenerated) onGenerated(url);
    })
    .catch(console.error);

  return instant;
}
