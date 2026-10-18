export interface OWMCurrentWeather {
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
  wmoCode?: number;
}

export interface OWMDailyForecast {
  date: string;
  dayName: string;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
}

export interface OWMWeatherData {
  current: OWMCurrentWeather;
  forecast: OWMDailyForecast[];
}

const DEFAULT_API_KEY = import.meta.env.VITE_OPENWEATHERMAP_API_KEY || '';

export async function fetchOpenWeatherData(
  cityName: string,
  units: 'metric' | 'imperial' = 'metric',
  apiKey: string = DEFAULT_API_KEY
): Promise<OWMWeatherData> {
  if (!apiKey) {
    throw new Error('OpenWeatherMap API key is missing. Set VITE_OPENWEATHERMAP_API_KEY or supply a key.');
  }

  // 1. Geocode City
  const geoRes = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${apiKey}`
  );
  if (!geoRes.ok) throw new Error(`Geocoding error: ${geoRes.statusText}`);
  const geoData = await geoRes.json();
  if (!geoData.length) throw new Error(`City "${cityName}" not found`);

  const { lat, lon, name, country } = geoData[0];

  // 2. Fetch Current Weather
  const currentRes = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`
  );
  if (!currentRes.ok) throw new Error(`Weather fetch error: ${currentRes.statusText}`);
  const cur = await currentRes.json();

  // 3. Fetch Forecast (5-day / 3-hour grouped into daily)
  const forecastRes = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`
  );
  if (!forecastRes.ok) throw new Error(`Forecast fetch error: ${forecastRes.statusText}`);
  const fcast = await forecastRes.json();

  // Group 3-hour forecasts by calendar date
  const dailyMap = new Map<string, { mins: number[]; maxs: number[]; descs: string[]; icons: string[] }>();
  for (const item of fcast.list) {
    const dateKey = item.dt_txt.split(' ')[0];
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, { mins: [], maxs: [], descs: [], icons: [] });
    }
    const day = dailyMap.get(dateKey)!;
    day.mins.push(item.main.temp_min);
    day.maxs.push(item.main.temp_max);
    day.descs.push(item.weather[0]?.description || '');
    day.icons.push(item.weather[0]?.icon || '01d');
  }

  const forecast: OWMDailyForecast[] = Array.from(dailyMap.entries()).map(([dateStr, d]) => {
    const dObj = new Date(dateStr);
    const dayName = dObj.toLocaleDateString(undefined, { weekday: 'short' });
    const midIndex = Math.floor(d.descs.length / 2);
    return {
      date: dateStr,
      dayName,
      tempMin: Math.round(Math.min(...d.mins)),
      tempMax: Math.round(Math.max(...d.maxs)),
      description: d.descs[midIndex] || 'Clear',
      icon: d.icons[midIndex] || '01d',
    };
  });

  return {
    current: {
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
    },
    forecast,
  };
}
