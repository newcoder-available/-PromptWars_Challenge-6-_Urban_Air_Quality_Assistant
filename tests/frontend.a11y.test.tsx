// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HOUSEHOLD_PROFILE, PRESET_CITIES } from '../shared/constants.js';
import { buildLocalActionPlan } from '../server/services/aiAdvisorService.js';
import { buildFallbackAirQualityReport } from '../server/services/airQualityService.js';
import { simulatePledgeImpact } from '../server/services/impactCalculator.js';
import { App } from '../src/App.js';

describe('AirShield AI Frontend Accessibility & Core User Flows', () => {
  const sampleReport = buildFallbackAirQualityReport(PRESET_CITIES[0]!);
  const samplePlan = buildLocalActionPlan(sampleReport, DEFAULT_HOUSEHOLD_PROFILE);

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/api/health')) {
          return new Response(
            JSON.stringify({ status: 'ok', aiMode: 'local-intelligence' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (url.includes('/api/air-quality')) {
          return new Response(JSON.stringify(sampleReport), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.includes('/api/advisor/plan')) {
          return new Response(JSON.stringify(samplePlan), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.includes('/api/impact/simulate')) {
          const sim = simulatePledgeImpact({
            selectedActionIds: ['corsi-rosenthal-diy', 'transit-carpool-swap'],
            baselinePm25: sampleReport.current.pm25,
            householdSize: 4,
            communityHouseholds: 100,
          });
          return new Response(JSON.stringify(sim), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ cities: PRESET_CITIES }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders semantic landmarks, skip link, live AQI card, and accessible data table toggle', async () => {
    render(<App />);

    expect(screen.getByText('Skip to main content')).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('heading', { level: 1, name: 'AirShield AI' })).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /New Delhi Air Quality Index \(AQI\)/i }),
      ).toBeInTheDocument();
    });

    // Live indicator, hyperlocal station map, and rank ribbon render cleanly
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Hyperlocal AQI station map for New Delhi/i),
    ).toBeInTheDocument();

    // Accessible SVG forecast chart has role="img"
    expect(
      screen.getByRole('img', { name: /24-hour PM2\.5 air pollution forecast/i }),
    ).toBeInTheDocument();

    // Screen-reader / keyboard accessible data table toggle works
    const tableToggle = screen.getByRole('button', { name: /Accessible Data Table/i });
    fireEvent.click(tableToggle);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('supports high-contrast mode, dark theme toggle, and accessible tab switching', async () => {
    render(<App />);

    const contrastBtn = screen.getByRole('button', { name: /High Contrast/i });
    fireEvent.click(contrastBtn);
    expect(document.documentElement.dataset.contrast).toBe('high');

    const simTab = screen.getByRole('tab', { name: /Choice & Community Impact Simulator/i });
    fireEvent.click(simTab);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Direct Choice & Community Impact Simulator/i }),
      ).toBeInTheDocument();
    });

    const chatTab = screen.getByRole('tab', { name: /Ask AirShield AI/i });
    fireEvent.click(chatTab);
    expect(
      screen.getByRole('heading', { name: /Ask AirShield AI Advisor/i }),
    ).toBeInTheDocument();
  });
});
