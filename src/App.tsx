import { useState } from 'react';
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
import { ActionPlanView } from './components/ActionPlanView.js';
import { AdvisorChat } from './components/AdvisorChat.js';
import { AirQualityOverview } from './components/AirQualityOverview.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { HouseholdProfileForm } from './components/HouseholdProfileForm.js';
import { ImpactSimulator } from './components/ImpactSimulator.js';
import { LocationSelector } from './components/LocationSelector.js';
import { useAirQualityDashboard } from './hooks/useAirQualityDashboard.js';
import { useThemePreferences } from './hooks/useThemePreferences.js';

type ActiveTab = 'dashboard' | 'simulator' | 'chat';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const { theme, highContrast, toggleTheme, toggleHighContrast } = useThemePreferences();
  const dashboard = useAirQualityDashboard();

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
              {dashboard.aiMode === 'gemini-genai'
                ? 'Gemini GenAI Active'
                : 'Local Intelligence Mode'}
            </span>

            <button
              type="button"
              className="btn btn-sm"
              aria-pressed={highContrast}
              onClick={toggleHighContrast}
            >
              <Contrast size={15} aria-hidden="true" />
              {highContrast ? 'Standard Contrast' : 'High Contrast'}
            </button>

            <button
              type="button"
              className="btn btn-sm"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              onClick={toggleTheme}
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
          selectedCity={dashboard.selectedCity}
          onSelectCity={dashboard.selectCity}
          onLocateMe={dashboard.locateMe}
        />

        {dashboard.errorMessage && (
          <div className="error-box" role="alert">
            {dashboard.errorMessage}
          </div>
        )}

        <ErrorBoundary>
          {activeTab === 'dashboard' && (
            <div
              id="panel-dashboard"
              role="tabpanel"
              aria-labelledby="tab-dashboard"
              className="tab-stack"
            >
              <AirQualityOverview
                report={dashboard.report}
                loading={dashboard.loadingAqi}
                liveEnabled={dashboard.liveEnabled}
                secondsSinceSync={dashboard.secondsSinceSync}
                isFavorite={dashboard.isFavorite}
                onToggleLive={dashboard.toggleLive}
                onRefresh={() => {
                  void dashboard.refreshAqi();
                }}
                onLocateMe={dashboard.locateMe}
                onToggleFavorite={dashboard.toggleFavorite}
              />

              <div className="grid-dashboard">
                <ActionPlanView plan={dashboard.plan} loading={dashboard.loadingPlan} />
                <HouseholdProfileForm
                  profile={dashboard.profile}
                  focusNote={dashboard.focusNote}
                  generating={dashboard.loadingPlan}
                  onChangeProfile={dashboard.setProfile}
                  onChangeFocusNote={dashboard.setFocusNote}
                  onGeneratePlan={() => {
                    void dashboard.regeneratePlan();
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'simulator' && (
            <div id="panel-simulator" role="tabpanel" aria-labelledby="tab-simulator">
              <ImpactSimulator
                baselinePm25={dashboard.report?.current.pm25 ?? 120}
                householdSize={dashboard.profile.householdSize}
                cityName={dashboard.selectedCity.name}
              />
            </div>
          )}

          {activeTab === 'chat' && (
            <div id="panel-chat" role="tabpanel" aria-labelledby="tab-chat">
              <AdvisorChat
                location={dashboard.selectedCity}
                profile={dashboard.profile}
                currentAqi={dashboard.report?.current.usAqi}
              />
            </div>
          )}
        </ErrorBoundary>
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
