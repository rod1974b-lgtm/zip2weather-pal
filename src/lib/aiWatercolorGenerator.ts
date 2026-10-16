// src/lib/aiWatercolorGenerator.ts

// 1. Curated City & Landmark Vibrant Artworks (Multiple variants per destination)
export const LANDMARK_WATERCOLORS: Record<string, string[]> = {
  // Thailand & Southeast Asia
  ratchaburi: [
    "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=75", // Rice paddies & scenic countryside
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=75", // Traditional riverside temple
    "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=75", // Tropical limestone karst
  ],
  bangkok: [
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=75", // Wat Arun & Chao Phraya
    "https://images.unsplash.com/photo-1563492065599-3580f77520f2?auto=format&fit=crop&w=800&q=75", // Grand Palace golden stupa
    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=75", // Evening skyline & river
  ],
  "chiang mai": [
    "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=75", // Doi Suthep mist & mountain
    "https://images.unsplash.com/photo-1512553353614-82a7370096dc?auto=format&fit=crop&w=800&q=75", // Lanna ancient temple
  ],
  phuket: [
    "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=800&q=75", // Andaman emerald sea
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=75", // Sunset tropical bay
  ],
  krabi: [
    "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=800&q=75",
    "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=75",
  ],
  singapore: [
    "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=75", // Marina Bay Sands watercolor
    "https://images.unsplash.com/photo-1506351421178-63b52a2d2562?auto=format&fit=crop&w=800&q=75", // Supertree Grove gardens
  ],
  bali: [
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=75", // Ulun Danu water temple
    "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=75", // Tegalalang terraces
  ],

  // East Asia
  tokyo: [
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=75", // Mount Fuji & pagoda
    "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=75", // Tokyo Tower sunset
  ],
  kyoto: [
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=75",
    "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=75",
  ],
  seoul: [
    "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=800&q=75", // Gyeongbokgung palace
    "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=800&q=75", // N Seoul Tower night
  ],

  // Europe
  london: [
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=75", // Big Ben & Westminster
    "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=75", // Tower Bridge
  ],
  paris: [
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=75", // Eiffel Tower morning mist
    "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=75", // Pont des Arts & Seine
  ],
  rome: [
    "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=75", // Colosseum watercolor
    "https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&w=800&q=75", // Trevi Fountain
  ],
  skopje: [
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=75", // Stone Bridge & Vardar river
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=75",
  ],

  // Americas & Worldwide
  "new york": [
    "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=75", // Brooklyn Bridge
    "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&w=800&q=75", // Central Park skyline
  ],
  "san francisco": [
    "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=75", // Golden Gate Bridge
    "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=800&q=75",
  ],
  sydney: [
    "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=75", // Sydney Opera House
    "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&w=800&q=75", // Harbour Bridge
  ],
};

// 2. Weather condition art variants
export const WEATHER_WATERCOLORS: Record<string, string[]> = {
  thunderstorm: [
    "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=75",
    "https://images.unsplash.com/photo-1511289081-d06dda19034d?auto=format&fit=crop&w=800&q=75",
  ],
  rain: [
    "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=800&q=75",
    "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=800&q=75",
  ],
  snow: [
    "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=75",
    "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=800&q=75",
  ],
  fog: [
    "https://images.unsplash.com/photo-1487621167305-5d248087c724?auto=format&fit=crop&w=800&q=75",
    "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=75",
  ],
  clear: [
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=75",
    "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=800&q=75",
  ],
  clouds: [
    "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=800&q=75",
    "https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?auto=format&fit=crop&w=800&q=75",
  ],
};

// Regional townscape fallback
function getRegionalArtwork(city: string, country?: string): string[] {
  const text = `${city} ${country || ""}`.toLowerCase();

  if (/thailand|vietnam|laos|cambodia|indonesia|malaysia|philippines|myanmar|siam/.test(text)) {
    return [
      "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=75",
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=75",
    ];
  }
  if (/japan|korea|taiwan/.test(text)) {
    return [
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=75",
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=75",
    ];
  }
  if (/france|italy|germany|spain|uk|england|britain|europe|austria|switzerland|macedonia/.test(text)) {
    return [
      "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=75",
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=75",
    ];
  }
  return [
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=75",
    "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=800&q=75",
  ];
}

// In-memory cache for instant switching during the active session
const loadedImageCache = new Set<string>();

// Preload helper with referrer policy to prevent CDN blocks
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

// Instant atmospheric CSS gradients
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

// Client-side Custom User Photo Storage
export function getSavedUserPhoto(cityName: string): string | null {
  if (typeof window === "undefined" || !cityName) return null;
  try {
    return localStorage.getItem(`weather:user-photo:${cityName.toLowerCase().trim()}`);
  } catch {
    return null;
  }
}

export function saveUserPhoto(cityName: string, dataUrl: string): boolean {
  if (typeof window === "undefined" || !cityName) return false;
  try {
    localStorage.setItem(`weather:user-photo:${cityName.toLowerCase().trim()}`, dataUrl);
    return true;
  } catch {
    return false;
  }
}

export function clearUserPhoto(cityName: string): void {
  if (typeof window === "undefined" || !cityName) return;
  try {
    localStorage.removeItem(`weather:user-photo:${cityName.toLowerCase().trim()}`);
  } catch {}
}

// Client-side compressor (canvas-based, keeps payload ~100-200kb so it never breaks storage quotas)
export function compressImageFile(file: File, maxDim = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Retrieve list of all available AI/Curated artworks for the current city & weather
export function getAllAvailableArtworks(
  cityName: string,
  weatherCode: string | number,
  weatherDesc: string,
  country?: string
): string[] {
  const cityKey = cityName.toLowerCase();
  const descKey = weatherDesc.toLowerCase();
  const code = Number(weatherCode);

  const list: string[] = [];

  // Check landmark matches
  for (const [name, urls] of Object.entries(LANDMARK_WATERCOLORS)) {
    if (cityKey.includes(name)) {
      list.push(...urls);
      break;
    }
  }

  // Weather condition artworks
  if (code >= 95 || descKey.includes("thunder") || descKey.includes("storm")) {
    list.push(...WEATHER_WATERCOLORS.thunderstorm);
  } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || descKey.includes("rain")) {
    list.push(...WEATHER_WATERCOLORS.rain);
  } else if ((code >= 71 && code <= 77) || descKey.includes("snow")) {
    list.push(...WEATHER_WATERCOLORS.snow);
  } else if (code === 45 || code === 48 || descKey.includes("fog") || descKey.includes("mist")) {
    list.push(...WEATHER_WATERCOLORS.fog);
  } else if (code === 0 || code === 1) {
    list.push(...WEATHER_WATERCOLORS.clear);
  } else if (code >= 2 && code <= 3) {
    list.push(...WEATHER_WATERCOLORS.clouds);
  }

  // Regional artworks
  list.push(...getRegionalArtwork(cityName, country));

  // Deduplicate
  return Array.from(new Set(list));
}

// User-chosen AI art persistence
export function getSavedCustomArtChoice(cityName: string): string | null {
  if (typeof window === "undefined" || !cityName) return null;
  try {
    return localStorage.getItem(`weather:custom-art:${cityName.toLowerCase().trim()}`);
  } catch {
    return null;
  }
}

export function saveCustomArtChoice(cityName: string, url: string): void {
  if (typeof window === "undefined" || !cityName) return;
  try {
    localStorage.setItem(`weather:custom-art:${cityName.toLowerCase().trim()}`, url);
  } catch {}
}

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

  // 1. Check if user set their own photo
  const userPhoto = getSavedUserPhoto(city);
  if (userPhoto) {
    return { initialBg: userPhoto, isAi: true };
  }

  // 2. Check if user previously cycled to a specific art choice
  const savedArtChoice = getSavedCustomArtChoice(city);
  if (savedArtChoice) {
    preloadImage(savedArtChoice, 6000).then((ok) => {
      if (ok && onGenerated) onGenerated(savedArtChoice);
    });
    return {
      initialBg: loadedImageCache.has(savedArtChoice) ? savedArtChoice : fallbackGradient,
      isAi: loadedImageCache.has(savedArtChoice),
    };
  }

  // 3. Fallback to curated catalog
  const artOptions = getAllAvailableArtworks(city, weatherCode, weatherDesc, country);
  const targetArtwork = artOptions[0] || "";

  if (targetArtwork) {
    preloadImage(targetArtwork, 6000).then((ok) => {
      if (ok && onGenerated) onGenerated(targetArtwork);
    });
    return {
      initialBg: loadedImageCache.has(targetArtwork) ? targetArtwork : fallbackGradient,
      isAi: loadedImageCache.has(targetArtwork),
    };
  }

  return { initialBg: fallbackGradient, isAi: false };
}
