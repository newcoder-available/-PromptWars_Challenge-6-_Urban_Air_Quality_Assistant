import { useCallback, useEffect, useState } from 'react';
import {
  Calculator,
  Contrast,
  LayoutDashboard,
  MessageSquare,
  Moon,
  Shield,
  Sparkles,
  Sun,
} from 'lucide-react';
import { DEFAULT_HOUSEHOLD_PROFILE, PRESET_CITIES } from '../shared/constants.js';
import type {
  ActionPlanResponse,
  AirQualityReport,
  CityLocation,
  HouseholdProfile,
} from '../shared/types.js';
import { ActionPlanView } from './components/ActionPlanView.js';
import { AdvisorChat } from './components/AdvisorChat.js';
import { AirQualityOverview } from './components/AirQualityOverview.js';
import { HouseholdProfileForm } from './components/HouseholdProfileForm.js';
import { ImpactSimulator } from './components/ImpactSimulator.js';
import { LocationSelector } from './components/LocationSelector.js';
import {
  fetchAirQualityApi,
  fetchHealth,
  generateActionPlanApi,
} from './lib/apiClient.js';

type ActiveTab = 'dashboard' | 'simulator' | 'chat';

const FAVORITES_STORAGE_KEY = 'airshield:favorite-cities:v1';

function loadSavedFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return ['New Delhi'];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : ['New Delhi'];
  } catch {
    return ['New Delhi'];
  }
}

export function App() {
  const [selectedCity, setSelectedCity] = useState<CityLocation>(PRESET_CITIES[0]!);
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_HOUSEHOLD_PROFILE);
  const [focusNote, setFocusNote] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [report, setReport] = useState<AirQualityReport | null>(null);
  const [plan, setPlan] = useState<ActionPlanResponse | null>(null);
  const [loadingAqi, setLoadingAqi] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<'gemini-genai' | 'local-intelligence'>(
    'local-intelligence',
  );

  // Live streaming auto-update & favorites
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);
  const [favoriteCities, setFavoriteCities] = useState<string[]>(loadSavedFavorites);

  // Atmospheric dark mode by default (inspired by modern live AQI dashboards), with Light & High-Contrast toggles
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.dataset.contrast = 'high';
    } else {
      delete document.documentElement.dataset.contrast;
    }
  }, [highContrast]);

  useEffect(() => {
    fetchHealth()
      .then((h) => setAiMode(h.aiMode))
      .catch(() => {
        // Keep default local-intelligence display if health check is unavailable
      });
  }, []);

  // Increment live "seconds since last sync" counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceSync((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
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

  const loadAirQualityAndPlan = useCallback(
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

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchAirQualityApi(selectedCity),
      generateActionPlanApi({
        location: selectedCity,
        profile,
        focusNote: focusNote.trim() || undefined,
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
    // Initial load only; subsequent city switches call handleSelectCity directly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectCity(city: CityLocation): void {
    setSelectedCity(city);
    void loadAirQualityAndPlan(city, profile, focusNote);
  }

  function handleLocateMe(): void {
    if (!('geolocation' in navigator)) {
      setErrorMessage('Browser geolocation is unavailable — please pick a city instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSelectCity({
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
  }

  function handleToggleFavorite(): void {
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
  }

  async function handleRefreshAqi(): Promise<void> {
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
  }

  async function handleGeneratePlan(): Promise<void> {
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
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="app-header">
        <div className="header-inner">
          <div className="brand-block">
            <div className="brand-icon" aria-hidden="true">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="brand-title">AirShield AI</h1>
              <p className="brand-subtitle">
                Urban Air Quality &amp; Winter Smog Assistant for Families &amp; Communities
              </p>
            </div>
          </div>

          <div className="header-actions">
            <span className="engine-pill" title="Active AI recommendation engine">
              <Sparkles size={13} aria-hidden="true" />
              {aiMode === 'gemini-genai' ? 'Gemini GenAI Active' : 'Local Intelligence Mode'}
            </span>

            <button
              type="button"
              className="btn btn-sm"
              aria-pressed={highContrast}
              onClick={() => setHighContrast((prev) => !prev)}
            >
              <Contrast size={15} aria-hidden="true" />
              {highContrast ? 'Standard Contrast' : 'High Contrast'}
            </button>

            <button
              type="button"
              className="btn btn-sm"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            >
              {theme === 'light' ? (
                <Moon size={15} aria-hidden="true" />
              ) : (
                <Sun size={15} aria-hidden="true" />
              )}
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
          </div>
        </div>

        <nav className="nav-bar" aria-label="Primary sections">
          <div className="nav-inner" role="tablist" aria-label="AirShield workspaces">
            <button
              type="button"
              role="tab"
              id="tab-dashboard"
              aria-selected={activeTab === 'dashboard'}
              aria-controls="panel-dashboard"
              className="nav-tab"
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={16} aria-hidden="true" />
              Live AQI &amp; AI Action Plan
            </button>

            <button
              type="button"
              role="tab"
              id="tab-simulator"
              aria-selected={activeTab === 'simulator'}
              aria-controls="panel-simulator"
              className="nav-tab"
              onClick={() => setActiveTab('simulator')}
            >
              <Calculator size={16} aria-hidden="true" />
              Choice &amp; Community Impact Simulator
            </button>

            <button
              type="button"
              role="tab"
              id="tab-chat"
              aria-selected={activeTab === 'chat'}
              aria-controls="panel-chat"
              className="nav-tab"
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={16} aria-hidden="true" />
              Ask AirShield AI
            </button>
          </div>
        </nav>
      </header>

      <main id="main-content" className="main-content" tabIndex={-1}>
        <LocationSelector
          selectedCity={selectedCity}
          onSelectCity={handleSelectCity}
        />

        {errorMessage && (
          <div className="error-box" role="alert">
            {errorMessage}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div
            id="panel-dashboard"
            role="tabpanel"
            aria-labelledby="tab-dashboard"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <AirQualityOverview
              report={report}
              loading={loadingAqi}
              liveEnabled={liveEnabled}
              secondsSinceSync={secondsSinceSync}
              isFavorite={favoriteCities.includes(selectedCity.name)}
              onToggleLive={() => setLiveEnabled((prev) => !prev)}
              onRefresh={handleRefreshAqi}
              onLocateMe={handleLocateMe}
              onToggleFavorite={handleToggleFavorite}
            />

            <div className="grid-dashboard">
              <ActionPlanView plan={plan} loading={loadingPlan} />
              <HouseholdProfileForm
                profile={profile}
                focusNote={focusNote}
                generating={loadingPlan}
                onChangeProfile={setProfile}
                onChangeFocusNote={setFocusNote}
                onGeneratePlan={handleGeneratePlan}
              />
            </div>
          </div>
        )}

        {activeTab === 'simulator' && (
          <div id="panel-simulator" role="tabpanel" aria-labelledby="tab-simulator">
            <ImpactSimulator
              baselinePm25={report?.current.pm25 ?? 120}
              householdSize={profile.householdSize}
              cityName={selectedCity.name}
            />
          </div>
        )}

        {activeTab === 'chat' && (
          <div id="panel-chat" role="tabpanel" aria-labelledby="tab-chat">
            <AdvisorChat
              location={selectedCity}
              profile={profile}
              currentAqi={report?.current.usAqi}
            />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <span>
            <strong>AirShield AI</strong> — PromptWars Challenge 6: Urban Air Quality Assistant
          </span>
          <span>
            Live Data: Open-Meteo Air Quality &amp; Weather · Built with WCAG 2.1 AA accessibility
            &amp; defense-in-depth security
          </span>
        </div>
      </footer>
    </div>
  );
}
export default App;
