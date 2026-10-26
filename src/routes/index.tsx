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
  skyKey,
} from "@/lib/weather";
import { WeatherView, type TickerAlertItem } from "@/components/WeatherView";
import { AppMenu } from "@/components/AppMenu";
import { LanguageSelector } from "@/components/LanguageSelector";
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
  name: "Bangkok",
  country: "Thailand",
  lat: 13.7563,
  lon: 100.5018,
};

const SKY_PREF_KEY = "weather:sky-pref";
const FONT_SIZE_KEY = "weather:font-size-pref";

// Fetch USGS significant earthquakes past 24h
async function fetchEarthquakeAlerts(): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson",
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).slice(0, 3).map((f: any) => ({
      id: `eq-${f.id}`,
      text: `USGS: M${f.properties.mag?.toFixed(1)} Earthquake — ${f.properties.place}`,
      severity: f.properties.mag >= 6.5 ? "disaster" : "warning",
      tag: "Earthquake",
      tagKey: "alert_tag_earthquake",
    }));
  } catch {
    return [];
  }
}

// Fetch US National Weather Service active alerts for US coordinates
async function fetchNWSAlerts(lat: number, lon: number): Promise<TickerAlertItem[]> {
  if (lat < 24 || lat > 50 || lon < -125 || lon > -66) return [];
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
      {
        headers: { "User-Agent": "(myweather-pal, contact@lovable.app)" },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).slice(0, 3).map((f: any) => {
      const eventName = f.properties.event || "Weather Alert";
      const isSevere =
        f.properties.severity === "Extreme" ||
        f.properties.severity === "Severe" ||
        eventName.toLowerCase().includes("warning");
      return {
        id: `nws-${f.id || f.properties.id}`,
        text: `NWS Alert: ${eventName} — ${f.properties.headline || f.properties.description?.slice(0, 100)}`,
        severity: isSevere ? "disaster" : "warning",
        tag: "NWS US Alert",
        tagKey: "alert_tag_nws",
      };
    });
  } catch {
    return [];
  }
}

// Fetch TMD (Thailand Meteorological Department) Warnings
async function fetchTMDAlerts(lat: number, lon: number): Promise<TickerAlertItem[]> {
  if (lat < 5.5 || lat > 20.5 || lon < 97 || lon > 106) return [];
  try {
    const res = await fetch("https://data.tmd.go.th/api/WeatherWarning/v2/?uid=api&ukey=api&format=json", {
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const warnings = data.Warning || data.warning || [];
    if (!Array.isArray(warnings) || warnings.length === 0) return [];

    return warnings.slice(0, 2).map((w: any, idx: number) => ({
      id: `tmd-${idx}`,
      text: `TMD Thailand Alert: ${w.TitleTh || w.TitleEn || w.DescriptionTh?.slice(0, 90) || "Severe Weather Advisory"}`,
      severity: "warning",
      tag: "TMD Thailand",
      tagKey: "alert_tag_tmd",
    }));
  } catch {
    return [];
  }
}

// Fetch Open-Meteo Flood/River discharge anomaly
async function fetchRiverDischargeAlert(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      `https://flood-api.open-meteo.com/v1/flood?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&daily=river_discharge,river_discharge_mean&forecast_days=3`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const daily = data.daily;
    if (!daily || !daily.river_discharge || !daily.river_discharge_mean) return [];

    const todayDischarge = daily.river_discharge[0] ?? 0;
    const meanDischarge = daily.river_discharge_mean[0] ?? 1;

    if (meanDischarge > 10 && todayDischarge > meanDischarge * 2.5) {
      return [
        {
          id: `flood-river-${lat}-${lon}`,
          text: `Hydrological Alert: Local river discharge is elevated (${todayDischarge.toFixed(0)} m³/s, normal ~${meanDischarge.toFixed(0)} m³/s). River basin flood watch in effect.`,
          severity: "disaster",
          tag: "Flood Watch",
          tagKey: "alert_tag_flood",
        },
      ];
    }
    return [];
  } catch {
    return [];
  }
}

// Derive meteorological advisories
function deriveLocalWeatherAlerts(w: Weather): TickerAlertItem[] {
  const alerts: TickerAlertItem[] = [];
  const code = w.current.code;
  const wind = w.current.windSpeed;
  const gust = w.current.windGusts ?? wind;
  const temp = w.current.temp;
  const aqi = w.current.aqi ?? 0;
  const isImperial = w.unit === "imperial";

  if (code >= 95) {
    alerts.push({
      id: "alert-storm",
      text: "Severe Thunderstorm Warning: Cloud-to-ground lightning, high turbulence and sudden downdrafts expected in this cell.",
      severity: "disaster",
      tag: "Severe Storm",
      tagKey: "alert_tag_storm",
    });
  } else if (code >= 61 && code <= 65) {
    alerts.push({
      id: "alert-heavy-rain",
      text: "Heavy to very heavy rains: Localized surface water ponding, low visibility, and flash runoff risk on roads.",
      severity: "warning",
      tag: "Flash Rain",
      tagKey: "alert_tag_rain",
    });
  } else if (code >= 71 && code <= 77) {
    alerts.push({
      id: "alert-snow",
      text: "Winter Weather Advisory: Snow accumulation, icy bridges, and slippery roadway conditions.",
      severity: "warning",
      tag: "Winter Alert",
      tagKey: "alert_tag_winter",
    });
  }

  const windThreshold = isImperial ? 35 : 55;
  const gustThreshold = isImperial ? 45 : 72;
  if (gust >= gustThreshold || wind >= windThreshold) {
    alerts.push({
      id: "alert-gale",
      text: `High Wind Warning: Sustained gusts reaching ${Math.round(gust)} ${isImperial ? "mph" : "km/h"}. Secure loose outdoor objects.`,
      severity: "warning",
      tag: "Gale Advisory",
      tagKey: "alert_tag_gale",
    });
  }

  if (aqi >= 151) {
    alerts.push({
      id: "alert-air-unhealthy",
      text: `Air Quality Health Warning: AQI is ${aqi} (Unhealthy). Sensitive groups, children, and elderly should avoid prolonged outdoor exertion.`,
      severity: aqi >= 201 ? "disaster" : "warning",
      tag: "AQI Hazard",
      tagKey: "alert_tag_aqi",
    });
  }

  return alerts;
}

function Index() {
  const { t } = useTranslation();
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [unit, setUnit] = useState<WeatherUnit>("metric");
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [disasters, setDisasters] = useState<TickerAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search input state
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Modals
  const [showLocDialog, setShowLocDialog] = useState(false);
  const [showAiGallery, setShowAiGallery] = useState(false);
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);

  // Sky Theme Background preference
  const [skyPref, setSkyPref] = useState<string>(() => {
    try {
      return localStorage.getItem(SKY_PREF_KEY) || "auto";
    } catch {
      return "auto";
    }
  });

  // Listen for sky background updates from AppMenu
  useEffect(() => {
    const handleSkyChange = (e: Event) => {
      const next = (e as CustomEvent).detail || "auto";
      setSkyPref(next);
    };
    window.addEventListener("weather:sky-change", handleSkyChange);
    return () => window.removeEventListener("weather:sky-change", handleSkyChange);
  }, []);

  // Compute active sky background
  const activeSky =
    skyPref !== "auto"
      ? skyPref
      : weather
      ? skyKey(weather.current.code, weather.current.isDay)
      : "clear-day";

  // Synchronize .dark mode class on root element
  useEffect(() => {
    if (typeof document === "undefined") return;
    const isDarkSky =
      activeSky === "clear-night" ||
      activeSky === "cloudy-night" ||
      activeSky === "storm";

    if (isDarkSky) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [activeSky]);

  // Apply saved font size on mount
  useEffect(() => {
    try {
      const savedFont = localStorage.getItem(FONT_SIZE_KEY);
      if (savedFont) {
        if (savedFont === "large") document.documentElement.style.fontSize = "115%";
        else if (savedFont === "xlarge") document.documentElement.style.fontSize = "130%";
        else document.documentElement.style.fontSize = "100%";
      }
    } catch {}
  }, []);

  // Initialize saved unit & favorites from localStorage
  useEffect(() => {
    try {
      const savedUnit = loadUnitPref();
      if (savedUnit) setUnit(savedUnit);

      const favs = loadFavorites();
      if (favs && favs.length > 0) {
        setFavorites(favs);
        setPlace(favs[0]);
      }
    } catch {}
  }, []);

  // Fetch live weather data whenever place or unit changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getWeather(place, unit)
      .then((data) => {
        if (cancelled) return;
        setWeather(data);
        setLoading(false);

        // Fetch disaster & environmental advisories
        Promise.allSettled([
          fetchEarthquakeAlerts(),
          fetchNWSAlerts(place.lat, place.lon),
          fetchTMDAlerts(place.lat, place.lon),
          fetchRiverDischargeAlert(place.lat, place.lon),
        ]).then((results) => {
          if (cancelled) return;
          const merged: TickerAlertItem[] = [];
          results.forEach((r) => {
            if (r.status === "fulfilled" && r.value.length > 0) {
              merged.push(...r.value);
            }
          });
          const localAlerts = deriveLocalWeatherAlerts(data);
          merged.push(...localAlerts);
          setDisasters(merged);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error fetching weather:", err);
        setError("Failed to load forecast. Please check your connection.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [place, unit]);

  // Debounced search query autocomplete
  useEffect(() => {
    if (!q.trim() || q.trim().length < 2) {
      setSuggestions([]);
      setSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCity(q.trim());
        setSuggestions(results);
        setSearchOpen(true);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [q]);

  // Unit toggle
  const toggleUnit = (nextUnit: WeatherUnit) => {
    setUnit(nextUnit);
    saveUnitPref(nextUnit);
  };

  // Favorite toggle
  const handleToggleFavorite = () => {
    const isFav = isFavorite(place, favorites);
    const updated = isFav
      ? favorites.filter((f) => !isSamePlace(f, place))
      : [place, ...favorites];
    setFavorites(updated);
    saveFavorites(updated);
  };

  // Refresh current forecast
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const data = await getWeather(place, unit);
      setWeather(data);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  // Search submit
  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      setPlace(suggestions[0]);
      setQ("");
      setSearchOpen(false);
    }
  };

  // Handle Geolocation with Reverse Geocoding
  async function handleAllowLocation() {
    setShowLocDialog(false);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your device.");
      return;
    }
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        let detectedCity = "My Location";
        let detectedCountry = "";

        try {
          const photonRes = await fetch(
            `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`,
            { signal: AbortSignal.timeout(3500) }
          );
          if (photonRes.ok) {
            const data = await photonRes.json();
            const first = data.features?.[0]?.properties;
            if (first) {
              detectedCity = first.city || first.name || first.county || detectedCity;
              detectedCountry = first.country || "";
            }
          }
        } catch {
          try {
            const bdcRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
              { signal: AbortSignal.timeout(3000) }
            );
            if (bdcRes.ok) {
              const bdcData = await bdcRes.json();
              detectedCity = bdcData.city || bdcData.locality || detectedCity;
              detectedCountry = bdcData.countryName || "";
            }
          } catch {}
        }

        setPlace({
          name: detectedCity,
          country: detectedCountry,
          lat,
          lon,
        });
      },
      () => {
        setError("Couldn't read location. Check browser permissions.");
        setLoading(false);
      },
      { timeout: 9000, maximumAge: 60000 }
    );
  }

  return (
    <div className={`min-h-screen sky sky-${activeSky} text-foreground transition-colors`}>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌦️</span>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-tight">
                {t("app_title", "My Weather Pal")}
              </h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                {t("tagline", "Private • Accurate • Curated Art")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAiGallery(true)}
              className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer"
              title={t("gallery_title", "Open AI Watercolor Gallery")}
            >
              <span>✨</span>
              <span>{t("tab_curated_short", "AI Gallery")}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector variant="compact" />
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

          {/* Autocomplete Dropdown */}
          {searchOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-50 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
              {suggestions.map((item, idx) => (
                <button
                  key={`${item.name}-${item.lat}-${idx}`}
                  type="button"
                  onClick={() => {
                    setPlace(item);
                    setQ("");
                    setSearchOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors border-b last:border-b-0 border-border/50 cursor-pointer"
                >
                  <span className="font-medium text-foreground">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.admin1 ? `${item.admin1}, ` : ""}
                    {item.country}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Favorite Cities Bar */}
        {favorites.length > 0 && (
          <section className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
              ⭐ {t("favorites", "Favorites")}:
            </span>
            {favorites.map((fav) => {
              const active = isSamePlace(fav, place);
              return (
                <button
                  key={`fav-${fav.name}-${fav.lat}`}
                  type="button"
                  onClick={() => setPlace(fav)}
                  className={`rounded-full px-3 py-1 text-xs font-medium shrink-0 transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                  }`}
                >
                  {fav.name}
                </button>
              );
            })}
          </section>
        )}

        {/* Weather Content View */}
        {loading && !weather ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="animate-spin text-3xl">🌦️</div>
            <p className="text-xs text-muted-foreground animate-pulse">
              Loading weather forecast…
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center text-sm text-destructive">
            <p>{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-xs text-destructive-foreground hover:bg-destructive/90"
            >
              Try Again
            </button>
          </div>
        ) : weather ? (
          <WeatherView
            w={weather}
            disasters={disasters}
            refreshing={refreshing}
            isFav={isFavorite(place, favorites)}
            onToggleFav={handleToggleFavorite}
            onRefresh={handleRefresh}
            onOpenGallery={() => setShowAiGallery(true)}
            customBg={customBgUrl}
          />
        ) : null}
      </main>

      {/* Geolocation Permissions Dialog */}
      {showLocDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl text-card-foreground animate-in zoom-in-95">
            <div className="flex items-center gap-2 mb-2 text-primary text-lg">
              <span>📍</span>
              <h3 className="font-semibold text-sm">
                {t("loc_dialog_title", "Use Your Current Location")}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {t(
                "loc_dialog_desc",
                "My Weather Pal will look up your coordinates directly in your browser without tracking or saving your location to any remote servers."
              )}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLocDialog(false)}
                className="px-3 py-1.5 rounded-lg border border-border bg-muted text-xs font-medium hover:bg-muted/80 text-foreground cursor-pointer"
              >
                {t("loc_dialog_cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleAllowLocation}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium shadow-xs hover:bg-primary/90 cursor-pointer"
              >
                {t("loc_dialog_allow", "Allow Location")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI & Landmark Art Gallery Modal */}
      {weather && (
        <AiGalleryModal
          isOpen={showAiGallery}
          onClose={() => setShowAiGallery(false)}
          cityName={weather.place.name}
          weatherDesc={weather.current.desc || "Clear"}
          weatherCode={weather.current.code}
          tempC={
            weather.unit === "imperial"
              ? ((weather.current.temp - 32) * 5) / 9
              : weather.current.temp
          }
          onSelectBg={(url) => setCustomBgUrl(url)}
        />
      )}

      {/* Footer */}
      <footer className="mt-8 border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <p>
          {t("weather_by", "Weather data by Open-Meteo • AI Watercolor Art")}
        </p>
        <p className="mt-1">
          <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
            {t("privacy_policy", "Privacy Policy")}
          </Link>
        </p>
      </footer>
    </div>
  );
}
