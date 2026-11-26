import { useRef, type KeyboardEvent } from 'react';
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
import type { ColorTheme } from '../hooks/useThemePreferences.js';

export type ActiveTab = 'dashboard' | 'simulator' | 'chat';

export const WORKSPACE_TABS: ReadonlyArray<{
  id: ActiveTab;
  label: string;
  panelId: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    id: 'dashboard',
    label: 'Live AQI & AI Action Plan',
    panelId: 'panel-dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'simulator',
    label: 'Choice & Community Impact Simulator',
    panelId: 'panel-simulator',
    icon: Calculator,
  },
  {
    id: 'chat',
    label: 'Ask AirShield AI',
    panelId: 'panel-chat',
    icon: MessageSquare,
  },
];

interface AppHeaderProps {
  activeTab: ActiveTab;
  aiMode: 'gemini-genai' | 'local-intelligence';
  theme: ColorTheme;
  highContrast: boolean;
  onSelectTab: (tab: ActiveTab) => void;
  onToggleTheme: () => void;
  onToggleHighContrast: () => void;
}

/**
 * Application sticky header containing brand identity, active AI engine indicator,
 * theme/contrast accessibility controls, and WAI-ARIA roving-tabindex navigation tabs.
 */
export function AppHeader({
  activeTab,
  aiMode,
  theme,
  highContrast,
  onSelectTab,
  onToggleTheme,
  onToggleHighContrast,
}: AppHeaderProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number): void {
    const count = WORKSPACE_TABS.length;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % count;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + count) % count;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = count - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const targetTab = WORKSPACE_TABS[nextIndex];
    if (targetTab) {
      onSelectTab(targetTab.id);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  return (
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
            onClick={onToggleHighContrast}
          >
            <Contrast size={15} aria-hidden="true" />
            {highContrast ? 'Standard Contrast' : 'High Contrast'}
          </button>

          <button
            type="button"
            className="btn btn-sm"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            onClick={onToggleTheme}
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
          {WORKSPACE_TABS.map((tab, index) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                aria-selected={isSelected}
                aria-controls={tab.panelId}
                className="nav-tab"
                onClick={() => onSelectTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
              >
                <Icon size={16} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
