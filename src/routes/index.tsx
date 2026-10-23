// src/routes/index.tsx
import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  type Weather,
  type Place,
  type WeatherUnit,
  searchCity,
  getWeather,
  loadUnitPref,
  saveUnitPref,
  loadFavorites,
  saveFavorites,
  isSamePlace,
  isFavorite,
} from "@/lib/weather";
import { WeatherView, type TickerAlertItem } from "@/components/WeatherView";
import { AppMenu } from "@/components/AppMenu";
import { AiGalleryModal } from "@/components/AiGalleryModal";

export const Route = createFileRoute("/")({
  head: () => ({
    title: "My Weather Pal — Private, Art-Infused Forecasts",
    meta: [
      {
        name: "description",
        content: "Minimalist, account-free weather app featuring curated AI watercolor backgrounds and live meteorological advisories.",
      },
      { property: "og:title", content: "My Weather Pal — Private Weather" },
      {
        property: "og:description",
        content: "Hyperlocal weather forecasts paired with custom AI watercolor art.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULT_PLACE: Place = {
  name: "Ratchaburi",
  country: "Thailand",
  lat: 13.528,
  lon: 99.813,
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function fetchLiveEarthquakes(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items: TickerAlertItem[] = [];
    const maxRadiusKm = 800;

    for (const feat of data.features ?? []) {
      const coords = feat.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const eqLon = coords[0];
      const eqLat = coords[1];
      const dist = haversineKm(lat, lon, eqLat, eqLon);
      if (dist <= maxRadiusKm) {
        const mag = feat.properties?.mag ?? 0;
        const place = feat.properties?.place ?? "Nearby region";
        items.push({
          icon: "🌋",
          tag: "EARTHQUAKE ALERT",
          tagKey: "alert_earthquake_tag",
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
            tagKey: "alert_flood_tag",
            text: `High river discharge detected (${Math.round(discharge)} m³/s). Basin water levels elevated.`,
            textKey: "alert_flood_text",
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
      const url = "https://data.tmd.go.th/api/WeatherWarningNews/v1/?uid=api&ukey=api12345&format=json";
      const res = await fetch(url, {
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
      tagKey: "alert_thunderstorm_tag",
      text: "Active electrical storm and lightning detected in your immediate vicinity. Seek indoor shelter.",
      textKey: "alert_thunderstorm_text",
      severity: "disaster",
    });
  } else if (code >= 71 && code <= 77) {
    items.unshift({
      icon: "❄️",
      tag: "WINTER WEATHER ADVISORY",
      tagKey: "alert_winter_tag",
      text: "Freezing conditions with snowfall. Road surfaces may become hazardous.",
      textKey: "alert_winter_text",
      severity: "warning",
    });
  } else if (code >= 61 && code <= 67) {
    items.unshift({
      icon: "🌧️",
      tag: "HEAVY PRECIPITATION ADVISORY",
      tagKey: "alert_rain_tag",
      text: "Sustained rainfall expected. Localized urban water ponding possible.",
      textKey: "alert_rain_text",
      severity: "warning",
    });
  }

  const nextRain = w.hourly.find((h) => h.precipProb >= 50);
  if (nextRain && !items.some((i) => i.tag.includes("PRECIPITATION") || i.tagKey === "alert_rain_tag")) {
    items.push({
      icon: "💧",
      tag: "RAIN ONSET ADVISORY",
      tagKey: "alert_rain_onset_tag",
      text: `Precipitation starting around ${nextRain.time.slice(11, 16)} (${nextRain.precipProb}% chance). Carry rain protection.`,
      textKey: "alert_rain_onset_text",
      textParams: { time: nextRain.time.slice(11, 16), prob: nextRain.precipProb },
      severity: "caution",
    });
  }

  if (items.length === 0) {
    items.push({
      icon: "🛡️",
      tag: "ALL CLEAR",
      tagKey: "all_clear",
      text: "No active meteorological, seismic, or natural disaster emergencies reported for this area.",
      textKey: "alert_all_clear_text",
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
  const [showAiGallery, setShowAiGallery] = useState(false);
  const [activeCustomBg, setActiveCustomBg] = useState<string | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setUnit(loadUnitPref());
    setFavorites(loadFavorites());

    const savedPlace = localStorage.getItem("weather:last-place");
    let initialPlace = DEFAULT_PLACE;
    if (savedPlace) {
      try {
        initialPlace = JSON.parse(savedPlace);
      } catch {}
    }
    load(initialPlace, loadUnitPref());

    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!weather?.place?.name) return;
    try {
      const stored = localStorage.getItem(`weather:custom-bg:${weather.place.name.toLowerCase().trim()}`);
      setActiveCustomBg(stored || null);
    } catch {
      setActiveCustomBg(null);
    }
  }, [weather?.place?.name]);

  async function load(place: Place, u: WeatherUnit = unit) {
    setLoading(true);
    setError(null);
    try {
      const w = await getWeather(place, u);
      setWeather(w);
      try {
        localStorage.setItem("weather:last-place", JSON.stringify(place));
      } catch {}

      // Fetch disasters in parallel
      Promise.all([
        fetchLiveEarthquakes(place.lat, place.lon),
        fetchLiveRiverFlood(place.lat, place.lon),
        fetchLiveOfficialAlerts(place.lat, place.lon),
      ]).then(([eq, flood, official]) => {
        setNearbyDisasters([...official, ...flood, ...eq]);
      });
    } catch {
      const cached = localStorage.getItem("weather:last");
      if (cached) {
        setWeather(JSON.parse(cached));
        setError("Offline — showing cached weather");
      } else {
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!weather) return;
    setRefreshing(true);
    try {
      await load(weather.place, unit);
    } finally {
      setRefreshing(false);
    }
  }

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
        setError("Couldn't read location. Check browser permissions.");
        setLoading(false);
      },
      { timeout: 9000, maximumAge: 60000 }
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌦️</span>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-tight">
                My Weather Pal
              </h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                Private • Accurate • Curated Art
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAiGallery(true)}
              className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer"
              title={t("gallery_title", "Open AI Watercolor Gallery")}
            >
              <span>✨</span>
              <span>AI Gallery</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <AppMenu unit={unit} onUnitChange={toggleUnit} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4 pb-12">
        {/* Search Bar */}
        <section className="relative mb-3">
          <form onSubmit={onSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search", "Search a city...")}
              className="w-full rounded-xl border border-input bg-card px-4 py-2.5 pl-10 pr-10 text-sm shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="absolute left-3.5 text-muted-foreground text-sm">
              🔍
            </span>
            <button
              type="button"
              onClick={() => setShowLocDialog(true)}
              title={t("loc_dialog_title", "Use current location")}
              aria-label={t("loc_dialog_title", "Use current location")}
              className="absolute right-3 text-muted-foreground hover:text-foreground text-base transition-colors cursor-pointer"
            >
              📍
            </button>
          </form>

          {/* Search Dropdown Results */}
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setResults([]);
                    setQ("");
                    load(r);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  <span className="font-medium">
                    {r.name}
                    {r.country ? `, ${r.country}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {r.lat.toFixed(2)}, {r.lon.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Favorites Carousel */}
        {favorites.length > 0 && (
          <section className="mb-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
                {t("favorites", "Favorites")}:
              </span>
              {favorites.map((fav, i) => {
                const isSelected = weather && isSamePlace(fav, weather.place);
                return (
                  <div
                    key={i}
                    onClick={() => load(fav)}
                    className={`group flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all cursor-pointer shrink-0 border ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary font-medium shadow-xs"
                        : "bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span>{fav.name}</span>
                    <button
                      type="button"
                      onClick={(e) => removeFavorite(fav, e)}
                      title="Remove favorite"
                      className="opacity-60 hover:opacity-100 text-[10px] ml-0.5"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Offline Banner */}
        {offline && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            ⚠️ You are offline. Showing latest cached forecast.
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !weather && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">
              Fetching weather data…
            </p>
          </div>
        )}

        {/* Main Weather View */}
        {weather && (
          <WeatherView
            w={weather}
            disasters={compileDisasterTicker(weather, nearbyDisasters)}
            refreshing={refreshing}
            isFav={isFavorite(weather.place, favorites)}
            onToggleFav={() => toggleFavorite(weather.place)}
            onRefresh={refresh}
            onOpenGallery={() => setShowAiGallery(true)}
            customBg={activeCustomBg}
          />
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-muted-foreground border-t border-border/40 pt-6">
          <p>{t("weather_by", "Weather data by Open-Meteo • Curated AI Watercolor Backgrounds")}</p>
          <div className="mt-2 flex items-center justify-center gap-4">
            <Link to="/privacy" className="hover:underline">
              {t("privacy_policy", "Privacy Policy")}
            </Link>
          </div>
        </footer>
      </main>

      {/* AI Gallery Modal */}
      <AiGalleryModal
        open={showAiGallery}
        onOpenChange={setShowAiGallery}
        cityName={weather?.place.name || DEFAULT_PLACE.name}
        country={weather?.place.country}
        weatherCode={weather?.current.code}
        weatherDesc={weather ? t("cond_clear", "Clear sky") : "Clear sky"}
        activeBg={activeCustomBg}
        onSelectBackground={(bg) => {
          setActiveCustomBg(bg);
          const cityKey = (weather?.place.name || DEFAULT_PLACE.name).toLowerCase().trim();
          if (bg) {
            try {
              localStorage.setItem(`weather:custom-bg:${cityKey}`, bg);
            } catch {}
          } else {
            try {
              localStorage.removeItem(`weather:custom-bg:${cityKey}`);
            } catch {}
          }
        }}
      />

      {/* Geolocation Permission Dialog */}
      {showLocDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl text-card-foreground">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📍</span>
              <h3 className="font-bold text-sm">{t("loc_dialog_title", "Use Your Current Location")}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("loc_dialog_desc", "My Weather Pal will look up your coordinates directly in your browser without tracking or saving your location to any remote servers.")}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLocDialog(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent transition-colors cursor-pointer"
              >
                {t("loc_dialog_cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={useLocation}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
              >
                {t("loc_dialog_allow", "Allow Location")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
