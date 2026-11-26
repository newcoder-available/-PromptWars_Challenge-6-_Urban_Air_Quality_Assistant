import { useState } from 'react';
import { ActionPlanView } from './components/ActionPlanView.js';
import { AdvisorChat } from './components/AdvisorChat.js';
import { AirQualityOverview } from './components/AirQualityOverview.js';
import { AppHeader, type ActiveTab } from './components/AppHeader.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { HouseholdProfileForm } from './components/HouseholdProfileForm.js';
import { ImpactSimulator } from './components/ImpactSimulator.js';
import { LocationSelector } from './components/LocationSelector.js';
import { useAirQualityDashboard } from './hooks/useAirQualityDashboard.js';
import { useThemePreferences } from './hooks/useThemePreferences.js';

/**
 * Root AirShield AI application shell coordinating workspace tabs, live air quality overview,
 * household profiler, GenAI action plan, impact simulator, and conversational advisor.
 */
export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const { theme, highContrast, toggleTheme, toggleHighContrast } = useThemePreferences();
  const dashboard = useAirQualityDashboard();

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <AppHeader
        activeTab={activeTab}
        aiMode={dashboard.aiMode}
        theme={theme}
        highContrast={highContrast}
        onSelectTab={setActiveTab}
        onToggleTheme={toggleTheme}
        onToggleHighContrast={toggleHighContrast}
      />

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
            Live Data: Open-Meteo Air Quality &amp; Weather · Built with WCAG 2.2 AA accessibility
            &amp; defense-in-depth security
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
