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
      { title: "My Weather Pal" },
      { name: "description", content: "Current temperature, hourly and 7-day forecast. No tracking, works offline." },
      { property: "og:title", content: "My Weather Pal" },
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

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getTickerAlerts(w: Weather): Array<{ icon: string; text: string; severity: "warning" | "caution" | "clear" }> {
  const items: Array<{ icon: string; text: string; severity: "warning" | "caution" | "clear" }> = [];

  // Primary severe or active weather alert (thunderstorm, rain, high wind)
  const primary = getWeatherAlert(w);
  if (primary) {
    items.push({
      icon: primary.icon,
      text: primary.message,
      severity: primary.severity === "warning" ? "warning" : "caution",
    });
  }

  // Temperature extreme warnings
  const tempC = w.unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  if (tempC <= 0) {
    items.push({
      icon: "❄️",
      text: `Freeze warning: freezing temperatures (${Math.round(w.current.temp)}°${w.unit === "imperial" ? "F" : "C"}). Watch for slick roads.`,
      severity: "warning",
    });
  } else if (tempC >= 35) {
    items.push({
      icon: "🔥",
      text: `Excessive heat alert: temperatures reaching ${Math.round(w.current.temp)}°${w.unit === "imperial" ? "F" : "C"}. Stay hydrated.`,
      severity: "warning",
    });
  }

  // UV index caution
  if (w.current.uvIndex >= 8) {
    items.push({
      icon: "☀️",
      text: `Very High UV Index (${w.current.uvIndex}). Sunscreen and sun protection strongly advised.`,
      severity: "caution",
    });
  }

  // Air quality caution
  if (w.current.aqi !== undefined && w.current.aqi >= 101) {
    const aqiCat = aqiCategory(w.current.aqi);
    items.push({
      icon: "😷",
      text: `Air Quality Advisory: AQI ${w.current.aqi} (${aqiCat.label}). Sensitive groups should reduce outdoor exposure.`,
      severity: w.current.aqi >= 151 ? "warning" : "caution",
    });
  }

  // Rain probability check if no active storm/rain is already flagged
  if (!primary) {
    const nextRain = w.hourly.slice(0, 6).find((h) => h.precipProb >= 50);
    if (nextRain) {
      items.push({
        icon: "💧",
        text: `Precipitation likely around ${nextRain.time.slice(11, 16)} (${nextRain.precipProb}% probability).`,
        severity: "caution",
      });
    }
  }

  // If no adverse conditions, show calm/all-clear
  if (items.length === 0) {
    items.push({
      icon: "✅",
      text: "All Clear · No active severe weather warnings · Calm conditions in your area.",
      severity: "clear",
    });
  }

  return items;
}

function Index() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [unit, setUnit] = useState<WeatherUnit>("metric");
  const [favorites, setFavorites] = useState<Place[]>([]);
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
  const [skyChoice, setSkyChoice] = useState("auto");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(place: Place, targetUnit: WeatherUnit = unit, isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
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
      const savedSky = localStorage.getItem(SKY_PREF_KEY);
      if (savedSky && SKY_OPTIONS.some((o) => o.value === savedSky)) {
        setSkyChoice(savedSky);
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

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
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

  const autoSky = weather ? skyKey(weather.current.code, weather.current.is_day) : "default";
  const sky = skyChoice === "auto" ? autoSky : skyChoice;

  return (
    <div className={`sky sky-${sky} min-h-screen text-foreground`}>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">My Weather Pal</h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* US / Metric Unit Toggle Button */}
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

            {/* Install App Button */}
            <button
              type="button"
              onClick={handleInstallClick}
              className="rounded-lg border border-input bg-card px-2.5 py-1 text-xs font-medium text-card-foreground hover:bg-accent transition-colors"
              title="Install My Weather Pal to your home screen"
            >
              📲 Install App
            </button>

            {/* Sky theme selector */}
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

        {/* Search Field */}
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

          {/* Autocomplete suggestions dropdown */}
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

        {/* Save Favorites & Quick-Access Bar (Directly under Search) */}
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

          {/* Save / Saved Button */}
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
            refreshing={refreshing}
            isFav={isFavorite(weather.place, favorites)}
            onToggleFav={() => toggleFavorite(weather.place)}
            onRefresh={() => load(weather.place, unit, true)}
          />
        )}
      </main>

      {/* Location Permission Dialog */}
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

      {/* Install Instructions Dialog */}
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
  refreshing,
  isFav,
  onToggleFav,
  onRefresh,
}: {
  w: Weather;
  refreshing: boolean;
  isFav: boolean;
  onToggleFav: () => void;
  onRefresh: () => void;
}) {
  const d = describe(w.current.code);
  const windUnit = w.unit === "imperial" ? "mph" : "km/h";
  const precipUnit = w.unit === "imperial" ? "in" : "mm";
  const tempSymbol = w.unit === "imperial" ? "°F" : "°C";

  const advice = getClothingAdvice(w);
  const aqiInfo = w.current.aqi !== undefined ? aqiCategory(w.current.aqi) : null;
  const tickerAlerts = getTickerAlerts(w);
  const isSevere = tickerAlerts.some((a) => a.severity === "warning");
  const isCaution = tickerAlerts.some((a) => a.severity === "caution");

  return (
    <>
      {/* Current conditions card */}
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

          {/* Quick Refresh trigger & relative time */}
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

        {/* Weather Alerts Ticker (Directly over What to wear) */}
        <div
          className={`mt-4 overflow-hidden rounded-xl border text-xs shadow-2xs ${
            isSevere
              ? "border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-200"
              : isCaution
              ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
          }`}
        >
          <div className="flex items-center">
            {/* Ticker Beacon Badge */}
            <div
              className={`flex shrink-0 items-center gap-1.5 border-r px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${
                isSevere
                  ? "border-red-500/30 bg-red-500/20 text-red-600 dark:text-red-400"
                  : isCaution
                  ? "border-amber-500/30 bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    isSevere ? "bg-red-400" : isCaution ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    isSevere ? "bg-red-500" : isCaution ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
              </span>
              <span>Alerts Ticker</span>
            </div>

            {/* Scrolling Ticker Track */}
            <div className="relative flex-1 overflow-hidden py-2">
              <div className="weather-ticker-track flex w-max items-center gap-8 whitespace-nowrap hover:[animation-play-state:paused]">
                {tickerAlerts.concat(tickerAlerts).map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 text-card-foreground">
                    <span className="text-sm">{item.icon}</span>
                    <span className="font-medium">{item.text}</span>
                    <span className="font-light text-muted-foreground/50">✦</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* What to Wear / Advice Tip */}
        <div className="mt-2.5 rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-card-foreground">
          <span className="mr-1.5 font-semibold text-muted-foreground">What to wear:</span>
          {advice}
        </div>

        {/* Current Metrics Grid (5 metrics) */}
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

        {/* Sunrise & Sunset */}
        {(w.sun.sunrise !== "--:--" || w.sun.sunset !== "--:--") && (
          <div className="mt-3 flex items-center justify-around rounded-lg bg-muted/20 py-2 text-xs text-muted-foreground">
            <span>🌅 Sunrise: <strong className="text-card-foreground">{w.sun.sunrise}</strong></span>
            <span>🌇 Sunset: <strong className="text-card-foreground">{w.sun.sunset}</strong></span>
          </div>
        )}
      </section>

      {/* Hourly forecast */}
      <section className="mt-6">
        <h2 className="mb-2 font-semibold">Today</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {w.hourly.map((h) => (
            <div key={h.time} className="min-w-16 rounded-lg bg-card px-2 py-3 text-center text-card-foreground">
              <p className="text-xs text-muted-foreground">{h.time.slice(11, 16)}</p>
              <p className="my-1 text-xl">{describe(h.code).icon}</p>
              <p className="font-medium">{Math.round(h.temp)}°</p>
              {h.precipProb > 0 && (
                <span className="mt-1 block text-[10px] font-medium text-blue-500">
                  💧{h.precipProb}%
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7-day forecast */}
      <section className="mt-6">
        <h2 className="mb-2 font-semibold">7 days</h2>
        <ul className="divide-y divide-border rounded-lg bg-card text-card-foreground">
          {w.daily.map((day, i) => (
            <li key={day.date} className="flex items-center justify-between px-4 py-3">
              <span className="w-24 text-sm">
                {i === 0 ? "Today" : new Date(day.date + "T12:00").toLocaleDateString(undefined, { weekday: "long" })}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl" title={describe(day.code).label}>
                  {describe(day.code).icon}
                </span>
                {day.precipProbMax > 0 && (
                  <span className="text-xs font-medium text-blue-500">
                    💧{day.precipProbMax}%
                  </span>
                )}
              </div>
              <span className="w-24 text-right text-sm">
                <span className="font-semibold">{Math.round(day.max)}°</span>{" "}
                <span className="text-muted-foreground">{Math.round(day.min)}°</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Data by <a className="underline hover:text-foreground" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>
      </p>

      {/* Self-contained continuous ticker animation styles */}
      <style>{`
        @keyframes weatherTickerAnimation {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .weather-ticker-track {
          animation: weatherTickerAnimation 22s linear infinite;
        }
        .weather-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </>
  );
}
