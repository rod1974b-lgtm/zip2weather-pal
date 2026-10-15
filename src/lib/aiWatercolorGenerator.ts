// src/lib/aiWatercolorGenerator.ts

// 1. Curated City & Landmark Vibrant Artworks (Top Priority)
const LANDMARK_WATERCOLORS: Record<string, string> = {
  // Thailand & Southeast Asia
  ratchaburi:
    "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=75", // Rice paddies & countryside
  bangkok:
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=75", // Wat Arun temple & Chao Phraya
  "chiang mai":
    "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=75",
  phuket:
    "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=800&q=75",
  krabi:
    "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=800&q=75",
  singapore:
    "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=75",
  bali:
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=75",

  // East Asia
  tokyo:
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=75",
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

// 2. Weather condition art
const WEATHER_WATERCOLORS: {
  thunderstorm: string;
  rain: string;
  snow: string;
  fog: string;
  clear: string;
  clouds: string;
} = {
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

// 3. Regional townscape fallback
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

// In-memory cache for fast switching during current session
const loadedImageCache = new Set<string>();

// 4. Preload helper with referrer policy to prevent CDN blocks
export function preloadImage(url: string, timeoutMs = 8000): Promise<boolean> {
  if (typeof window === "undefined" || !url) return Promise.resolve(false);
  if (loadedImageCache.has(url)) return Promise.resolve(true);

  return new Promise((resolve) => {
    let resolved = false;
    const img = new Image();
    img.referrerPolicy = "no-referrer";

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
        loadedImageCache.add(url);
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

// 6. Dynamic Wikipedia Landmark Discovery Scanner
interface WikiPage {
  pageid: number;
  title: string;
  description?: string;
  thumbnail?: { source: string; width: number; height: number };
}

const LANDMARK_POSITIVE =
  /temple|monument|park|museum|palace|shrine|castle|tower|mountain|beach|lake|pagoda|cathedral|bridge|garden|landmark|ruin|waterfall|sanctuary|historic|square/i;
const LANDMARK_NEGATIVE =
  /railway|station|hospital|clinic|highway|airport|stadium|subway|bus|depot|headquarters|school/i;

async function scanWikipediaLandmarks(
  lat: number,
  lon: number,
  cityName: string
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const cacheKey = `weather:landmark:${cityName.toLowerCase().trim()}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch {}

  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lon}&ggsradius=10000&ggslimit=10&prop=pageimages|description&piprop=thumbnail&pithumbsize=1000&format=json&origin=*`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;

    const data = await res.json();
    const pages = Object.values((data?.query?.pages || {}) as Record<string, WikiPage>);

    if (!pages.length) return null;

    // Filter pages that actually have a good thumbnail
    const withImages = pages.filter(
      (p) => p.thumbnail?.source && (p.thumbnail.width >= 500 || p.thumbnail.height >= 400)
    );

    if (!withImages.length) return null;

    // Score based on tourist appeal & architectural significance
    let bestPage: WikiPage = withImages[0];
    let bestScore = -100;

    for (const p of withImages) {
      const text = `${p.title} ${p.description || ""}`.toLowerCase();
      let score = 0;

      if (LANDMARK_POSITIVE.test(text)) score += 50;
      if (text.includes("province") || text.includes("city") || text.includes("town")) score += 20;
      if (LANDMARK_NEGATIVE.test(text)) score -= 60;

      if (score > bestScore) {
        bestScore = score;
        bestPage = p;
      }
    }

    const imageUrl = bestPage.thumbnail?.source;
    if (imageUrl) {
      try {
        localStorage.setItem(cacheKey, imageUrl);
      } catch {}
      return imageUrl;
    }
  } catch {
    // Network or parse issue — silently fallback
  }

  return null;
}

// 7. Main Background Resolver (Catalog -> Wikipedia Scan -> Weather Scene)
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
  country?: string,
  lat?: number,
  lon?: number
): Promise<BackgroundResult> {
  const fallbackGradient = getInstantBackground(weatherCode);
  const cityKey = city.toLowerCase();
  const descKey = weatherDesc.toLowerCase();
  const code = Number(weatherCode);

  // 1. Check curated catalog first
  let targetArtwork = "";
  for (const [name, url] of Object.entries(LANDMARK_WATERCOLORS)) {
    if (cityKey.includes(name)) {
      targetArtwork = url;
      break;
    }
  }

  // 2. Check cached landmark for this city
  if (!targetArtwork && typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`weather:landmark:${cityKey.trim()}`);
      if (cached) targetArtwork = cached;
    } catch {}
  }

  // 3. Fallback weather condition artwork if no catalog/cached item
  let weatherFallback = "";
  if (code >= 95 || descKey.includes("thunder") || descKey.includes("storm")) {
    weatherFallback = WEATHER_WATERCOLORS.thunderstorm;
  } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || descKey.includes("rain")) {
    weatherFallback = WEATHER_WATERCOLORS.rain;
  } else if ((code >= 71 && code <= 77) || descKey.includes("snow")) {
    weatherFallback = WEATHER_WATERCOLORS.snow;
  } else if (code === 45 || code === 48 || descKey.includes("fog") || descKey.includes("mist")) {
    weatherFallback = WEATHER_WATERCOLORS.fog;
  } else if (code === 0 || code === 1) {
    weatherFallback = WEATHER_WATERCOLORS.clear;
  } else if (code >= 2 && code <= 3) {
    weatherFallback = WEATHER_WATERCOLORS.clouds;
  } else {
    weatherFallback = getRegionalArtwork(city, country);
  }

  // If we already know the target artwork (catalog or cache), load it
  if (targetArtwork) {
    preloadImage(targetArtwork, 6000).then((ok) => {
      if (ok && onGenerated) onGenerated(targetArtwork);
    });
    return {
      initialBg: loadedImageCache.has(targetArtwork) ? targetArtwork : fallbackGradient,
      isAi: loadedImageCache.has(targetArtwork),
    };
  }

  // 4. Kick off Wikipedia Landmark Discovery asynchronously for uncataloged cities
  if (lat !== undefined && lon !== undefined) {
    scanWikipediaLandmarks(lat, lon, city).then(async (wikiUrl) => {
      if (wikiUrl) {
        const loaded = await preloadImage(wikiUrl, 6000);
        if (loaded && onGenerated) {
          onGenerated(wikiUrl);
          return;
        }
      }
      // If no Wikipedia landmark, load weather-themed artwork
      const weatherLoaded = await preloadImage(weatherFallback, 6000);
      if (weatherLoaded && onGenerated) {
        onGenerated(weatherFallback);
      }
    });
  } else {
    // No coordinates, load weather fallback
    preloadImage(weatherFallback, 6000).then((loaded) => {
      if (loaded && onGenerated) onGenerated(weatherFallback);
    });
  }

  return { initialBg: fallbackGradient, isAi: false };
}
