// src/lib/aiWatercolorGenerator.ts

// 1. Curated high-res watercolor artworks by weather condition
const WEATHER_WATERCOLORS: Record<string, string> = {
  // Dramatic purple-slate thunderstorm clouds with electric highlights
  thunderstorm:
    "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1200&q=80",
  // Emerald & teal rain wash with reflective pavements
  rain:
    "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=1200&q=80",
  // Luminous frosty alpine snow & glowing winter light
  snow:
    "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
  // Ethereal dreamlike morning mist & soft pastel horizon
  fog:
    "https://images.unsplash.com/photo-1487621167305-5d248087c724?auto=format&fit=crop&w=1200&q=80",
  // Radiant golden sunshine & vibrant countryside landscape
  clear:
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
  // Soft sculpted atmospheric cloudscapes
  clouds:
    "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1200&q=80",
};

// 2. City & Landmark specific vibrant watercolor artworks
const LANDMARK_WATERCOLORS: Record<string, string> = {
  // Thailand & Southeast Asia
  ratchaburi:
    "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=80", // Lush rice paddies & Thai countryside
  bangkok:
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80", // Wat Arun temple & Chao Phraya
  "chiang mai":
    "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=80",
  phuket:
    "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80", // Emerald Andaman sea cliffs
  krabi:
    "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80",
  singapore:
    "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80", // Modern glowing waterfront
  bali:
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80", // Terraced emerald water temple

  // East Asia
  tokyo:
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80", // Mount Fuji & pagoda
  kyoto:
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
  seoul:
    "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1200&q=80",

  // Europe
  london:
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80", // Historic European riverside
  paris:
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80", // Seine & Parisian avenues
  rome:
    "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80", // Terracotta Roman architecture
  skopje:
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80", // Stone bridge & mountain backdrop

  // Americas & Worldwide
  "new york":
    "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80", // Manhattan skyline & bridge
  "san francisco":
    "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1200&q=80", // Golden Gate bay
  sydney:
    "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80", // Sydney Harbour
};

// 3. Regional Townscape Fallback (for any city/town with no famous landmark)
function getRegionalArtwork(city: string, country?: string): string {
  const text = `${city} ${country || ""}`.toLowerCase();

  // Southeast Asian tropical towns (Thailand, Vietnam, Indonesia, etc.)
  if (/thailand|vietnam|laos|cambodia|indonesia|malaysia|philippines|myanmar|siam/.test(text)) {
    return "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=80";
  }
  // East Asian towns (Japan, Korea, Taiwan)
  if (/japan|korea|taiwan/.test(text)) {
    return "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80";
  }
  // European historic towns
  if (/france|italy|spain|portugal|germany|austria|switzerland|netherlands|belgium|poland|czech|croatia|greece|uk|macedonia|serbia/.test(text)) {
    return "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80";
  }
  // General picturesque nature & horizon
  return "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80";
}

// 4. Preload verification helper
export function preloadImage(url: string, timeoutMs = 6000): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(true);
      }
    };

    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(false);
      }
    };

    img.src = url;
  });
}

// 5. Instant atmospheric CSS gradients (rich, zero-network, reliable backdrops)
export function getInstantBackground(weatherCodeOrIcon: string | number): string {
  const code = Number(weatherCodeOrIcon);

  // Thunderstorm / Severe
  if (code >= 95) {
    return "linear-gradient(135deg, #1d1238 0%, #171d3d 50%, #0d1e2e 100%)";
  }
  // Rain / Showers
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return "linear-gradient(135deg, #0f2838 0%, #15384d 50%, #1a4a5e 100%)";
  }
  // Snow
  if (code >= 71 && code <= 77) {
    return "linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)";
  }
  // Fog / Mist / Haze
  if (code === 45 || code === 48) {
    return "linear-gradient(135deg, #2b363c 0%, #3f4c54 50%, #5a6b75 100%)";
  }
  // Clear / Sunny
  if (code === 0 || code === 1) {
    return "linear-gradient(135deg, #1a3c61 0%, #2563eb 50%, #c2691e 100%)";
  }
  // Overcast / Cloudy
  if (code >= 2 && code <= 3) {
    return "linear-gradient(135deg, #1e2631 0%, #2d3b4b 50%, #3e4f61 100%)";
  }

  return "linear-gradient(135deg, #131c26 0%, #1e2c3c 50%, #2f3e50 100%)";
}

// 6. Main background resolver called by WeatherView
export interface BackgroundResult {
  initialBg: string;
  isAi: boolean;
}

export async function getCityWeatherBackground(
  city: string,
  weatherDesc: string,
  weatherCode: string | number,
  _temp: number,
  onGenerated?: (url: string) => void,
  country?: string
): Promise<BackgroundResult> {
  // Check user manual sky override first
  if (typeof window !== "undefined") {
    const manual = localStorage.getItem("weather:sky-pref") || localStorage.getItem("app_background");
    if (manual && manual !== "auto") {
      return {
        initialBg: getInstantBackground(weatherCode),
        isAi: false,
      };
    }
  }

  const fallbackGradient = getInstantBackground(weatherCode);
  const cityKey = city.toLowerCase();
  const descKey = weatherDesc.toLowerCase();
  const code = Number(weatherCode);

  // 1. Prioritize extreme weather (thunderstorms, heavy rains, blizzards)
  let targetArtwork = "";
  if (code >= 95 || descKey.includes("thunder") || descKey.includes("storm")) {
    targetArtwork = WEATHER_WATERCOLORS.thunderstorm;
  } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || descKey.includes("rain")) {
    targetArtwork = WEATHER_WATERCOLORS.rain;
  } else if ((code >= 71 && code <= 77) || descKey.includes("snow")) {
    targetArtwork = WEATHER_WATERCOLORS.snow;
  } else if (code === 45 || code === 48 || descKey.includes("fog") || descKey.includes("mist")) {
    targetArtwork = WEATHER_WATERCOLORS.fog;
  }

  // 2. If weather is calm/clear/cloudy, match landmark first
  if (!targetArtwork) {
    for (const [name, url] of Object.entries(LANDMARK_WATERCOLORS)) {
      if (cityKey.includes(name)) {
        targetArtwork = url;
        break;
      }
    }
  }

  // 3. Fallback to regional or general clear/cloudy watercolor
  if (!targetArtwork) {
    if (code === 0 || code === 1) {
      targetArtwork = WEATHER_WATERCOLORS.clear;
    } else if (code >= 2 && code <= 3) {
      targetArtwork = WEATHER_WATERCOLORS.clouds;
    } else {
      targetArtwork = getRegionalArtwork(city, country);
    }
  }

  // 4. Preload and verify image availability
  const isLoaded = await preloadImage(targetArtwork, 4000);
  if (isLoaded) {
    if (onGenerated) onGenerated(targetArtwork);
    return { initialBg: targetArtwork, isAi: true };
  }

  // Fallback to rich CSS gradient if network blocked
  return { initialBg: fallbackGradient, isAi: false };
}
