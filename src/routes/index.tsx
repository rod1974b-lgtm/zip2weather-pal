// src/routes/index.tsx
import { AppMenu } from "@/components/AppMenu";
import { WeatherView } from "@/components/WeatherView";
import { AiGalleryModal } from "@/components/AiGalleryModal";
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
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";

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
  const slide = ONBOARDING_SLIDES[index] ?? ONBOARDING_SLIDES[0]!;

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome walkthrough"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
        <div className="text-center">
          <div className="mb-3 text-5xl" aria-hidden="true">
            {slide.icon}
          </div>
          <h2 className="text-lg font-bold tracking-tight">{slide.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{slide.text}</p>
        </div>

        <div className="mt-6 flex justify-center gap-1.5" aria-hidden="true">
          {ONBOARDING_SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            {index < ONBOARDING_SLIDES.length - 1 ? "Next" : "Get started"}
          </button>
        </div>
      </div>
    </div>
  );
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchNearbyEarthquakes(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson";
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();
    const items: TickerAlertItem[] = [];
    const maxRadiusKm = 700;

    for (const feat of data.features ?? []) {
      const [eqLon, eqLat] = feat.geometry?.coordinates ?? [];
      if (eqLat == null || eqLon == null) continue;
      const dist = haversineKm(lat, lon, eqLat, eqLon);
      if (dist <= maxRadiusKm) {
        const mag = feat.properties?.mag ?? 0;
        const place = feat.properties?.place ?? "Nearby region";
        items.push({
          icon: "🌋",
          tag: "EARTHQUAKE ALERT",
          text: `M${mag.toFixed(1)} recorded ~${Math.round(dist)}km away (${place}).`,
          severity: mag >= 6.0 ? "disaster" : "warning",
        });
      }
    }
    return items.slice(0, 2);
  } catch {
    return [];
  }
}

async function fetchLiveRiverFlood(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge,river_discharge_mean,river_discharge_median,river_discharge_max&forecast_days=3`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();
    const discharge = data?.daily?.river_discharge?.[0];
    const maxDischarge = data?.daily?.river_discharge_max?.[0];

    if (discharge != null && maxDischarge != null && maxDischarge > 0) {
      const ratio = discharge / maxDischarge;
      if (ratio >= 0.85) {
        return [
          {
            icon: "🌊",
            tag: "RIVER FLOOD WATCH",
            text: `High river discharge detected (${Math.round(discharge)} m³/s). Basin water levels elevated.`,
            severity: ratio >= 1.0 ? "disaster" : "warning",
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
  const items: TickerAlertItem[] = [];

  // US NWS
  if (lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66) {
    try {
      const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "(MyWeatherPal, weather-app)" },
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = await res.json();
        for (const f of data.features ?? []) {
          const event = f.properties?.event || "Weather Alert";
          const headline = f.properties?.headline || f.properties?.description || "";
          const sev = f.properties?.severity;
          items.push({
            icon: sev === "Extreme" ? "🚨" : "⚠️",
            tag: event.toUpperCase(),
            text: headline.slice(0, 140),
            severity: sev === "Extreme" ? "disaster" : "warning",
          });
        }
      }
    } catch {}
  }

  // TMD Thailand alerts
  if (lat >= 5.5 && lat <= 20.5 && lon >= 97 && lon <= 106) {
    try {
      const res = await fetch("https://data.tmd.go.th/api/WeatherWarningNews/v1/?uid=api&ukey=api12345&format=json", {
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = await res.json();
        const warning = data?.WeatherWarningNews?.[0] || data?.Warning?.[0];
        if (warning) {
          items.push({
            icon: "⛈️",
            tag: "TMD THAILAND ADVISORY",
            text: (warning.TitleEnglish || warning.TitleThai || "Heavy rain & flood warning in effect").slice(0, 140),
            severity: "warning",
          });
        }
      }
    } catch {}
  }

  return items;
}

function compileDisasterTicker(
  w: Weather,
  nearbyItems: TickerAlertItem[]
): TickerAlertItem[] {
  const items: TickerAlertItem[] = [...nearbyItems];

  const code = w.current.code;
  if (code >= 95 && code <= 99) {
    items.unshift({
      icon: "⚡",
      tag: "SEVERE THUNDERSTORM WARNING",
      text: "Active electrical storm and lightning detected in your immediate vicinity. Seek indoor shelter.",
      severity: "disaster",
    });
  } else if (code >= 71 && code <= 77) {
    items.unshift({
      icon: "❄️",
      tag: "WINTER WEATHER ADVISORY",
      text: "Freezing conditions with snowfall. Road surfaces may become hazardous.",
      severity: "warning",
    });
  } else if (code >= 61 && code <= 67) {
    items.unshift({
      icon: "🌧️",
      tag: "HEAVY PRECIPITATION ADVISORY",
      text: "Sustained rainfall expected. Localized urban water ponding possible.",
      severity: "warning",
    });
  }

  const nextRain = w.hourly.find((h) => h.precipProb >= 50);
  if (nextRain && !items.some((i) => i.tag.includes("PRECIPITATION"))) {
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

async function reverseGeocode(lat: number, lon: number): Promise<{ name: string; country?: string } | null> {
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=en`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const feat = data?.features?.[0];
      if (feat?.properties) {
        const p = feat.properties;
        const cityName = p.city || p.town || p.village || p.municipality || p.district || p.county || p.name;
        if (cityName) {
          const state = p.state && p.state !== cityName && !p.state.toLowerCase().includes("province") ? p.state : null;
          const name = state ? `${cityName}, ${state}` : cityName;
          return { name, country: p.country };
        }
      }
    }
  } catch {}

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      const cityName = data.city || data.locality || data.principalSubdivision;
      if (cityName) {
        return { name: cityName, country: data.countryName };
      }
    }
  } catch {}

  return null;
}

function Index() {
  const { t } = useTranslation();
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
  const [skyChoice, setSkyChoice] = useState("auto");
  const [fontSizeChoice, setFontSizeChoice] = useState("normal");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAiGallery, setShowAiGallery] = useState(false);
  const [activeCustomBg, setActiveCustomBg] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync active custom background for city
  useEffect(() => {
    if (!weather?.place?.name) return;
    try {
      const saved = localStorage.getItem(`weather:custom-bg:${weather.place.name.toLowerCase().trim()}`);
      setActiveCustomBg(saved || null);
    } catch {
      setActiveCustomBg(null);
    }
  }, [weather?.place?.name]);

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
    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = +p.coords.latitude.toFixed(3);
        const lon = +p.coords.longitude.toFixed(3);
        let placeName = "My location";
        let countryName: string | undefined;

        try {
          const geo = await reverseGeocode(lat, lon);
          if (geo?.name) {
            placeName = geo.name;
            countryName = geo.country;
          }
        } catch {}

        load({ name: placeName, country: countryName, lat, lon });
      },
      () => {
        setLoading(false);
        setError("Couldn't read your location. Check browser permissions.");
      },
      { timeout: 10000 }
    );
  }

  const autoSky = weather ? skyKey(weather.current.code, weather.current.is_day) : "default";
  const sky = skyChoice === "auto" ? autoSky : skyChoice;

  useEffect(() => {
    const isDarkSky = sky === "clear-night" || sky === "cloudy-night" || sky === "storm";
    document.documentElement.classList.toggle("dark", isDarkSky);
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [sky]);

  return (
    <div className={`sky sky-${sky} min-h-screen text-foreground`}>
      {showOnboarding && (
        <OnboardingCarousel onFinish={() => setShowOnboarding(false)} />
      )}
      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* HEADER: Title + ✨ AI Gallery Button + Settings AppMenu */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">My Weather Pal</h1>
            <button
              type="button"
              onClick={() => setShowAiGallery(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 hover:bg-primary/20 px-3 py-1 text-xs font-semibold text-primary transition-all active:scale-95 shadow-xs cursor-pointer"
              title="Open AI Background Gallery"
            >
              <span className="text-sm">✨</span>
              <span>AI Gallery</span>
            </button>
          </div>

          <AppMenu
            unit={unit}
            onUnitChange={toggleUnit}
            skyChoice={skyChoice}
            onSkyChange={(v) => {
              setSkyChoice(v);
              try {
                if (v === "auto") localStorage.removeItem(SKY_PREF_KEY);
                else localStorage.setItem(SKY_PREF_KEY, v);
              } catch {}
            }}
            fontSizeChoice={fontSizeChoice}
            onFontSizeChange={(v) => {
              setFontSizeChoice(v);
              const opt = FONT_SIZE_OPTIONS.find((o) => o.value === v);
              if (opt) document.documentElement.style.fontSize = opt.scale;
              try {
                if (v === "normal") localStorage.removeItem(FONT_SIZE_KEY);
                else localStorage.setItem(FONT_SIZE_KEY, v);
              } catch {}
            }}
          />
        </header>

        {/* SEARCH BAR */}
        <form onSubmit={onSearchSubmit} className="relative flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
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

        {/* FAVORITES BAR */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/60 p-2.5">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
            <span className="text-xs font-medium text-muted-foreground mr-1">{t("favorites")}:</span>
            {favorites.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">{t("no_saved")}</span>
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
                  <span className="font-medium">{fav.name}</span>
                  <button
                    type="button"
                    onClick={(e) => removeFavorite(fav, e)}
                    className="text-muted-foreground hover:text-foreground text-[10px]"
                    aria-label={`Remove ${fav.name} from favorites`}
                  >
                    ✕
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* MAIN WEATHER VIEW */}
        {weather ? (
          <WeatherView
            w={weather}
            disasters={compileDisasterTicker(weather, nearbyDisasters)}
            refreshing={refreshing}
            isFav={isFavorite(weather.place, favorites)}
            onToggleFav={() => toggleFavorite(weather.place)}
            onRefresh={() => load(weather.place, unit, true)}
            onOpenGallery={() => setShowAiGallery(true)}
            customBg={activeCustomBg}
          />
        ) : loading ? (
          <div className="mt-8 flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="mt-3 text-xs">Loading weather data…</span>
          </div>
        ) : null}

        {/* LOCATION PERMISSION DIALOG */}
        {showLocDialog && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          >
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
              <h3 className="text-base font-bold">Use your location?</h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Your coordinates are sent only to Open-Meteo for the forecast. No tracking or accounts.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLocDialog(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={useLocation}
                  className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                >
                  Allow location
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DEDICATED AI GALLERY MODAL */}
        <AiGalleryModal
          isOpen={showAiGallery}
          onClose={() => setShowAiGallery(false)}
          city={weather?.place.name || "Local Scenery"}
          country={weather?.place.country}
          weatherCode={weather?.current.code ?? 0}
          weatherDesc={weather ? describe(weather.current.code).label : "Clear sky"}
          activeBackground={activeCustomBg}
          onSelectBackground={(newBg) => {
            setActiveCustomBg(newBg);
            const cityName = weather?.place.name || "default";
            if (!newBg) {
              try {
                localStorage.removeItem(`weather:custom-bg:${cityName.toLowerCase().trim()}`);
              } catch {}
            } else {
              try {
                localStorage.setItem(`weather:custom-bg:${cityName.toLowerCase().trim()}`, newBg);
              } catch {}
            }
          }}
        />
      </main>
    </div>
  );
}
