// src/lib/aiWatercolorGenerator.ts

// 1. City & Landmark specific vibrant watercolor artworks (always given top priority)
const LANDMARK_WATERCOLORS: Record<string, string> = {
  // Thailand & Southeast Asia
  ratchaburi:
    "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=75", // Lush rice paddies & Thai countryside
  bangkok:
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=75", // Wat Arun temple & Chao Phraya
  "chiang mai":
    "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=75",
  phuket:
    "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=800&q=75", // Emerald Andaman sea cliffs
  krabi:
    "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=800&q=75",
  singapore:
    "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=75", // Modern glowing waterfront
  bali:
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=75", // Terraced emerald water temple

  // East Asia
  tokyo:
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=75", // Mount Fuji & pagoda
  kyoto:
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=75",
  seoul:
    "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=800&q=75",

  // Europe
  london:
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=75",
  paris:
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=75",
  rome:
    "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=75",
  skopje:
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=75",

  // Americas & Worldwide
  "new york":
    "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=75",
  "san francisco":
    "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=75",
  sydney:
    "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=75",
};

// 2. Curated high-res watercolor artworks by weather condition
const WEATHER_WATERCOLORS: Record<string, string> = {
  thunderstorm:
    "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=75",
  rain:
    "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=800&q=75",
  snow:
    "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=75",
  fog:
    "https://images.unsplash.com/photo-1487621167305-5d248087c724?auto=format&fit=crop&w=800&q=75",
  clear:
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=75",
  clouds:
    "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=800&q=75",
};

// 3. Regional Townscape Fallback
function getRegionalArtwork(city: string, country?: string): string {
  const text = `${city} ${country || ""}`.toLowerCase();

  if (/thailand|vietnam|laos|cambodia|indonesia|malaysia|philippines|myanmar|siam/.test(text)) {
    return "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=75";
  }
  if (/japan|korea|taiwan/.test(text)) {
    return "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=75";
  }
  if (/france|italy|germany|spain|uk|england|britain|europe|austria|switzerland|macedonia/.test(text)) {
    return "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=75";
  }
  return "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=75";
}

// 4. Preload helper with timeout
export function preloadImage(url: string, timeoutMs = 6000): Promise<boolean> {
  if (typeof window === "undefined" || !url) return Promise.resolve(false);
  return new Promise((resolve) => {
    let resolved = false;
    const img = new Image();
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(true);
      }
    };
    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(false);
      }
    };
    img.src = url;
  });
}

// 5. Instant atmospheric CSS gradients
export function getInstantBackground(weatherCodeOrIcon: string | number): string {
  const code = Number(weatherCodeOrIcon);

  if (code >= 95) {
    return "linear-gradient(135deg, #1d1238 0%, #171d3d 50%, #0d1e2e 100%)";
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return "linear-gradient(135deg, #0f2838 0%, #15384d 50%, #1a4a5e 100%)";
  }
  if (code >= 71 && code <= 77) {
    return "linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)";
  }
  if (code === 45 || code === 48) {
    return "linear-gradient(135deg, #2b363c 0%, #3f4c54 50%, #5a6b75 100%)";
  }
  if (code === 0 || code === 1) {
    return "linear-gradient(135deg, #1a3c61 0%, #2563eb 50%, #c2691e 100%)";
  }
  if (code >= 2 && code <= 3) {
    return "linear-gradient(135deg, #1e2631 0%, #2d3b4b 50%, #3e4f61 100%)";
  }

  return "linear-gradient(135deg, #131c26 0%, #1e2c3c 50%, #2f3e50 100%)";
}

// 6. Main background resolver
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

  let targetArtwork = "";

  // 1. PRIORITY #1: Landmark match (e.g. Ratchaburi, Bangkok, Tokyo)
  for (const [name, url] of Object.entries(LANDMARK_WATERCOLORS)) {
    if (cityKey.includes(name)) {
      targetArtwork = url;
      break;
    }
  }

  // 2. PRIORITY #2: Weather conditions if no landmark matched
  if (!targetArtwork) {
    if (code >= 95 || descKey.includes("thunder") || descKey.includes("storm")) {
      targetArtwork = WEATHER_WATERCOLORS.thunderstorm;
    } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || descKey.includes("rain")) {
      targetArtwork = WEATHER_WATERCOLORS.rain;
    } else if ((code >= 71 && code <= 77) || descKey.includes("snow")) {
      targetArtwork = WEATHER_WATERCOLORS.snow;
    } else if (code === 45 || code === 48 || descKey.includes("fog") || descKey.includes("mist")) {
      targetArtwork = WEATHER_WATERCOLORS.fog;
    } else if (code === 0 || code === 1) {
      targetArtwork = WEATHER_WATERCOLORS.clear;
    } else if (code >= 2 && code <= 3) {
      targetArtwork = WEATHER_WATERCOLORS.clouds;
    } else {
      targetArtwork = getRegionalArtwork(city, country);
    }
  }

  // 3. Preload and verify image availability
  const isLoaded = await preloadImage(targetArtwork, 5000);
  if (isLoaded) {
    if (onGenerated) onGenerated(targetArtwork);
    return { initialBg: targetArtwork, isAi: true };
  }

  // Fallback to rich CSS gradient if network blocked or slow
  return { initialBg: fallbackGradient, isAi: false };
}
