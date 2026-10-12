import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  aqiCategory,
  describe,
  fetchWeather,
  getClothingAdvice,
  getWeatherAlert,
  isFavorite,
  isSamePlace,
  loadCached,
  loadFavorites,
  loadUnitPref,
  saveFavorites,
  saveUnitPref,
  searchCity,
  skyKey,
  uvCategory,
  type Place,
  type Weather,
  type WeatherUnit,
} from "@/lib/weather";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Weather Pal — Private local weather forecasts" },
      { name: "description", content: "Current temperature, hourly and 7-day forecast. No tracking, works offline." },
      { property: "og:title", content: "My Weather Pal — Private local weather forecasts" },
      { property: "og:description", content: "Current temperature, hourly and 7-day forecast. No tracking, works offline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SKY_PREF_KEY = "weather:sky-pref";
const SKY_OPTIONS = [
  { value: "auto", label: "Auto (weather)" },
  { value: "clear-day", label: "Sunny day" },
  { value: "clear-night", label: "Clear night" },
  { value: "cloudy-day", label: "Cloudy day" },
  { value: "cloudy-night", label: "Cloudy night" },
  { value: "fog", label: "Fog" },
  { value: "rain", label: "Rain" },
  { value: "snow", label: "Snow" },
  { value: "storm", label: "Storm" },
];

const FONT_SIZE_KEY = "weather:font-size-pref";
const FONT_SIZE_OPTIONS = [
  { value: "normal", label: "Text: Normal (100%)", scale: "100%" },
  { value: "large", label: "Text: Large (115%)", scale: "115%" },
  { value: "xlarge", label: "Text: Huge (130%)", scale: "130%" },
];

export interface TickerAlertItem {
  icon: string;
  tag: string;
  text: string;
  severity: "disaster" | "warning" | "caution" | "clear";
}

const ONBOARDING_SLIDES = [
  {
    icon: "🔍",
    title: "Your weather, anywhere",
    text: "Search any city — Skopje, Tokyo, or your hometown.",
  },
  {
    icon: "👕🌧️",
    title: "More than temperature",
    text: "What to wear, air quality, best time to go outside.",
  },
  {
    icon: "⭐",
    title: "Save favorites",
    text: "Track multiple cities and get storm alerts.",
  },
];

function OnboardingCarousel({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const slide = ONBOARDING_SLIDES[index];

  function dismiss() {
    try {
      localStorage.setItem("hasSeenOnboarding", "true");
    } catch {}
    onFinish();
  }

  function handleNext() {
    if (index < ONBOARDING_SLIDES.length - 1) {
      setIndex(index + 1);
    } else {
      dismiss();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-sky-50 dark:bg-slate-900 p-6 text-foreground">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={dismiss}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
        >
          Skip
        </button>
      </div>

      <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 text-6xl select-none" role="img" aria-label="Slide icon">
          {slide.icon}
        </div>
        <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {slide.title}
        </h2>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          {slide.text}
        </p>

        <div className="mt-8 flex items-center gap-2">
          {ONBOARDING_SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-6 bg-slate-900 dark:bg-white"
                  : "w-2 bg-slate-300 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm pb-4">
        <button
          type="button"
          onClick={handleNext}
          className="w-full rounded-full bg-slate-900 dark:bg-white py-4 font-semibold text-white dark:text-slate-900 shadow-md transition-colors hover:bg-slate-800 dark:hover:bg-slate-100"
        >
          {index === ONBOARDING_SLIDES.length - 1 ? "Get Started" : "Next"}
        </button>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function fetchNearbyEarthquakes(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=500&minmagnitude=4.2&limit=3`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const now = Date.now();
    const items: TickerAlertItem[] = [];

    for (const f of data.features || []) {
      const ageHours = (now - f.properties.time) / (1000 * 3600);
      if (ageHours > 48) continue;
      const mag = f.properties.mag ?? 0;
      const placeName = f.properties.place || "nearby region";
      const hasTsunami = f.properties.tsunami === 1;
      const [eqLon, eqLat] = f.geometry?.coordinates ?? [0, 0];
      const dist = calculateDistanceKm(lat, lon, eqLat, eqLon);

      if (hasTsunami) {
        items.push({
          icon: "🌊",
          tag: "TSUNAMI ADVISORY",
          text: `Potential tsunami warning triggered by offshore M${mag.toFixed(1)} seismic event (${dist} km away in ${placeName}). Move away from coastal areas.`,
          severity: "disaster",
        });
      } else {
        items.push({
          icon: "🌋",
          tag: "EARTHQUAKE REPORT",
          text: `M${mag.toFixed(1)} earthquake recorded ${dist} km away (${placeName}) ~${Math.round(ageHours)}h ago. Watch for aftershocks.`,
          severity: mag >= 6.0 ? "disaster" : "warning",
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchLiveRiverFlood(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge,river_discharge_mean,river_discharge_max&forecast_days=3`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const discharge = data.daily?.river_discharge?.[0];
    const mean = data.daily?.river_discharge_mean?.[0];

    if (discharge !== undefined && mean !== undefined && mean > 0) {
      const ratio = discharge / mean;
      if (ratio >= 2.0 || (discharge >= 100 && ratio >= 1.5)) {
        return [
          {
            icon: "🌊",
            tag: "RIVER BASIN FLOOD SURGE",
            text: `River discharge surge detected (${Math.round(discharge)} m³/s, ${Math.round(ratio * 100)}% of baseline). High risk of basin overflow.`,
            severity: "disaster",
          },
        ];
      } else if (ratio >= 1.4 && discharge >= 20) {
        return [
          {
            icon: "🌊",
            tag: "RIVER BASIN FLOOD WATCH",
            text: `Elevated river discharge (${Math.round(discharge)} m³/s). Sustained basin runoff may cause low-lying watercourse flooding.`,
            severity: "warning",
          },
        ];
      }
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchLiveOfficialAlerts(lat: number, lon: number): Promise<TickerAlertItem[]> {
  const isUS = lat >= 18 && lat <= 72 && lon >= -179 && lon <= -65;
  if (!isUS) return [];

  try {
    const res = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
      headers: { "User-Agent": "MyWeatherPal/1.0 (contact@weatherpal.local)" },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items: TickerAlertItem[] = [];

    for (const f of data.features || []) {
      const eventName = f.properties?.event || "Weather Bulletin";
      const headline = f.properties?.headline || f.properties?.description || "";
      const lower = (eventName + " " + headline).toLowerCase();

      let icon = "⚠️";
      let severity: TickerAlertItem["severity"] = "warning";

      if (lower.includes("flood")) {
        icon = "🌊";
        severity = lower.includes("warning") ? "disaster" : "warning";
      } else if (lower.includes("heavy rain") || lower.includes("downpour")) {
        icon = "🌧️";
        severity = "warning";
      } else if (lower.includes("thunderstorm")) {
        icon = "⛈️";
        severity = "warning";
      } else if (lower.includes("tornado") || lower.includes("hurricane")) {
        icon = "🌪️";
        severity = "disaster";
      }

      items.push({
        icon,
        tag: eventName.toUpperCase(),
        text: headline.slice(0, 160) || `Active official bulletin: ${eventName}.`,
        severity,
      });
    }
    return items;
  } catch {
    return [];
  }
}

function evaluateAllDisastersAndAlerts(
  w: Weather,
  seismicAndOfficialItems: TickerAlertItem[] = []
): TickerAlertItem[] {
  const items: TickerAlertItem[] = [...seismicAndOfficialItems];
  const lat = w.place.lat;
  const lon = w.place.lon;
  const isThailand = lat >= 5.5 && lat <= 20.5 && lon >= 97.3 && lon <= 105.7;

  const windMph = w.unit === "imperial" ? w.current.wind : w.current.wind * 0.621371;
  const tempC = w.unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  const windUnit = w.unit === "imperial" ? "mph" : "km/h";
  const tempUnit = w.unit === "imperial" ? "°F" : "°C";

  const hasLiveFlood = items.some((i) => /flood/i.test(i.tag) || /flood/i.test(i.text));
  const hasLiveRain = items.some((i) => /rain/i.test(i.tag) || /rain/i.test(i.text));
  const hasLiveStorm = items.some((i) => /thunder|storm/i.test(i.tag) || /thunder|storm/i.test(i.text));

  const isDailyThunderToday = w.daily[0] && [95, 96, 99].includes(w.daily[0].code);
  const isDailyThunderUpcoming = w.daily.slice(0, 2).some((d) => [95, 96, 99].includes(d.code));
  const isHourlyThunderUpcoming = w.hourly.slice(0, 12).some((h) => [95, 96, 99].includes(h.code));
  const hasThunderstormForecast = isDailyThunderToday || isDailyThunderUpcoming || isHourlyThunderUpcoming;

  if (w.current.code === 99) {
    items.push({
      icon: "🌪️",
      tag: "TORNADO / VIOLENT HAIL EMERGENCY",
      text: "Destructive rotating winds and heavy damaging hail reported. Seek certified storm shelter immediately.",
      severity: "disaster",
    });
  } else if (w.current.code === 96) {
    items.push({
      icon: "⚡",
      tag: "SEVERE HAILSTORM DISASTER",
      text: "Severe thunderstorm with damaging large hail and violent downdrafts. Move vehicles and stay indoors.",
      severity: "disaster",
    });
  } else if (w.current.code === 95) {
    items.push({
      icon: "⛈️",
      tag: isThailand ? "🇹🇭 TMD: SEVERE THUNDERSTORM WARNING" : "SEVERE THUNDERSTORM WARNING",
      text: isThailand
        ? "TMD Weather Warning: Active severe thunderstorm in progress. Frequent lightning strikes, gusty squalls, and heavy localized downpours."
        : "Dangerous cloud-to-ground lightning strikes and torrential rainfall active. Remain indoors away from windows.",
      severity: "warning",
    });
  } else if (hasThunderstormForecast && !hasLiveStorm) {
    items.push({
      icon: "⛈️",
      tag: isThailand ? "🇹🇭 TMD: THUNDERSTORM WATCH & WARNING" : "THUNDERSTORM WATCH & WARNING",
      text: isThailand
        ? "TMD Weather Advisory: Scattered to widespread thunderstorms with sudden gusty squalls and heavy downpours active across the area today."
        : "Active thunderstorm watch in effect. Cloud-to-ground lightning, localized convective squalls, and heavy downpours anticipated.",
      severity: "warning",
    });
  }

  if (windMph >= 74) {
    items.push({
      icon: "🌀",
      tag: "HURRICANE / TYPHOON EMERGENCY",
      text: `Catastrophic hurricane-force winds detected (${Math.round(w.current.wind)} ${windUnit}). Structural destruction imminent. Shelter in interior rooms.`,
      severity: "disaster",
    });
  } else if (windMph >= 55) {
    items.push({
      icon: "🌀",
      tag: "STORM-FORCE VIOLENT GALE",
      text: `Violent gale-force winds (${Math.round(w.current.wind)} ${windUnit}). Widespread tree failure and power line destruction expected.`,
      severity: "disaster",
    });
  } else if (windMph >= 39) {
    items.push({
      icon: "💨",
      tag: "TROPICAL GALE ADVISORY",
      text: `Hazardous gale winds (${Math.round(w.current.wind)} ${windUnit}). Secure all loose outdoor items.`,
      severity: "warning",
    });
  }

  const precipMm = w.unit === "imperial" ? w.current.precipitation * 25.4 : w.current.precipitation;
  const isHeavyRainCode = [65, 82].includes(w.current.code);

  if (precipMm >= 25 || (isHeavyRainCode && precipMm >= 15)) {
    items.push({
      icon: "🌊",
      tag: isThailand ? "🇹🇭 TMD: FLASH FLOOD & INUNDATION WARNING" : "FLASH FLOOD EMERGENCY",
      text: isThailand
        ? "TMD Heavy Monsoon Alert: Very heavy torrential downpours active. Dangerous flash floods and hillside runoff occurring."
        : `Torrential downpour (${w.current.precipitation} ${w.unit === "imperial" ? "in" : "mm"}). Life-threatening flash inundation active. Avoid flooded roadways.`,
      severity: "disaster",
    });
  } else if (
    (precipMm >= 8 || isHeavyRainCode || w.daily[0]?.precipSum >= 30) &&
    !hasLiveRain &&
    !hasLiveFlood
  ) {
    items.push({
      icon: "🌧️",
      tag: isThailand ? "🇹🇭 TMD: HEAVY TO VERY HEAVY RAINS WATCH" : "HEAVY RAIN & FLOOD ADVISORY",
      text: isThailand
        ? "TMD Hydrological Advisory: Sustained heavy monsoon downpours expected across river basins. Lowlands and watercourses at risk."
        : "Significant continuous rainfall active. Water accumulation on roadways and localized urban drainage backups expected.",
      severity: "warning",
    });
  }

  const isBlizzard = [75, 86].includes(w.current.code) && windMph >= 35;
  if (isBlizzard) {
    items.push({
      icon: "❄️",
      tag: "BLIZZARD & WHITEOUT EMERGENCY",
      text: "Heavy blinding snowfall paired with severe gale winds. Zero visibility and impassable transit networks.",
      severity: "disaster",
    });
  } else if ([73, 75, 85, 86].includes(w.current.code)) {
    items.push({
      icon: "🌨️",
      tag: "HEAVY WINTER STORM WARNING",
      text: "Significant snowfall accumulation causing hazardous road conditions and rapid ice accumulation.",
      severity: "warning",
    });
  }

  if (tempC >= 41 || (w.current.feels >= (w.unit === "imperial" ? 115 : 46))) {
    items.push({
      icon: "🔥",
      tag: "EXTREME HEAT DISASTER",
      text: `Dangerous heat index (${Math.round(w.current.feels)}${tempUnit}). Rapid heatstroke hazard. Stay in air conditioning.`,
      severity: "disaster",
    });
  } else if (tempC >= 35 || (w.current.feels >= (w.unit === "imperial" ? 103 : 39))) {
    items.push({
      icon: "🌡️",
      tag: "EXCESSIVE HEAT WARNING",
      text: `Severe heat index (${Math.round(w.current.feels)}${tempUnit}). High risk of heat illness with prolonged outdoor exposure.`,
      severity: "warning",
    });
  }

  if (tempC <= -20 || (w.current.feels <= (w.unit === "imperial" ? -25 : -32))) {
    items.push({
      icon: "🥶",
      tag: "POLAR FREEZE EMERGENCY",
      text: `Dangerous wind chill (${Math.round(w.current.feels)}${tempUnit}). High risk of hypothermia and frostbite in minutes.`,
      severity: "disaster",
    });
  } else if (tempC <= -5) {
    items.push({
      icon: "❄️",
      tag: "HARD FREEZE ADVISORY",
      text: "Sub-freezing temperatures active. Protect exposed exterior plumbing and vulnerable vegetation.",
      severity: "warning",
    });
  }

  if (w.current.aqi !== undefined) {
    if (w.current.aqi >= 301) {
      items.push({
        icon: "☣️",
        tag: "HAZARDOUS SMOKE & TOXIC AIR CRISIS",
        text: `Severe particulate emergency (AQI ${w.current.aqi}). Hazardous to entire population. Keep windows shut and wear certified respirator.`,
        severity: "disaster",
      });
    } else if (w.current.aqi >= 201) {
      items.push({
        icon: "😷",
        tag: "VERY UNHEALTHY AIR WARNING",
        text: `High particulate contamination (AQI ${w.current.aqi}). Sensitive groups avoid all outdoor exertion.`,
        severity: "warning",
      });
    } else if (w.current.aqi >= 151) {
      items.push({
        icon: "⚠️",
        tag: "UNHEALTHY AIR QUALITY CAUTION",
        text: `Unhealthy particulate levels (AQI ${w.current.aqi}). Wear protection outdoors.`,
        severity: "caution",
      });
    }
  }

  if (w.current.uvIndex >= 11) {
    items.push({
      icon: "☀️",
      tag: "EXTREME UV RADIATION HAZARD",
      text: `Extreme UV Index (${w.current.uvIndex}). Severe skin and retina damage in under 10 minutes. Avoid direct sunlight.`,
      severity: "warning",
    });
  }

  const nextRain = w.hourly.slice(0, 5).find((h) => h.precipProb >= 60);
  if (nextRain && !isHeavyRainCode && w.current.code < 51 && !hasLiveRain && !hasThunderstormForecast) {
    items.push({
      icon: "💧",
      tag: "RAIN ONSET ADVISORY",
      text: `Precipitation starting around ${nextRain.time.slice(11, 16)} (${nextRain.precipProb}% chance). Carry rain protection.`,
      severity: "caution",
    });
  }

  if (items.length === 0) {
    items.push({
      icon: "🛡️",
      tag: "ALL CLEAR",
      text: "No active meteorological, seismic, or natural disaster emergencies reported for this area.",
      severity: "clear",
    });
  }

  return items;
}

function Index() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [unit, setUnit] = useState<WeatherUnit>("metric");
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [nearbyDisasters, setNearbyDisasters] = useState<TickerAlertItem[]>([]);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [showLocDialog, setShowLocDialog] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [skyChoice, setSkyChoice] = useState("auto");
  const [fontSizeChoice, setFontSizeChoice] = useState("normal");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(place: Place, targetUnit: WeatherUnit = unit, isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    Promise.allSettled([
      fetchNearbyEarthquakes(place.lat, place.lon),
      fetchLiveRiverFlood(place.lat, place.lon),
      fetchLiveOfficialAlerts(place.lat, place.lon),
    ]).then(([eqRes, floodRes, offRes]) => {
      const eqItems = eqRes.status === "fulfilled" ? eqRes.value : [];
      const floodItems = floodRes.status === "fulfilled" ? floodRes.value : [];
      const offItems = offRes.status === "fulfilled" ? offRes.value : [];
      setNearbyDisasters([...offItems, ...floodItems, ...eqItems]);
    });

    try {
      const data = await fetchWeather(place, targetUnit);
      setWeather(data);
      setOffline(false);
    } catch {
      setOffline(true);
      setError("Couldn't reach the weather service. Showing last saved weather if available.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    try {
      if (!localStorage.getItem("hasSeenOnboarding")) {
        setShowOnboarding(true);
      }
    } catch {}

    try {
      const savedSky = localStorage.getItem(SKY_PREF_KEY);
      if (savedSky && SKY_OPTIONS.some((o) => o.value === savedSky)) {
        setSkyChoice(savedSky);
      }
    } catch {}

    try {
      const savedFontSize = localStorage.getItem(FONT_SIZE_KEY);
      if (savedFontSize && FONT_SIZE_OPTIONS.some((o) => o.value === savedFontSize)) {
        setFontSizeChoice(savedFontSize);
        const opt = FONT_SIZE_OPTIONS.find((o) => o.value === savedFontSize);
        if (opt) document.documentElement.style.fontSize = opt.scale;
      }
    } catch {}

    const savedUnit = loadUnitPref();
    setUnit(savedUnit);
    setFavorites(loadFavorites());

    const cached = loadCached();
    if (cached) {
      setWeather(cached);
      if (navigator.onLine) {
        load(cached.place, savedUnit);
      } else {
        setOffline(true);
      }
    }

    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as any).standalone);

    if (standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      if (!standalone) {
        setDeferredInstallPrompt(e);
      }
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      document.documentElement.style.fontSize = "";
    };
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const r = await searchCity(trimmed);
        setResults(r);
      } catch {
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [q]);

  function toggleUnit(nextUnit: WeatherUnit) {
    if (nextUnit === unit) return;
    setUnit(nextUnit);
    saveUnitPref(nextUnit);
    if (weather) {
      load(weather.place, nextUnit);
    }
  }

  function toggleFavorite(place: Place) {
    setFavorites((prev) => {
      const exists = isFavorite(place, prev);
      const next = exists
        ? prev.filter((p) => !isSamePlace(p, place))
        : [...prev, place];
      saveFavorites(next);
      return next;
    });
  }

  function removeFavorite(place: Place, e: React.MouseEvent) {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.filter((p) => !isSamePlace(p, place));
      saveFavorites(next);
      return next;
    });
  }

  async function handleInstallClick() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredInstallPrompt(null);
      }
    } else {
      setShowInstallDialog(true);
    }
  }

  async function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const r = await searchCity(trimmed);
      setResults(r);
      if (!r.length) setError("No matching city found.");
      else setError(null);
    } catch {
      setError("Search needs an internet connection.");
    } finally {
      setLoading(false);
    }
  }

  function useLocation() {
    setShowLocDialog(false);
    if (!navigator.geolocation) return setError("Location isn't supported in this browser.");
    navigator.geolocation.getCurrentPosition(
      (p) => load({ name: "My location", lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }),
      () => setError("Location permission was denied. You can search for a city instead."),
      { timeout: 10000 },
    );
  }

  function onSkyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    setSkyChoice(v);
    try {
      if (v === "auto") localStorage.removeItem(SKY_PREF_KEY);
      else localStorage.setItem(SKY_PREF_KEY, v);
    } catch {}
  }

  function onFontSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    setFontSizeChoice(v);
    const opt = FONT_SIZE_OPTIONS.find((o) => o.value === v);
    if (opt) {
      document.documentElement.style.fontSize = opt.scale;
    }
    try {
      if (v === "normal") localStorage.removeItem(FONT_SIZE_KEY);
      else localStorage.setItem(FONT_SIZE_KEY, v);
    } catch {}
  }

  const autoSky = weather ? skyKey(weather.current.code, weather.current.is_day) : "default";
  const sky = skyChoice === "auto" ? autoSky : skyChoice;

  return (
    <div className={`sky sky-${sky} min-h-screen text-foreground`}>
      {showOnboarding && (
        <OnboardingCarousel onFinish={() => setShowOnboarding(false)} />
      )}
      <main className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">My Weather Pal</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-input bg-card p-0.5 text-xs text-card-foreground">
              <button
                type="button"
                onClick={() => toggleUnit("imperial")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  unit === "imperial"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Switch to US Imperial (°F, mph, in)"
              >
                US (°F)
              </button>
              <button
                type="button"
                onClick={() => toggleUnit("metric")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  unit === "metric"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Switch to Metric (°C, km/h, mm)"
              >
                Metric (°C)
              </button>
            </div>

            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="rounded-lg border border-input bg-card px-2.5 py-1 text-xs font-medium text-card-foreground hover:bg-accent transition-colors"
                title="Install My Weather Pal to your home screen"
              >
                📲 Install App
              </button>
            )}

            <select
              value={fontSizeChoice}
              onChange={onFontSizeChange}
              aria-label="Text size"
              title="Adjust text size"
              className="rounded-lg border border-input bg-card px-2 py-1 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {FONT_SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              value={skyChoice}
              onChange={onSkyChange}
              aria-label="Background color"
              title="Background color"
              className="rounded-lg border border-input bg-card px-2 py-1 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {SKY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Link to="/privacy" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Privacy
            </Link>
          </div>
        </header>

        <form onSubmit={onSearchSubmit} className="relative flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a city…"
              aria-label="Search a city"
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-card-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            {searching && (
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">Searching…</span>
            )}
          </div>
          <button className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground">Search</button>
          <button
            type="button"
            onClick={() => setShowLocDialog(true)}
            className="rounded-lg border border-input px-3 py-2"
            aria-label="Use my location"
            title="Use my location"
          >
            📍
          </button>

          {results.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-40 mt-1 divide-y divide-border rounded-lg border border-border bg-card text-card-foreground shadow-lg">
              {results.map((r) => (
                <li key={`${r.lat},${r.lon}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-accent focus:bg-accent outline-none"
                    onClick={() => {
                      setResults([]);
                      setQ("");
                      load(r);
                    }}
                  >
                    {r.name} <span className="text-muted-foreground text-xs">{r.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/60 p-2.5">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
            <span className="text-xs font-medium text-muted-foreground mr-1">Favorites:</span>
            {favorites.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">No saved cities yet</span>
            ) : (
              favorites.map((fav) => (
                <span
                  key={`${fav.lat},${fav.lon}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-card-foreground shadow-xs hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    setQ("");
                    setResults([]);
                    load(fav);
                  }}
                  title={`View weather for ${fav.name}`}
                >
                  <span>{fav.name.split(",")[0]}</span>
                  <button
                    type="button"
                    onClick={(e) => removeFavorite(fav, e)}
                    className="text-muted-foreground hover:text-destructive text-sm font-semibold leading-none"
                    title={`Remove ${fav.name} from favorites`}
                    aria-label={`Remove ${fav.name} from favorites`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          {weather && (
            <button
              type="button"
              onClick={() => toggleFavorite(weather.place)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                isFavorite(weather.place, favorites)
                  ? "border-amber-400/60 bg-amber-400/15 text-amber-600 dark:text-amber-300 shadow-xs"
                  : "border-input bg-card text-card-foreground hover:bg-accent shadow-xs"
              }`}
              title={
                isFavorite(weather.place, favorites)
                  ? `Remove ${weather.place.name} from favorites`
                  : `Save ${weather.place.name} to favorites`
              }
            >
              <span>{isFavorite(weather.place, favorites) ? "★ Saved Favorite" : "☆ Save to Favorites"}</span>
            </button>
          )}
        </div>

        {offline && weather && (
          <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-card-foreground">
            Offline — showing weather saved {new Date(weather.fetchedAt).toLocaleString()}.
          </p>
        )}
        {error && !offline && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {loading && !refreshing && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}

        {!weather && !loading && (
          <p className="mt-12 text-center text-muted-foreground">Search for a city or use your location to begin.</p>
        )}

        {weather && (
          <WeatherView
            w={weather}
            disasters={nearbyDisasters}
            refreshing={refreshing}
            isFav={isFavorite(weather.place, favorites)}
            onToggleFav={() => toggleFavorite(weather.place)}
            onRefresh={() => load(weather.place, unit, true)}
          />
        )}
      </main>

      {showLocDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4" role="dialog" aria-modal="true">
          <div className="max-w-sm rounded-xl bg-card p-6 text-card-foreground shadow-lg">
            <h2 className="text-lg font-semibold">Use your location?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your browser will ask for permission. Your coordinates are rounded and sent only to Open-Meteo to get the
              local forecast. Nothing is stored on any server or shared with anyone else.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowLocDialog(false)} className="rounded-lg border border-input text-card-foreground px-4 py-2">
                Not now
              </button>
              <button onClick={useLocation} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showInstallDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4" role="dialog" aria-modal="true">
          <div className="max-w-sm rounded-xl bg-card p-6 text-card-foreground shadow-lg">
            <h2 className="text-lg font-semibold">Install My Weather Pal</h2>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p><strong>On iPhone / iPad (Safari):</strong> Tap the <strong>Share</strong> button (⎙), then select <strong>Add to Home Screen</strong>.</p>
              <p><strong>On Android (Chrome):</strong> Tap the three-dot menu (⋮) in the top-right, then select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</p>
              <p><strong>On PC / Mac:</strong> Look for the install icon in your browser address bar.</p>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => setShowInstallDialog(false)} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeatherView({
  w,
  disasters,
  refreshing,
  isFav,
  onToggleFav,
  onRefresh,
}: {
  w: Weather;
  disasters: TickerAlertItem[];
  refreshing: boolean;
  isFav: boolean;
  onToggleFav: () => void;
  onRefresh: () => void;
}) {
  const d = describe(w.current.code);
  const windUnit = w.unit === "imperial" ? "mph" : "km/h";
  const precipUnit = w.unit === "imperial" ? "in" : "mm";
  const tempSymbol = w.unit === "imperial" ? "°F" : "°C";

  const [wearStyle, setWearStyle] = useState<"casual" | "business" | "sport">("casual");
  const baseAdvice = getClothingAdvice(w);
  const aqiInfo = w.current.aqi !== undefined ? aqiCategory(w.current.aqi) : null;

  const allAlerts = evaluateAllDisastersAndAlerts(w, disasters);
  const hasDisaster = allAlerts.some((a) => a.severity === "disaster");
  const hasWarning = allAlerts.some((a) => a.severity === "warning");
  const hasCaution = allAlerts.some((a) => a.severity === "caution");

  const tempC = w.unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  const isRainy = w.current.code >= 51 && w.current.code <= 82;
  const isFreezing = tempC <= 5;
  const isWarm = tempC >= 22;

  let tailoredAdvice = baseAdvice;
  if (wearStyle === "business") {
    if (isFreezing) {
      tailoredAdvice = "Wool overcoat, tailored suit or knit blazer, leather dress shoes, and a scarf." + (isRainy ? " Carry a classic dark umbrella." : "");
    } else if (isWarm) {
      tailoredAdvice = "Breathable linen shirt or blouse, lightweight slacks or pencil skirt, loafers." + (w.current.uvIndex >= 6 ? " Add UV-rated sunglasses." : "");
    } else {
      tailoredAdvice = "Structured blazer, crisp button-down, chinos or tailored trousers, and dress shoes.";
    }
  } else if (wearStyle === "sport") {
    if (isFreezing) {
      tailoredAdvice = "Thermal compression base layer, windbreaker running jacket, gloves, and fleece-lined tights." + (isRainy ? " Water-repellent trail runners." : "");
    } else if (isWarm) {
      tailoredAdvice = "Moisture-wicking mesh tee, lightweight shorts, running cap, and plenty of hydration." + (w.current.uvIndex >= 6 ? " Sweatproof sunscreen." : "");
    } else {
      tailoredAdvice = "Breathable athletic layers, moisture-wicking hoodie or track jacket, and supportive trainers.";
    }
  }

  let outdoorTip = "💡 Best time to go outside: Mid-afternoon (2–4 PM)";
  if (tempC >= 32) {
    outdoorTip = "💡 Best time to go outside: Early morning (before 9 AM) or evening to avoid peak heat";
  } else if (isFreezing) {
    outdoorTip = "💡 Best time to go outside: Midday (12–2 PM) when temperatures and sun are highest";
  } else if (isRainy) {
    outdoorTip = "💡 Best time to go outside: Check hourly rain radar for momentary clearing windows";
  }

  function handleShare() {
    const text = `Today in ${w.place.name}: ${Math.round(w.current.temp)}${tempSymbol}, ${d.label}. What to wear (${wearStyle}): ${tailoredAdvice}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: `Weather & Outfit — ${w.place.name}`, text }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert("Outfit recommendation copied to clipboard!");
    }
  }

  return (
    <>
      <section className="mt-4 rounded-2xl bg-card p-6 text-card-foreground shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                {w.place.name}
                {w.place.country ? `, ${w.place.country}` : ""}
              </p>
              <button
                type="button"
                onClick={onToggleFav}
                className="text-base text-yellow-500 hover:scale-110 transition-transform"
                title={isFav ? "Remove from favorites" : "Save to favorites"}
                aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
              >
                {isFav ? "★" : "☆"}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <span className="text-6xl" role="img" aria-label={d.label}>
                {d.icon}
              </span>
              <div>
                <div className="flex items-baseline gap-1">
                  <p className="text-6xl font-bold tracking-tight">
                    {Math.round(w.current.temp)}
                  </p>
                  <span className="text-2xl font-semibold text-muted-foreground">
                    {tempSymbol}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {d.label} · Feels like {Math.round(w.current.feels)}{tempSymbol}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh forecast"
            aria-label="Refresh forecast"
            className="flex items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>🔄</span>
            <span>{refreshing ? "Updating…" : formatTimeAgo(w.fetchedAt)}</span>
          </button>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-border/80 bg-card p-4 text-card-foreground shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">👕</span>
            <h2 className="text-base font-bold tracking-tight">What to Wear Today</h2>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-card-foreground hover:bg-accent transition-colors"
            title="Share outfit advice"
          >
            <span>↗</span>
            <span>Share</span>
          </button>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-card-foreground">
          {tailoredAdvice}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWearStyle("casual")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              wearStyle === "casual"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-input bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            Casual
          </button>
          <button
            type="button"
            onClick={() => setWearStyle("business")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              wearStyle === "business"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-input bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            Business
          </button>
          <button
            type="button"
            onClick={() => setWearStyle("sport")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              wearStyle === "sport"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-input bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            Sport
          </button>
        </div>

        <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
          {outdoorTip}
        </div>
      </section>

      {!hasDisaster && !hasWarning && !hasCaution ? (
        <div className="mt-3 flex w-full min-h-[56px] flex-wrap items-center overflow-visible rounded-lg bg-green-500 px-3 py-2 text-xs shadow-2xs">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium leading-[18px] text-white break-words whitespace-normal">
              🛡️ All clear - No severe weather expected in your area today. Enjoy your day!
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`mt-3 overflow-hidden rounded-xl border text-xs shadow-2xs ${
            hasDisaster
              ? "border-red-600/60 bg-red-600/15 text-red-950 dark:text-red-200"
              : hasWarning
              ? "border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-200"
              : "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200"
          }`}
        >
          <div className="flex items-center">
            <div
              className={`flex shrink-0 items-center gap-1.5 border-r px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${
                hasDisaster
                  ? "border-red-600/40 bg-red-600/25 text-red-700 dark:text-red-300"
                  : hasWarning
                  ? "border-red-500/30 bg-red-500/20 text-red-600 dark:text-red-400"
                  : "border-amber-500/30 bg-amber-500/20 text-amber-600 dark:text-amber-400"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    hasDisaster
                      ? "bg-red-500"
                      : hasWarning
                      ? "bg-red-400"
                      : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    hasDisaster
                      ? "bg-red-600"
                      : hasWarning
                      ? "bg-red-500"
                      : "bg-amber-500"
                  }`}
                />
              </span>
              <span>{hasDisaster ? "🚨 DISASTERS TICKER" : hasWarning ? "⚠️ ALERTS TICKER" : "⚡ ADVISORY TICKER"}</span>
            </div>

            <div className="relative flex-1 overflow-hidden py-2">
              <div className="weather-ticker-track flex w-max items-center gap-8 whitespace-nowrap hover:[animation-play-state:paused]">
                {allAlerts.concat(allAlerts).map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 text-card-foreground">
                    <span className="text-sm">{item.icon}</span>
                    <span className="font-semibold text-foreground">[{item.tag}]:</span>
                    <span className="font-medium">{item.text}</span>
                    <span className="font-light text-muted-foreground/50">✦</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-border pt-4 sm:grid-cols-5">
        <div className="rounded-lg bg-muted/30 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">Humidity</span>
          <p className="text-base font-semibold">{w.current.humidity}%</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">Wind</span>
          <p className="text-base font-semibold">
            {Math.round(w.current.wind)} <span className="text-xs font-normal text-muted-foreground">{windUnit}</span>
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">UV Index</span>
          <p className="text-base font-semibold">
            {w.current.uvIndex}{" "}
            <span className="text-[11px] font-normal text-muted-foreground">({uvCategory(w.current.uvIndex)})</span>
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">Air Quality</span>
          <p className="text-base font-semibold">
            {w.current.aqi !== undefined ? (
              <>
                {w.current.aqi}{" "}
                <span className={`text-[11px] font-medium ${aqiInfo?.color}`}>({aqiInfo?.label})</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">--</span>
            )}
          </p>
        </div>
        <div className="col-span-2 rounded-lg bg-muted/30 p-2.5 text-center sm:col-span-1">
          <span className="text-xs text-muted-foreground">Precipitation</span>
          <p className="text-base font-semibold">
            {w.current.precipitation} <span className="text-xs font-normal text-muted-foreground">{precipUnit}</span>
          </p>
        </div>
      </div>

      {(w.sun.sunrise !== "--:--" || w.sun.sunset !== "--:--") && (
        <div className="mt-3 flex items-center justify-around rounded-lg bg-muted/20 py-2 text-xs text-muted-foreground">
          <span>🌅 Sunrise: <strong className="text-card-foreground">{w.sun.sunrise}</strong></span>
          <span>🌇 Sunset: <strong className="text-card-foreground">{w.sun.sunset}</strong></span>
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">Today</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {w.hourly.map((h) => {
            const desc = describe(h.code);
            return (
              <div
                key={h.time}
                className="flex w-[72px] min-w-[72px] flex-shrink-0 min-h-[96px] flex-col items-center justify-between rounded-xl bg-card p-2 text-center text-card-foreground shadow-2xs"
              >
                <p className="text-xs text-muted-foreground">{h.time.slice(11, 16)}</p>
                <p className="my-0.5 text-xl">{desc.icon}</p>
                <div className="flex w-full min-w-0 flex-1 items-center justify-center">
                  <div
                    className="text-[11px] font-medium leading-[13px] text-muted-foreground break-words line-clamp-2 text-center"
                    title={desc.label}
                  >
                    {desc.label}
                  </div>
                </div>
                <p className="font-semibold">{Math.round(h.temp)}°</p>
                {h.precipProb > 0 && (
                  <span className="mt-0.5 block text-[10px] font-medium text-blue-500">
                    💧{h.precipProb}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">7 days</h2>
        <ul className="divide-y divide-border rounded-lg bg-card text-card-foreground shadow-2xs">
          {w.daily.map((day, i) => {
            const desc = describe(day.code);
            return (
              <li key={day.date} className="flex items-center justify-between gap-2 px-4 py-3">
                <span className="w-20 shrink-0 text-sm font-medium sm:w-24">
                  {i === 0 ? "Today" : new Date(day.date + "T12:00").toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="shrink-0 text-xl" role="img" aria-label={desc.label}>
                    {desc.icon}
                  </span>
                  <span className="truncate text-xs font-normal text-card-foreground sm:text-sm">
                    {desc.label}
                  </span>
                  {day.precipProbMax > 0 && (
                    <span className="shrink-0 text-xs font-medium text-blue-500">
                      💧{day.precipProbMax}%
                    </span>
                  )}
                </div>
                <span className="w-20 shrink-0 text-right text-sm sm:w-24">
                  <span className="font-semibold">{Math.round(day.max)}°</span>{" "}
                  <span className="text-muted-foreground">{Math.round(day.min)}°</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Data by <a className="underline hover:text-foreground" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>, <a className="underline hover:text-foreground" href="https://earthquake.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS</a>, TMD & <a className="underline hover:text-foreground" href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer">NWS</a>
      </p>

      <style>{`
        @keyframes weatherTickerAnimation {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .weather-ticker-track {
          animation: weatherTickerAnimation 90s linear infinite;
        }
        .weather-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </>
  );
}
