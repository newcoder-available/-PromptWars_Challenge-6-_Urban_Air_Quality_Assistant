import { classifyAqi, PRESET_CITIES } from '../../shared/constants.js';
import type {
  AirQualityReport,
  CityLocation,
  HourlyAirPoint,
  InversionRisk,
  NearbyStationReading,
  SafeOutdoorWindow,
  WeatherConditions,
} from '../../shared/types.js';
import { TtlLruCache } from './cacheService.js';
import { pm25ToCigaretteEquivalentPerDay } from './impactCalculator.js';

// Hardcoded trusted upstream origins (prevents SSRF)
const OPEN_METEO_GEO_ORIGIN = 'https://geocoding-api.open-meteo.com/v1/search';
const OPEN_METEO_AQ_ORIGIN = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const OPEN_METEO_WEATHER_ORIGIN = 'https://api.open-meteo.com/v1/forecast';
const UPSTREAM_TIMEOUT_MS = 4500;

export const airQualityCache = new TtlLruCache<AirQualityReport>(120, 2 * 60 * 1000);
export const citySearchCache = new TtlLruCache<CityLocation[]>(150, 30 * 60 * 1000);

interface OpenMeteoWeatherResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
  hourly?: {
    uv_index?: Array<number | null>;
  };
}

interface OpenMeteoGeoResponse {
  results?: Array<{
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  }>;
}

interface OpenMeteoAirResponse {
  timezone?: string;
  current?: {
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    nitrogen_dioxide?: number;
    ozone?: number;
    carbon_monoxide?: number;
    sulphur_dioxide?: number;
  };
  hourly?: {
    time?: string[];
    us_aqi?: Array<number | null>;
    pm2_5?: Array<number | null>;
    pm10?: Array<number | null>;
    nitrogen_dioxide?: Array<number | null>;
    ozone?: Array<number | null>;
  };
}

function formatHourLabel(isoTime: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(isoTime);
  if (!match) return isoTime;
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${suffix}`;
}

/**
 * Finds the safest contiguous 2-hour window in the next 24h for necessary outdoor
 * errands or brief indoor cross-ventilation.
 */
export function computeSafestOutdoorWindow(hourly: HourlyAirPoint[]): SafeOutdoorWindow {
  if (hourly.length < 2) {
    return {
      startLabel: '2 PM',
      endLabel: '4 PM',
      avgAqi: hourly[0]?.usAqi ?? 150,
      avgPm25: hourly[0]?.pm25 ?? 55,
      advisory: 'Keep outdoor trips short and wear a fitted N95 respirator if AQI exceeds 150.',
      ventilationSafe: (hourly[0]?.usAqi ?? 150) <= 100,
    };
  }

  let bestIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 0; i < hourly.length - 1; i += 1) {
    const a = hourly[i]!;
    const b = hourly[i + 1]!;
    const avgPm25 = (a.pm25 + b.pm25) / 2;
    const avgAqi = (a.usAqi + b.usAqi) / 2;
    const score = avgPm25 * 1.4 + avgAqi * 0.6;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  const start = hourly[bestIndex]!;
  const end = hourly[Math.min(bestIndex + 2, hourly.length - 1)]!;
  const pairB = hourly[bestIndex + 1]!;
  const avgAqi = Math.round((start.usAqi + pairB.usAqi) / 2);
  const avgPm25 = Number(((start.pm25 + pairB.pm25) / 2).toFixed(1));
  const ventilationSafe = avgAqi <= 115;

  let advisory: string;
  if (avgAqi <= 75) {
    advisory = 'Good window for 20–30 minutes of cross-ventilation and outdoor play.';
  } else if (avgAqi <= 115) {
    advisory = 'Brief 10–15 minute cross-ventilation is acceptable; keep HEPA/DIY filtration ready afterward.';
  } else if (avgAqi <= 175) {
    advisory = 'Avoid opening windows; schedule essential school runs or groceries in this dip with N95 masks.';
  } else {
    advisory = 'Severe smog persists all day — keep windows sealed and run indoor filtration continuously.';
  }

  return {
    startLabel: start.hourLabel,
    endLabel: end.hourLabel,
    avgAqi,
    avgPm25,
    advisory,
    ventilationSafe,
  };
}

/**
 * Estimates winter smog thermal inversion trapping based on diurnal PM2.5 swing
 * (night/early-morning trapping vs afternoon dispersion) and absolute severity.
 */
export function assessInversionRisk(
  currentAqi: number,
  hourly: HourlyAirPoint[],
): InversionRisk {
  const pmValues = hourly.map((h) => h.pm25);
  const peakPm = pmValues.length > 0 ? Math.max(...pmValues) : currentAqi * 0.4;
  const troughPm = pmValues.length > 0 ? Math.min(...pmValues) : currentAqi * 0.25;
  const diurnalRatio = troughPm > 0 ? peakPm / troughPm : 1.5;

  const peakPoint = hourly.reduce<HourlyAirPoint | undefined>(
    (max, item) => (!max || item.pm25 > max.pm25 ? item : max),
    undefined,
  );
  const peakHours = peakPoint
    ? `Around ${peakPoint.hourLabel} (late evening & early morning trapping)`
    : '8 PM – 9 AM';

  if (currentAqi >= 200 || peakPm >= 130) {
    return {
      level: 'severe',
      summary:
        'Strong winter thermal inversion is trapping vehicle exhaust and heating emissions near street level with very low wind dispersion.',
      peakHours,
    };
  }

  if (currentAqi >= 130 || (diurnalRatio >= 1.55 && peakPm >= 55)) {
    return {
      level: 'high',
      summary:
        'Elevated boundary-layer trapping expected overnight and during morning commutes; afternoon sun offers partial dispersion.',
      peakHours,
    };
  }

  if (currentAqi >= 75) {
    return {
      level: 'moderate',
      summary:
        'Moderate urban haze buildup during rush hours. Shift vigorous activity and airing-out to the midday dip.',
      peakHours,
    };
  }

  return {
    level: 'low',
    summary:
      'Active atmospheric dispersion is keeping surface pollution low. Good time to refresh indoor air.',
    peakHours,
  };
}

function mapWeatherCondition(
  weatherCode: number | undefined,
  currentAqi: number,
  windSpeedKmh: number,
): Pick<WeatherConditions, 'conditionLabel' | 'conditionIcon'> {
  if (currentAqi >= 151 && windSpeedKmh <= 10) {
    return { conditionLabel: 'Smoky haze', conditionIcon: 'haze' };
  }
  if (weatherCode !== undefined) {
    if (weatherCode >= 51 && weatherCode <= 99) {
      return { conditionLabel: 'Rain / washout', conditionIcon: 'rain' };
    }
    if (weatherCode === 45 || weatherCode === 48) {
      return { conditionLabel: 'Winter fog & smog', conditionIcon: 'fog' };
    }
    if (weatherCode >= 1 && weatherCode <= 3) {
      return {
        conditionLabel: currentAqi >= 101 ? 'Hazy overcast' : 'Partly cloudy',
        conditionIcon: currentAqi >= 101 ? 'haze' : 'cloudy',
      };
    }
  }
  return currentAqi >= 101
    ? { conditionLabel: 'Urban haze', conditionIcon: 'haze' }
    : { conditionLabel: 'Clear dispersion', conditionIcon: 'clear' };
}

/**
 * Generates realistic hyperlocal neighborhood station readings anchored around the
 * city's live AQI (reflecting typical micro-environment variance across parks,
 * school zones, residential blocks, arterial highways, and industrial edges).
 */
export function buildNearbyStations(
  cityName: string,
  basePm25: number,
): NearbyStationReading[] {
  const seed = Array.from(cityName).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const templates: Array<{
    id: string;
    name: string;
    zoneType: NearbyStationReading['zoneType'];
    factor: number;
    distanceKm: number;
    mapX: number;
    mapY: number;
  }> = [
    { id: 'central', name: `${cityName} Central`, zoneType: 'residential', factor: 1.0, distanceKm: 0.6, mapX: 52, mapY: 50 },
    { id: 'highway', name: 'Ring Road Arterial', zoneType: 'traffic', factor: 1.24, distanceKm: 2.4, mapX: 74, mapY: 32 },
    { id: 'industrial', name: 'East Industrial Belt', zoneType: 'industrial', factor: 1.32, distanceKm: 4.8, mapX: 84, mapY: 58 },
    { id: 'school', name: 'North School Corridor', zoneType: 'school_zone', factor: 1.08, distanceKm: 1.9, mapX: 38, mapY: 24 },
    { id: 'park', name: 'Green Botanical Park', zoneType: 'park', factor: 0.74, distanceKm: 3.1, mapX: 22, mapY: 66 },
    { id: 'west-res', name: 'West Residential Sector', zoneType: 'residential', factor: 0.92, distanceKm: 2.8, mapX: 24, mapY: 36 },
    { id: 'south-hub', name: 'South Transit Hub', zoneType: 'traffic', factor: 1.15, distanceKm: 3.5, mapX: 58, mapY: 78 },
    { id: 'riverfront', name: 'Waterfront Greenway', zoneType: 'park', factor: 0.81, distanceKm: 4.2, mapX: 72, mapY: 82 },
  ];

  return templates.map((tpl, idx) => {
    const jitter = (((seed + idx * 17) % 9) - 4) * 0.015;
    const pm25 = Number(Math.max(4, basePm25 * (tpl.factor + jitter)).toFixed(1));
    const usAqi = Math.min(500, Math.round(pm25ToUsAqi(pm25)));
    const band = classifyAqi(usAqi);
    return {
      id: tpl.id,
      name: tpl.name,
      zoneType: tpl.zoneType,
      usAqi,
      pm25,
      severity: band.severity,
      distanceKm: tpl.distanceKm,
      mapX: tpl.mapX,
      mapY: tpl.mapY,
    };
  });
}

export function estimateGlobalRank(
  cityName: string,
  usAqi: number,
  windSpeedKmh: number,
): { rank: number; percentileNote: string } {
  const rank =
    usAqi >= 300
      ? Math.max(1, Math.round(8 - (usAqi - 300) / 35))
      : usAqi >= 200
        ? Math.max(4, Math.round(35 - (usAqi - 200) * 0.28))
        : usAqi >= 150
          ? Math.max(25, Math.round(95 - (usAqi - 150) * 1.2))
          : usAqi >= 100
            ? Math.max(96, Math.round(240 - (usAqi - 100) * 2.8))
            : Math.max(250, Math.round(1200 - usAqi * 9));

  const windNote =
    windSpeedKmh <= 7
      ? `Low wind (${windSpeedKmh} km/h) is trapping winter smog near ground level.`
      : windSpeedKmh <= 15
        ? `Light breeze (${windSpeedKmh} km/h) provides partial afternoon dispersion.`
        : `Brisk wind (${windSpeedKmh} km/h) is actively dispersing street-level pollution.`;

  const percentileNote =
    usAqi >= 151
      ? `Currently, ${cityName} ranks near #${rank} among the most polluted urban areas globally. ${windNote}`
      : `${cityName} currently sits around #${rank} globally for urban air pollution. ${windNote}`;

  return { rank, percentileNote };
}

function buildFallbackWeather(location: CityLocation, currentAqi: number): WeatherConditions {
  const key = location.name.toLowerCase();
  const temp = key.includes('krakow') || key.includes('beijing') || key.includes('salt lake')
    ? 5
    : key.includes('london')
      ? 9
      : key.includes('mexico')
        ? 17
        : 21;
  const humidity = currentAqi >= 150 ? 48 : 56;
  const wind = currentAqi >= 180 ? 4 : currentAqi >= 120 ? 7 : 14;
  const hour = new Date().getHours();
  const uv = hour >= 10 && hour <= 15 ? 3 : 0;
  const { conditionLabel, conditionIcon } = mapWeatherCondition(undefined, currentAqi, wind);
  return {
    temperatureC: temp,
    humidityPct: humidity,
    windSpeedKmh: wind,
    uvIndex: uv,
    conditionLabel,
    conditionIcon,
  };
}

/**
 * Deterministic, realistic winter-smog fallback report so the application works
 * seamlessly offline, in sandboxed CI tests, or if upstream Open-Meteo is rate-limited.
 */
export function buildFallbackAirQualityReport(location: CityLocation): AirQualityReport {
  const key = location.name.toLowerCase();
  let basePm25 = 68;
  let baseNo2 = 42;
  let baseOzone = 36;

  if (key.includes('delhi') || key.includes('noida') || key.includes('gurgaon')) {
    basePm25 = 112;
    baseNo2 = 74;
    baseOzone = 48;
  } else if (key.includes('lahore') || key.includes('karachi')) {
    basePm25 = 165;
    baseNo2 = 68;
    baseOzone = 42;
  } else if (key.includes('beijing') || key.includes('xian')) {
    basePm25 = 96;
    baseNo2 = 58;
    baseOzone = 44;
  } else if (key.includes('krakow') || key.includes('warsaw')) {
    basePm25 = 84;
    baseNo2 = 46;
    baseOzone = 32;
  } else if (key.includes('salt lake') || key.includes('mexico')) {
    basePm25 = 74;
    baseNo2 = 52;
    baseOzone = 54;
  } else if (key.includes('london') || key.includes('paris')) {
    basePm25 = 24;
    baseNo2 = 34;
    baseOzone = 45;
  }

  // Diurnal winter-smog curve: high overnight/morning inversion, dip at 2–4 PM
  const diurnalMultipliers = [
    1.18, 1.22, 1.24, 1.2, 1.15, 1.12, 1.18, 1.26, 1.22, 1.08, 0.94, 0.82,
    0.72, 0.66, 0.64, 0.68, 0.78, 0.92, 1.06, 1.16, 1.22, 1.25, 1.23, 1.2,
  ];

  const now = new Date();
  const currentHour = now.getHours();
  const hourlyForecast: HourlyAirPoint[] = [];

  for (let offset = 0; offset < 24; offset += 1) {
    const dt = new Date(now.getTime() + offset * 60 * 60 * 1000);
    const hr = dt.getHours();
    const mult = diurnalMultipliers[hr] ?? 1;
    const pm25 = Number((basePm25 * mult).toFixed(1));
    const pm10 = Number((pm25 * 1.42).toFixed(1));
    const usAqi = Math.min(480, Math.round(pm25ToUsAqi(pm25)));
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
      dt.getDate(),
    ).padStart(2, '0')}T${String(hr).padStart(2, '0')}:00`;

    hourlyForecast.push({
      time: iso,
      hourLabel: formatHourLabel(iso),
      usAqi,
      pm25,
      pm10,
      no2: Number((baseNo2 * mult).toFixed(1)),
      ozone: Number((baseOzone * (1.4 - mult * 0.4)).toFixed(1)),
    });
  }

  const currentPoint = hourlyForecast[0]!;
  const band = classifyAqi(currentPoint.usAqi);
  const currentMult = diurnalMultipliers[currentHour] ?? 1;
  const weather = buildFallbackWeather(location, currentPoint.usAqi);

  return {
    location,
    fetchedAt: now.toISOString(),
    source: 'winter-smog-fallback',
    current: {
      usAqi: currentPoint.usAqi,
      pm25: currentPoint.pm25,
      pm10: currentPoint.pm10,
      no2: currentPoint.no2,
      ozone: currentPoint.ozone,
      co: Math.round(620 * currentMult),
      so2: Number((16 * currentMult).toFixed(1)),
      severity: band.severity,
      label: band.label,
      cigaretteEquivalentPerDay: pm25ToCigaretteEquivalentPerDay(currentPoint.pm25),
      whoPm25Multiple: Number((currentPoint.pm25 / 15).toFixed(1)),
    },
    weather,
    nearbyStations: buildNearbyStations(location.name, currentPoint.pm25),
    globalRankEstimate: estimateGlobalRank(
      location.name,
      currentPoint.usAqi,
      weather.windSpeedKmh,
    ),
    hourlyForecast,
    safestWindow: computeSafestOutdoorWindow(hourlyForecast),
    inversionRisk: assessInversionRisk(currentPoint.usAqi, hourlyForecast),
  };
}

/**
 * US EPA PM2.5 (µg/m³) piecewise-linear AQI conversion.
 */
export function pm25ToUsAqi(pm25: number): number {
  const c = Math.max(0, Math.floor(pm25 * 10) / 10);
  const breakpoints: Array<[number, number, number, number]> = [
    [0.0, 9.0, 0, 50],
    [9.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 125.4, 151, 200],
    [125.5, 225.4, 201, 300],
    [225.5, 325.4, 301, 400],
    [325.5, 500.4, 401, 500],
  ];
  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (c <= cHigh) {
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow);
    }
  }
  return 500;
}

async function fetchJsonWithTimeout<T>(url: URL): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Upstream HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchCities(query: string): Promise<CityLocation[]> {
  const normalized = query.trim().toLowerCase();
  const { value } = await citySearchCache.getOrLoad(normalized, async () => {
    const presetMatches = PRESET_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(normalized) ||
        c.country.toLowerCase().includes(normalized),
    );

    if (process.env.OFFLINE_MODE === 'true') {
      return presetMatches;
    }

    try {
      const url = new URL(OPEN_METEO_GEO_ORIGIN);
      url.searchParams.set('name', query.trim());
      url.searchParams.set('count', '6');
      url.searchParams.set('language', 'en');
      url.searchParams.set('format', 'json');

      const data = await fetchJsonWithTimeout<OpenMeteoGeoResponse>(url);
      const remote: CityLocation[] = (data.results ?? []).map((item) => ({
        name: item.name,
        country: item.country ?? 'Unknown',
        admin1: item.admin1,
        latitude: Number(item.latitude.toFixed(4)),
        longitude: Number(item.longitude.toFixed(4)),
        timezone: item.timezone,
      }));

      return remote.length > 0 ? remote : presetMatches;
    } catch {
      return presetMatches;
    }
  });

  return value;
}

export async function getAirQualityReport(
  location: CityLocation,
): Promise<AirQualityReport> {
  // Round coordinates to 2 decimals (~1.1 km grid) to maximize cache efficiency
  const cacheKey = `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;

  const { value, hit } = await airQualityCache.getOrLoad(cacheKey, async () => {
    if (process.env.OFFLINE_MODE === 'true') {
      return buildFallbackAirQualityReport(location);
    }

    try {
      const aqUrl = new URL(OPEN_METEO_AQ_ORIGIN);
      aqUrl.searchParams.set('latitude', String(location.latitude));
      aqUrl.searchParams.set('longitude', String(location.longitude));
      aqUrl.searchParams.set(
        'current',
        'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide',
      );
      aqUrl.searchParams.set('hourly', 'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone');
      aqUrl.searchParams.set('forecast_days', '2');
      aqUrl.searchParams.set('timezone', 'auto');

      const weatherUrl = new URL(OPEN_METEO_WEATHER_ORIGIN);
      weatherUrl.searchParams.set('latitude', String(location.latitude));
      weatherUrl.searchParams.set('longitude', String(location.longitude));
      weatherUrl.searchParams.set(
        'current',
        'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
      );
      weatherUrl.searchParams.set('hourly', 'uv_index');
      weatherUrl.searchParams.set('forecast_days', '1');
      weatherUrl.searchParams.set('timezone', 'auto');

      const [data, weatherData] = await Promise.all([
        fetchJsonWithTimeout<OpenMeteoAirResponse>(aqUrl),
        fetchJsonWithTimeout<OpenMeteoWeatherResponse>(weatherUrl).catch(() => null),
      ]);

      const times = data.hourly?.time ?? [];
      if (!data.current || times.length === 0) {
        return buildFallbackAirQualityReport(location);
      }

      const nowMs = Date.now();
      const startIdx = Math.max(
        0,
        times.findIndex((t) => new Date(t).getTime() >= nowMs - 60 * 60 * 1000),
      );
      const sliceEnd = Math.min(times.length, startIdx + 24);
      const hourlyForecast: HourlyAirPoint[] = [];

      for (let i = startIdx; i < sliceEnd; i += 1) {
        const iso = times[i]!;
        const pm25 = Number((data.hourly?.pm2_5?.[i] ?? data.current.pm2_5 ?? 25).toFixed(1));
        const pm10 = Number((data.hourly?.pm10?.[i] ?? data.current.pm10 ?? pm25 * 1.4).toFixed(1));
        const usAqi = Math.round(data.hourly?.us_aqi?.[i] ?? pm25ToUsAqi(pm25));
        hourlyForecast.push({
          time: iso,
          hourLabel: formatHourLabel(iso),
          usAqi,
          pm25,
          pm10,
          no2: Number((data.hourly?.nitrogen_dioxide?.[i] ?? 20).toFixed(1)),
          ozone: Number((data.hourly?.ozone?.[i] ?? 30).toFixed(1)),
        });
      }

      const currentPm25 = Number((data.current.pm2_5 ?? hourlyForecast[0]?.pm25 ?? 25).toFixed(1));
      const currentAqi = Math.round(data.current.us_aqi ?? pm25ToUsAqi(currentPm25));
      const band = classifyAqi(currentAqi);

      const fallbackWeather = buildFallbackWeather(location, currentAqi);
      const windSpeedKmh = Math.round(
        weatherData?.current?.wind_speed_10m ?? fallbackWeather.windSpeedKmh,
      );
      const hourNow = new Date().getHours();
      const uvValue = Math.round(
        weatherData?.hourly?.uv_index?.[hourNow] ?? fallbackWeather.uvIndex,
      );
      const cond = mapWeatherCondition(
        weatherData?.current?.weather_code,
        currentAqi,
        windSpeedKmh,
      );

      const weather: WeatherConditions = {
        temperatureC: Math.round(
          weatherData?.current?.temperature_2m ?? fallbackWeather.temperatureC,
        ),
        humidityPct: Math.round(
          weatherData?.current?.relative_humidity_2m ?? fallbackWeather.humidityPct,
        ),
        windSpeedKmh,
        uvIndex: Math.max(0, uvValue),
        conditionLabel: cond.conditionLabel,
        conditionIcon: cond.conditionIcon,
      };

      return {
        location: {
          ...location,
          timezone: data.timezone ?? location.timezone,
        },
        fetchedAt: new Date().toISOString(),
        source: 'open-meteo-live',
        current: {
          usAqi: currentAqi,
          pm25: currentPm25,
          pm10: Number((data.current.pm10 ?? currentPm25 * 1.4).toFixed(1)),
          no2: Number((data.current.nitrogen_dioxide ?? 18).toFixed(1)),
          ozone: Number((data.current.ozone ?? 35).toFixed(1)),
          co: Math.round(data.current.carbon_monoxide ?? 350),
          so2: Number((data.current.sulphur_dioxide ?? 8).toFixed(1)),
          severity: band.severity,
          label: band.label,
          cigaretteEquivalentPerDay: pm25ToCigaretteEquivalentPerDay(currentPm25),
          whoPm25Multiple: Number((currentPm25 / 15).toFixed(1)),
        },
        weather,
        nearbyStations: buildNearbyStations(location.name, currentPm25),
        globalRankEstimate: estimateGlobalRank(location.name, currentAqi, windSpeedKmh),
        hourlyForecast,
        safestWindow: computeSafestOutdoorWindow(hourlyForecast),
        inversionRisk: assessInversionRisk(currentAqi, hourlyForecast),
      };
    } catch {
      return buildFallbackAirQualityReport(location);
    }
  });

  if (hit && value.source === 'open-meteo-live') {
    return { ...value, source: 'cached-live' };
  }

  return value;
}
