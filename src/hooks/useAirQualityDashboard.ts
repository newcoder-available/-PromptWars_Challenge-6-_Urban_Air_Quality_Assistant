import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_HOUSEHOLD_PROFILE, PRESET_CITIES } from '../../shared/constants.js';
import type {
  ActionPlanResponse,
  AirQualityReport,
  CityLocation,
  HouseholdProfile,
} from '../../shared/types.js';
import {
  fetchAirQualityApi,
  fetchHealth,
  generateActionPlanApi,
} from '../lib/apiClient.js';

const FAVORITES_STORAGE_KEY = 'airshield:favorite-cities:v1';

const DEFAULT_CITY: CityLocation = PRESET_CITIES[0] ?? {
  name: 'New Delhi',
  country: 'India',
  latitude: 28.6139,
  longitude: 77.209,
};

function loadSavedFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [DEFAULT_CITY.name];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [DEFAULT_CITY.name];
  } catch {
    return [DEFAULT_CITY.name];
  }
}

/**
 * Central state & real-time data hook for the AirShield AI dashboard.
 * Encapsulates live SSE streaming, manual refreshes, AI action plan generation,
 * browser geolocation, and favorite city persistence.
 */
export function useAirQualityDashboard() {
  const [selectedCity, setSelectedCity] = useState<CityLocation>(DEFAULT_CITY);
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_HOUSEHOLD_PROFILE);
  const [focusNote, setFocusNote] = useState('');

  const [report, setReport] = useState<AirQualityReport | null>(null);
  const [plan, setPlan] = useState<ActionPlanResponse | null>(null);
  const [loadingAqi, setLoadingAqi] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<'gemini-genai' | 'local-intelligence'>(
    'local-intelligence',
  );

  const [liveEnabled, setLiveEnabled] = useState(true);
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);
  const [favoriteCities, setFavoriteCities] = useState<string[]>(loadSavedFavorites);

  const initialCityRef = useRef(DEFAULT_CITY);
  const initialProfileRef = useRef(DEFAULT_HOUSEHOLD_PROFILE);

  useEffect(() => {
    fetchHealth()
      .then((health) => setAiMode(health.aiMode))
      .catch(() => {
        // Default local-intelligence badge remains active if health check is unavailable
      });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceSync((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial dashboard bootstrap
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchAirQualityApi(initialCityRef.current),
      generateActionPlanApi({
        location: initialCityRef.current,
        profile: initialProfileRef.current,
      }),
    ])
      .then(([aqReport, actionPlan]) => {
        if (cancelled) return;
        setErrorMessage(null);
        setReport(aqReport);
        setSecondsSinceSync(0);
        setPlan(actionPlan);
        setAiMode(actionPlan.engine);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to load air quality intelligence.',
        );
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingAqi(false);
        setLoadingPlan(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Real-time Server-Sent Events subscription for live AQI & weather updates
  useEffect(() => {
    if (!liveEnabled || typeof EventSource === 'undefined') {
      return;
    }

    const params = new URLSearchParams({
      lat: String(selectedCity.latitude),
      lon: String(selectedCity.longitude),
      name: selectedCity.name,
      country: selectedCity.country,
    });
    const stream = new EventSource(`/api/air-quality/stream?${params.toString()}`);

    const onAirQuality = (event: MessageEvent<string>) => {
      try {
        const liveReport = JSON.parse(event.data) as AirQualityReport;
        setReport(liveReport);
        setSecondsSinceSync(0);
        setLoadingAqi(false);
      } catch {
        // Ignore malformed SSE payload
      }
    };

    stream.addEventListener('air-quality', onAirQuality as EventListener);
    return () => {
      stream.removeEventListener('air-quality', onAirQuality as EventListener);
      stream.close();
    };
  }, [liveEnabled, selectedCity]);

  const loadCityBundle = useCallback(
    async (city: CityLocation, currentProfile: HouseholdProfile, note: string) => {
      setErrorMessage(null);
      setLoadingAqi(true);
      setLoadingPlan(true);

      try {
        const [aqReport, actionPlan] = await Promise.all([
          fetchAirQualityApi(city),
          generateActionPlanApi({
            location: city,
            profile: currentProfile,
            focusNote: note.trim() || undefined,
          }),
        ]);
        setReport(aqReport);
        setSecondsSinceSync(0);
        setPlan(actionPlan);
        setAiMode(actionPlan.engine);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to load air quality intelligence.',
        );
      } finally {
        setLoadingAqi(false);
        setLoadingPlan(false);
      }
    },
    [],
  );

  const selectCity = useCallback(
    (city: CityLocation) => {
      setSelectedCity(city);
      void loadCityBundle(city, profile, focusNote);
    },
    [focusNote, loadCityBundle, profile],
  );

  const locateMe = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setErrorMessage('Browser geolocation is unavailable — please pick a city instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        selectCity({
          name: 'My Current Location',
          country: 'Local Area',
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
        });
      },
      () => {
        setErrorMessage('Location permission denied — use the city search bar above.');
      },
      { timeout: 6000, maximumAge: 300_000 },
    );
  }, [selectCity]);

  const toggleFavorite = useCallback(() => {
    setFavoriteCities((prev) => {
      const exists = prev.includes(selectedCity.name);
      const next = exists
        ? prev.filter((name) => name !== selectedCity.name)
        : [...prev, selectedCity.name];
      try {
        window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  }, [selectedCity.name]);

  const refreshAqi = useCallback(async () => {
    setLoadingAqi(true);
    setErrorMessage(null);
    try {
      const aqReport = await fetchAirQualityApi(selectedCity);
      setReport(aqReport);
      setSecondsSinceSync(0);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to refresh air quality.');
    } finally {
      setLoadingAqi(false);
    }
  }, [selectedCity]);

  const regeneratePlan = useCallback(async () => {
    setLoadingPlan(true);
    setErrorMessage(null);
    try {
      const actionPlan = await generateActionPlanApi({
        location: selectedCity,
        profile,
        focusNote: focusNote.trim() || undefined,
      });
      setPlan(actionPlan);
      setAiMode(actionPlan.engine);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to generate action plan.');
    } finally {
      setLoadingPlan(false);
    }
  }, [focusNote, profile, selectedCity]);

  return {
    selectedCity,
    profile,
    focusNote,
    report,
    plan,
    loadingAqi,
    loadingPlan,
    errorMessage,
    aiMode,
    liveEnabled,
    secondsSinceSync,
    isFavorite: favoriteCities.includes(selectedCity.name),
    setProfile,
    setFocusNote,
    selectCity,
    locateMe,
    toggleFavorite,
    toggleLive: () => setLiveEnabled((prev) => !prev),
    refreshAqi,
    regeneratePlan,
  };
}
