// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HOUSEHOLD_PROFILE, PRESET_CITIES } from '../shared/constants.js';
import {
  buildLocalActionPlan,
  buildLocalChatResponse,
} from '../server/services/aiAdvisorService.js';
import { buildFallbackAirQualityReport } from '../server/services/airQualityService.js';
import { simulatePledgeImpact } from '../server/services/impactCalculator.js';
import { App } from '../src/App.js';
import { ErrorBoundary } from '../src/components/ErrorBoundary.js';

function ThrowingWidget({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Simulated widget failure');
  }
  return <p>Healthy widget content</p>;
}

describe('AirShield AI Frontend Accessibility & Core User Flows', () => {
  const sampleReport = buildFallbackAirQualityReport(PRESET_CITIES[0]!);
  const samplePlan = buildLocalActionPlan(sampleReport, DEFAULT_HOUSEHOLD_PROFILE);
  const sampleChat = buildLocalChatResponse(
    sampleReport,
    DEFAULT_HOUSEHOLD_PROFILE,
    'How do I build an affordable DIY air purifier?',
  );

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
        if (url.includes('/api/advisor/chat')) {
          return new Response(JSON.stringify(sampleChat), {
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

  it('renders semantic landmarks, skip link, live AQI showcase, station map, and data table toggle', async () => {
    render(<App />);

    expect(screen.getByText('Skip to main content')).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('heading', { level: 1, name: 'AirShield AI' })).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /New Delhi Air Quality Index \(AQI\)/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Hyperlocal AQI station map for New Delhi/i),
    ).toBeInTheDocument();

    // Selecting a station bubble updates pressed state
    const parkStation = screen.getByRole('button', { name: /Green Botanical Park/i });
    fireEvent.click(parkStation);
    expect(parkStation).toHaveAttribute('aria-pressed', 'true');

    // Accessible SVG forecast chart & expandable HTML data table
    expect(
      screen.getByRole('img', { name: /24-hour PM2\.5 air pollution forecast/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Accessible Data Table/i }));
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('supports high-contrast mode, tab switching, and interactive advisor chat', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /High Contrast/i }));
    expect(document.documentElement.dataset.contrast).toBe('high');

    fireEvent.click(screen.getByRole('tab', { name: /Choice & Community Impact Simulator/i }));
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Direct Choice & Community Impact Simulator/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: /Ask AirShield AI/i }));
    expect(
      screen.getByRole('heading', { name: /Ask AirShield AI Advisor/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /How do I build an affordable DIY air purifier/i }),
    );
    await waitFor(() => {
      expect(screen.getByText(/Corsi-Rosenthal/i)).toBeInTheDocument();
    });
  });

  it('isolates rendering failures cleanly inside ErrorBoundary', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        <ErrorBoundary>
          <ThrowingWidget shouldThrow />
        </ErrorBoundary>,
      );
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Something went wrong displaying this section/i,
      );
      expect(screen.getByRole('button', { name: /Reload View/i })).toBeInTheDocument();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
