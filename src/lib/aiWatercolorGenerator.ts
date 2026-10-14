// src/lib/aiWatercolorGenerator.ts

// 1. Curated global & regional landmark map (50+ cities)
const FAMOUS_LANDMARKS: Record<string, string> = {
  // Thailand & Southeast Asia
  bangkok: "Wat Arun temple spires, Grand Palace, Chao Phraya river with longtail boats",
  ratchaburi: "lush green rice paddies, water buffalo, serene Thai countryside canals",
  "chiang mai": "Wat Phra That Doi Suthep mountain temple, ancient brick city moat and Lanna lanterns",
  "chiang rai": "Wat Rong Khun White Temple, misty rolling northern hills",
  phuket: "Promthep Cape sea cliffs, turquoise Andaman waves, colorful Sino-Portuguese old town",
  pattaya: "Sanctuary of Truth wooden seaside temple, curved bay shoreline",
  krabi: "towering limestone karst cliffs, emerald Andaman waters, traditional wooden longtail boats",
  singapore: "Marina Bay Sands silhouette, Supertree Grove, Singapore river promenade",
  "kuala lumpur": "Petronas Twin Towers, glowing skyline, tropical greenery",
  hanoi: "Old Quarter tree-lined streets, Hoan Kiem Lake, red bridge and Turtle Tower",
  "ho chi minh": "Notre-Dame Cathedral Basilica of Saigon, Saigon riverfront skyline",
  bali: "Pura Ulun Danu Bratan water temple, terraced emerald rice paddies, Mount Batur",
  jakarta: "National Monument Monas, bustling modern skyline, vibrant city avenues",
  manila: "Intramuros Spanish colonial stone walls, San Agustin Church, Manila Bay sunset",

  // East & South Asia
  tokyo: "Tokyo Tower, Shibuya crossing cityscape, Mount Fuji silhouette in distance",
  kyoto: "Fushimi Inari vermilion torii gates, traditional wooden pagoda, bamboo grove",
  osaka: "historic Osaka Castle fortress, vibrant Dotonbori canal reflections",
  seoul: "N Seoul Tower atop Namsan, Gyeongbokgung Palace gates, Bukchon Hanok roofs",
  "hong kong": "Victoria Harbour skyline, iconic Star Ferry, Victoria Peak panorama",
  taipei: "Taipei 101 tower rising above lush Elephant Mountain hills",
  beijing: "Temple of Heaven circular hall, ancient imperial courtyard architecture",
  shanghai: "The Bund colonial promenade, futuristic Oriental Pearl Pudong skyline",
  mumbai: "Gateway of India stone archway, Marine Drive seaside promenade",
  delhi: "India Gate grand arch, Lotus Temple marble petals, Mughal gardens",
  kathmandu: "Boudhanath Stupa prayer flags, snow-capped Himalayan peaks backdrop",

  // Europe
  skopje: "historic stone bridge, Kale Fortress, Vardar River with Mount Vodno backdrop",
  london: "Big Ben clock tower, Palace of Westminster, Thames River with red double-decker bus",
  paris: "Eiffel Tower rising above the Seine river, Haussmann limestone balconies",
  rome: "ancient Roman Colosseum, umbrella pine trees, warm terracotta rooftops",
  barcelona: "Sagrada Família towering spires, Park Güell mosaic terrace, Mediterranean breeze",
  amsterdam: "historic 17th-century canal ring houses, arched brick bridges, bicycles",
  venice: "Grand Canal, ornate Venetian palazzos, gondolas gliding under Rialto Bridge",
  florence: "Santa Maria del Fiore Duomo dome, Ponte Vecchio over the Arno river",
  berlin: "Brandenburg Gate columns, Alexanderplatz TV Tower, leafy Tiergarten boulevard",
  prague: "Charles Bridge with gothic statues, Prague Castle towers over Vltava river",
  vienna: "St. Stephen's Gothic cathedral, imperial Hofburg palace, grand Ringstrasse",
  athens: "Parthenon atop the Acropolis hill, ancient olive groves, Aegean light",
  dublin: "Ha'penny Bridge over River Liffey, colorful Georgian doorways, cozy pub facades",
  edinburgh: "Edinburgh Castle perched on volcanic rock, medieval Royal Mile alleyways",
  zurich: "Limmat riverfront guild houses, Grossmünster twin towers, distant Swiss Alps",

  // Americas & Oceania
  "new york": "Manhattan skyline, Brooklyn Bridge cables, Central Park reservoir reflections",
  "san francisco": "Golden Gate Bridge over misty blue bay, painted Victorian houses, cable car",
  "los angeles": "palm-lined Beverly boulevard, Hollywood Hills backdrop, Pacific coastline",
  chicago: "iconic architectural skyscrapers, Lake Michigan shoreline, Chicago River bridges",
  miami: "Art Deco pastel hotels on Ocean Drive, vibrant palm trees, South Beach waves",
  toronto: "CN Tower needle, Lake Ontario waterfront marina, dynamic urban skyline",
  vancouver: "glass downtown towers framed by forested Pacific mountains and harbor waters",
  "rio de janeiro": "Christ the Redeemer atop Corcovado mountain, Sugarloaf hill, Copacabana curve",
  "buenos aires": "Teatro Colón, pink Casa Rosada, jacaranda trees along wide boulevards",
  sydney: "Sydney Opera House sail roofs, Sydney Harbour Bridge, sparkling blue ocean harbor",
  melbourne: "Flinders Street station yellow facade, Yarra riverbank, charming laneways",

  // Middle East & Africa
  dubai: "Burj Khalifa soaring spire, Dubai Creek traditional dhow boats, desert dunes in distance",
  cairo: "Great Pyramids of Giza, Sphinx silhouette, Nile river felucca sailboats",
  "cape town": "Table Mountain flat plateau, Atlantic ocean coastline, colorful Bo-Kaap cottages",
  marrakech: "Koutoubia Mosque minaret, warm terracotta medina walls, vibrant tile mosaics",
  istanbul: "Hagia Sophia domes and minarets, Bosphorus strait with ferries, Galata Tower",
};

// 2. Regional Townscape Atmosphere for any town with few or no famous landmarks
function getRegionalTownscape(city: string, country?: string): string {
  const text = `${city} ${country || ""}`.toLowerCase();

  if (/thailand|vietnam|laos|cambodia|indonesia|malaysia|philippines|myanmar|siam/.test(text)) {
    return `charming tropical townscape of ${city}, traditional ceramic and teak roofs, lush coconut palms, quiet canal or vibrant night market street`;
  }
  if (/japan|korea|taiwan/.test(text)) {
    return `serene streetscape of ${city}, neat tiled rooftops, clean orderly streets, distant forested green hills`;
  }
  if (/france|italy|spain|portugal|germany|austria|switzerland|netherlands|belgium|poland|czech|croatia|greece|sweden|norway|denmark|finland|ireland|scotland|england|uk|macedonia|serbia/.test(text)) {
    return `picturesque European town square in ${city}, charming historic facades, cobblestone alleyway, a village church tower, warm inviting cafe windows`;
  }
  if (/mexico|brazil|argentina|colombia|chile|peru|costa rica|guatemala|cuba/.test(text)) {
    return `colorful vibrant town of ${city}, pastel-painted colonial buildings, central plaza with flowering trees and mountain backdrop`;
  }
  if (/egypt|morocco|turkey|uae|saudi|jordan|oman|tunisia/.test(text)) {
    return `historic sun-warmed stone architecture of ${city}, arched doorways, clay rooftop terraces, warm earthen color palette`;
  }
  if (/usa|united states|canada|australia|new zealand/.test(text)) {
    return `classic scenic townscape of ${city}, leafy main street, charming local buildings, surrounded by open rolling countryside`;
  }

  return `scenic townscape of ${city}, central street and neighborhood rooftops, framed by local landscape and natural horizons`;
}

// 3. Dynamic Weather Atmosphere descriptors
function getWeatherAtmosphere(weatherDesc: string, temp: number): string {
  const w = weatherDesc.toLowerCase();

  if (w.includes("thunder") || w.includes("storm") || w.includes("lightning")) {
    return "dramatic deep purple-slate thunderclouds, cinematic atmospheric sky with vibrant electric highlights and glistening wet reflections";
  }
  if (w.includes("rain") || w.includes("drizzle") || w.includes("shower")) {
    return "gentle rainfall, wet reflective pavements, glistening rooftops, vivid water reflections and moody cinematic watercolor washes";
  }
  if (w.includes("snow") || w.includes("blizzard") || w.includes("flurr") || temp <= 0) {
    return "soft blankets of fresh snow on rooftops and trees, frosty winter air, cozy warm glowing lights from windows";
  }
  if (w.includes("fog") || w.includes("mist") || w.includes("haze")) {
    return "ethereal soft drifting mist, layered atmospheric depth, diffused dreamlike watercolor tones with warm glowing lights";
  }
  if (w.includes("clear") || w.includes("sun")) {
    return "radiant warm sunlight, bright luminous sky, rich vivid color palette and soft golden shadows";
  }
  if (w.includes("cloud") || w.includes("overcast")) {
    return "dramatic sculpted clouds, soft diffused daylight, rich atmospheric depth and vivid architectural colors";
  }

  return "artistic ambient light, rich saturated tones and harmonious watercolor textures";
}

// 4. Generate the final AI watercolor prompt
export function generateWatercolorPrompt(
  city: string,
  weatherDesc: string,
  temp: number,
  country?: string
): string {
  const cityLower = city.toLowerCase();

  let subject = "";
  for (const [key, landmarkDesc] of Object.entries(FAMOUS_LANDMARKS)) {
    if (cityLower.includes(key)) {
      subject = `${city}, ${landmarkDesc}`;
      break;
    }
  }

  if (!subject) {
    subject = getRegionalTownscape(city, country);
  }

  const weatherMood = getWeatherAtmosphere(weatherDesc, temp);

  return `vibrant watercolor painting of ${subject}, ${weatherDesc} weather, ${temp}°C, ${weatherMood}, highly saturated vivid colors, master artist quality, clean composition for weather app hero background`;
}

// 5. Caching Engine
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

function setCache(
  key: string,
  data: { imageUrl: string; city: string; weather: string; timestamp: number }
) {
  if (typeof window === "undefined") return;
  try {
    const current = getCache();
    current[key] = data;
    localStorage.setItem(CACHE_KEY, JSON.stringify(current));
  } catch {}
}

// 6. Preload image verification helper
export function preloadImage(url: string, timeoutMs = 8000): Promise<boolean> {
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

// 7. Instant fallback CSS gradients (rich, zero-network, reliable backdrops)
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

// 8. Main entry point called by WeatherView
export interface BackgroundResult {
  initialBg: string;
  isAi: boolean;
}

export async function getCityWeatherBackground(
  city: string,
  weatherDesc: string,
  weatherCode: string | number,
  temp: number,
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

  const cacheKey = `${city.toLowerCase()}_${weatherDesc.toLowerCase()}`.replace(/\s+/g, "_");
  const cache = getCache();
  const cachedUrl = cache[cacheKey]?.imageUrl;

  // Instant fallback CSS gradient while generating
  const fallbackGradient = getInstantBackground(weatherCode);

  // If already in cache, verify image availability quickly
  if (cachedUrl) {
    const isLoaded = await preloadImage(cachedUrl, 2500);
    if (isLoaded) {
      return { initialBg: cachedUrl, isAi: true };
    }
  }

  // Generate fresh AI artwork in the background
  const prompt = generateWatercolorPrompt(city, weatherDesc, temp, country);
  const encodedPrompt = encodeURIComponent(prompt);
  const freshUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&model=flux&enhance=true&nologo=true&seed=${Math.floor(
    Math.random() * 10000
  )}`;

  preloadImage(freshUrl, 10000)
    .then((loaded) => {
      if (loaded) {
        setCache(cacheKey, {
          imageUrl: freshUrl,
          city,
          weather: weatherDesc,
          timestamp: Date.now(),
        });
        if (onGenerated) onGenerated(freshUrl);
      }
    })
    .catch(() => {});

  return { initialBg: fallbackGradient, isAi: false };
}
