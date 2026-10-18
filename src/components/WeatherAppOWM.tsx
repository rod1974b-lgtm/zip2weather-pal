import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Wind, Droplets, Thermometer, AlertCircle, Key } from 'lucide-react';

interface CurrentWeather {
  city: string;
  country: string;
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
}

interface ForecastDay {
  date: string;
  dayName: string;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
}

export function WeatherAppOWM() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Bangkok');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('owm_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');

  const saveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('owm_api_key', key);
  };

  const fetchWeather = useCallback(async (cityName: string) => {
    if (!apiKey) {
      setError('Please provide an OpenWeatherMap API key to fetch live data.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Geocoding
      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${apiKey}`
      );
      if (!geoRes.ok) throw new Error(`Geocoding error (${geoRes.status})`);
      const geo = await geoRes.json();
      if (!geo.length) throw new Error(`Location "${cityName}" not found.`);

      const { lat, lon, name, country } = geo[0];

      // 2. Current Weather
      const curRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${apiKey}`
      );
      if (!curRes.ok) throw new Error(`Weather error (${curRes.status})`);
      const cur = await curRes.json();

      // 3. 5-Day / 3-Hour Forecast grouped into Daily
      const fcastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${unit}&appid=${apiKey}`
      );
      if (!fcastRes.ok) throw new Error(`Forecast error (${fcastRes.status})`);
      const fcast = await fcastRes.json();

      const daysMap = new Map<string, { mins: number[]; maxs: number[]; descs: string[]; icons: string[] }>();
      for (const item of fcast.list) {
        const dateKey = item.dt_txt.split(' ')[0];
        if (!daysMap.has(dateKey)) {
          daysMap.set(dateKey, { mins: [], maxs: [], descs: [], icons: [] });
        }
        const bucket = daysMap.get(dateKey)!;
        bucket.mins.push(item.main.temp_min);
        bucket.maxs.push(item.main.temp_max);
        bucket.descs.push(item.weather[0]?.description || '');
        bucket.icons.push(item.weather[0]?.icon || '01d');
      }

      const daily: ForecastDay[] = Array.from(daysMap.entries()).map(([dateStr, data]) => {
        const dObj = new Date(dateStr);
        return {
          date: dateStr,
          dayName: dObj.toLocaleDateString(undefined, { weekday: 'short' }),
          tempMin: Math.round(Math.min(...data.mins)),
          tempMax: Math.round(Math.max(...data.maxs)),
          description: data.descs[Math.floor(data.descs.length / 2)] || 'Clear',
          icon: data.icons[Math.floor(data.icons.length / 2)] || '01d',
        };
      });

      setCurrent({
        city: name,
        country,
        temp: Math.round(cur.main.temp),
        feelsLike: Math.round(cur.main.feels_like),
        tempMin: Math.round(cur.main.temp_min),
        tempMax: Math.round(cur.main.temp_max),
        humidity: cur.main.humidity,
        windSpeed: Math.round(cur.wind.speed),
        description: cur.weather[0]?.description || 'Clear',
        icon: cur.weather[0]?.icon || '01d',
      });
      setForecast(daily);
    } catch (err: any) {
      setError(err.message || 'Failed to load weather data');
    } finally {
      setLoading(false);
    }
  }, [apiKey, unit]);

  useEffect(() => {
    fetchWeather(city);
  }, [city, unit, fetchWeather]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setCity(query.trim());
      setQuery('');
    }
  };

  const tempUnit = unit === 'metric' ? '°C' : '°F';
  const speedUnit = unit === 'metric' ? 'm/s' : 'mph';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 sm:p-6">
      <div className="w-full max-w-md sm:max-w-xl space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
              My Weather Pal
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              OpenWeatherMap
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUnit(unit === 'metric' ? 'imperial' : 'metric')}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 transition font-medium border border-slate-700"
            >
              {unit === 'metric' ? 'Metric (°C)' : 'US (°F)'}
            </button>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 transition text-slate-300 border border-slate-700"
              title="OpenWeatherMap API Key"
            >
              <Key className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* API Key Modal / Drawer */}
        {showKeyInput && (
          <div className="bg-slate-800/80 border border-sky-500/30 p-3 rounded-xl space-y-2 text-xs">
            <label className="font-semibold text-slate-300 block">OpenWeatherMap API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Enter OpenWeatherMap API key"
                value={apiKey}
                onChange={(e) => saveKey(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={() => {
                  setShowKeyInput(false);
                  fetchWeather(city);
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition"
              >
                Save
              </button>
            </div>
            <p className="text-slate-400 text-[11px]">
              Keys are stored privately in your browser's local storage.
            </p>
          </div>
        )}

        {/* City Search Form */}
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city (e.g. London, Tokyo, Bangkok)..."
            className="w-full pl-10 pr-24 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition shadow-sm"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition"
          >
            Search
          </button>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <p>{error}</p>
              {!apiKey && (
                <button
                  onClick={() => setShowKeyInput(true)}
                  className="mt-1.5 underline font-medium text-red-300 hover:text-white"
                >
                  Enter API Key now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="py-12 flex justify-center items-center text-slate-400 text-sm">
            <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-2" />
            Fetching forecast...
          </div>
        )}

        {/* Current Weather Card */}
        {!loading && current && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-800/40 border border-slate-700/60 rounded-3xl p-5 sm:p-6 backdrop-blur-md shadow-lg space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span>{current.city}, {current.country}</span>
                </div>
                <div className="text-5xl font-black mt-2 tracking-tight">
                  {current.temp}{tempUnit}
                </div>
                <div className="text-sm font-medium text-slate-300 capitalize mt-1">
                  {current.description}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <img
                  src={`https://openweathermap.org/img/wn/${current.icon}@2x.png`}
                  alt={current.description}
                  className="w-20 h-20 drop-shadow"
                />
                <span className="text-xs text-slate-400 font-medium">
                  H: {current.tempMax}° L: {current.tempMin}°
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/50">
              <div className="bg-slate-900/40 rounded-xl p-2.5 text-center">
                <Thermometer className="w-4 h-4 mx-auto text-sky-400 mb-1" />
                <span className="text-[10px] text-slate-400 block">Feels Like</span>
                <span className="text-xs font-semibold">{current.feelsLike}{tempUnit}</span>
              </div>
              <div className="bg-slate-900/40 rounded-xl p-2.5 text-center">
                <Droplets className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                <span className="text-[10px] text-slate-400 block">Humidity</span>
                <span className="text-xs font-semibold">{current.humidity}%</span>
              </div>
              <div className="bg-slate-900/40 rounded-xl p-2.5 text-center">
                <Wind className="w-4 h-4 mx-auto text-teal-400 mb-1" />
                <span className="text-[10px] text-slate-400 block">Wind</span>
                <span className="text-xs font-semibold">{current.windSpeed} {speedUnit}</span>
              </div>
            </div>
          </div>
        )}

        {/* 5–7 Day Forecast */}
        {!loading && forecast.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 tracking-wider uppercase px-1">
              Multi-Day Forecast
            </h2>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {forecast.map((day) => (
                <div
                  key={day.date}
                  className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-between text-center min-h-[110px]"
                >
                  <span className="text-xs font-medium text-slate-300">{day.dayName}</span>
                  <img
                    src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                    alt={day.description}
                    className="w-9 h-9"
                  />
                  <div className="text-[11px] font-semibold text-slate-100">
                    {day.tempMax}°
                    <span className="text-[10px] font-normal text-slate-400 block">{day.tempMin}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
