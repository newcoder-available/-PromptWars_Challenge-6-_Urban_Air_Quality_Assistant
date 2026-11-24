import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  CloudFog,
  Heart,
  LocateFixed,
  Pause,
  Play,
  RefreshCw,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import type { AirQualityReport } from '../../shared/types.js';
import { AtmosphericHeroBanner } from './AtmosphericHeroBanner.js';
import { ForecastChart } from './ForecastChart.js';
import { HyperlocalAqiMap } from './HyperlocalAqiMap.js';

interface AirQualityOverviewProps {
  report: AirQualityReport | null;
  loading: boolean;
  liveEnabled: boolean;
  secondsSinceSync: number;
  isFavorite: boolean;
  onToggleLive: () => void;
  onRefresh: () => void;
  onLocateMe: () => void;
  onToggleFavorite: () => void;
}

export function AirQualityOverview({
  report,
  loading,
  liveEnabled,
  secondsSinceSync,
  isFavorite,
  onToggleLive,
  onRefresh,
  onLocateMe,
  onToggleFavorite,
}: AirQualityOverviewProps) {
  const [sharedCopied, setSharedCopied] = useState(false);

  if (loading && !report) {
    return (
      <section className="card" aria-busy="true" aria-live="polite">
        <h2 className="card-title">Loading live urban air quality &amp; weather...</h2>
        <p className="card-subtitle">
          Fetching real-time PM2.5, PM10, wind dispersion, and 24-hour winter smog forecast.
        </p>
      </section>
    );
  }

  if (!report) {
    return null;
  }

  const { current, location, weather, nearbyStations, safestWindow, inversionRisk, hourlyForecast } =
    report;

  const formattedLocalTime = new Date(report.fetchedAt).toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  async function handleShareSnapshot(): Promise<void> {
    const summary =
      `${location.name} Live Air Quality: US AQI ${current.usAqi} (${current.label}) | ` +
      `PM2.5: ${current.pm25} µg/m³ | PM10: ${current.pm10} µg/m³ | ` +
      `${weather.temperatureC}°C ${weather.conditionLabel}, Wind ${weather.windSpeedKmh} km/h. ` +
      `Safest 2h window: ${safestWindow.startLabel}–${safestWindow.endLabel} (via AirShield AI)`;
    try {
      await navigator.clipboard.writeText(summary);
      setSharedCopied(true);
      setTimeout(() => setSharedCopied(false), 2500);
    } catch {
      setSharedCopied(false);
    }
  }

  return (
    <section className="atmospheric-section" aria-labelledby="aqi-overview-heading">
      <div className="live-top-strip">
        <div>
          <div className="live-badges-row">
            <span className={`live-pill ${liveEnabled ? 'is-live' : 'is-paused'}`}>
              <span className="live-dot" aria-hidden="true" />
              {liveEnabled ? 'LIVE' : 'PAUSED'}
            </span>
            <span className="live-sync-note" aria-live="polite">
              Last Updated: <strong>{formattedLocalTime}</strong> (Local Time ·{' '}
              {secondsSinceSync < 5 ? 'just now' : `${secondsSinceSync}s ago`})
            </span>
          </div>

          <h2 id="aqi-overview-heading" className="hero-city-heading">
            {location.name} Air Quality Index (AQI) | Air Pollution
          </h2>
          <p className="hero-city-sub">
            Real-time PM2.5, PM10 &amp; winter smog dispersion intelligence in {location.name},{' '}
            {location.country}
          </p>
        </div>

        <div className="live-actions-group no-print">
          <button
            type="button"
            className="btn btn-sm"
            onClick={onToggleLive}
            aria-pressed={liveEnabled}
            title={liveEnabled ? 'Pause automatic live updates' : 'Resume automatic live updates'}
          >
            {liveEnabled ? (
              <Pause size={14} aria-hidden="true" />
            ) : (
              <Play size={14} aria-hidden="true" />
            )}
            {liveEnabled ? 'Live Sync On' : 'Resume Live'}
          </button>

          <button
            type="button"
            className="btn btn-sm"
            onClick={onLocateMe}
            aria-label="Locate me using browser geolocation"
          >
            <LocateFixed size={14} aria-hidden="true" />
            Locate me
          </button>

          <button
            type="button"
            className={`icon-circle-btn ${isFavorite ? 'is-fav' : ''}`}
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={
              isFavorite
                ? `Remove ${location.name} from saved cities`
                : `Save ${location.name} to favorites`
            }
            title={isFavorite ? 'Saved city' : 'Save city'}
          >
            <Heart size={16} aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            className="icon-circle-btn"
            onClick={handleShareSnapshot}
            aria-label="Copy live air quality snapshot to clipboard"
            title={sharedCopied ? 'Copied!' : 'Copy live AQI snapshot'}
          >
            {sharedCopied ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Share2 size={16} aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            className="icon-circle-btn"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh live air quality now"
            title="Refresh now"
          >
            <RefreshCw size={16} aria-hidden="true" className={loading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      <div className="showcase-grid">
        <AtmosphericHeroBanner report={report} />
        <HyperlocalAqiMap cityName={location.name} stations={nearbyStations} />
      </div>

      <div className="card details-card">
        <div
          className="pollutant-grid pollutant-grid-flush"
          role="list"
          aria-label="Detailed pollutant concentrations"
        >
          <div className="metric-tile" role="listitem">
            <div className="metric-label">PM2.5 Fine</div>
            <div className="metric-value">{current.pm25} µg/m³</div>
          </div>
          <div className="metric-tile" role="listitem">
            <div className="metric-label">PM10 Coarse</div>
            <div className="metric-value">{current.pm10} µg/m³</div>
          </div>
          <div className="metric-tile" role="listitem">
            <div className="metric-label">NO₂ Traffic</div>
            <div className="metric-value">{current.no2} µg/m³</div>
          </div>
          <div className="metric-tile" role="listitem">
            <div className="metric-label">Ozone (O₃)</div>
            <div className="metric-value">{current.ozone} µg/m³</div>
          </div>
          <div className="metric-tile" role="listitem">
            <div className="metric-label">CO</div>
            <div className="metric-value">{current.co} µg/m³</div>
          </div>
          <div className="metric-tile" role="listitem">
            <div className="metric-label">Outdoor Parity</div>
            <div className="metric-value">~{current.cigaretteEquivalentPerDay} cig/day</div>
          </div>
        </div>

        <div className="callout-row">
          <div className="callout-box">
            <h3 className="callout-heading">
              <Clock size={16} aria-hidden="true" />
              Safest 2-Hour Window: {safestWindow.startLabel} – {safestWindow.endLabel}
            </h3>
            <p className="callout-text">
              Avg AQI <strong>{safestWindow.avgAqi}</strong> (PM2.5 {safestWindow.avgPm25} µg/m³).{' '}
              {safestWindow.advisory}
            </p>
          </div>

          <div
            className={`callout-box ${
              inversionRisk.level === 'severe' || inversionRisk.level === 'high' ? 'warning' : ''
            }`}
          >
            <h3 className="callout-heading">
              {inversionRisk.level === 'low' ? (
                <ShieldCheck size={16} aria-hidden="true" />
              ) : inversionRisk.level === 'severe' ? (
                <AlertTriangle size={16} aria-hidden="true" />
              ) : (
                <CloudFog size={16} aria-hidden="true" />
              )}
              Winter Inversion Risk: {inversionRisk.level.toUpperCase()}
            </h3>
            <p className="callout-text">
              {inversionRisk.summary} Peak trapping: <strong>{inversionRisk.peakHours}</strong>.
            </p>
          </div>
        </div>

        <ForecastChart
          cityName={location.name}
          hourlyForecast={hourlyForecast}
          safestWindow={safestWindow}
        />
      </div>
    </section>
  );
}
