import {
  Check,
  Heart,
  LocateFixed,
  Pause,
  Play,
  RefreshCw,
  Share2,
} from 'lucide-react';
import type { AirQualityReport } from '../../shared/types.js';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard.js';

interface LiveStatusHeaderProps {
  report: AirQualityReport;
  loading: boolean;
  liveEnabled: boolean;
  secondsSinceSync: number;
  isFavorite: boolean;
  onToggleLive: () => void;
  onRefresh: () => void;
  onLocateMe: () => void;
  onToggleFavorite: () => void;
}

/**
 * Top live telemetry header strip displaying the pulsing LIVE badge, local sync timestamp,
 * city heading, and quick-action controls (live toggle, geolocation, favorite, share, refresh).
 */
export function LiveStatusHeader({
  report,
  loading,
  liveEnabled,
  secondsSinceSync,
  isFavorite,
  onToggleLive,
  onRefresh,
  onLocateMe,
  onToggleFavorite,
}: LiveStatusHeaderProps) {
  const { copied, copy } = useCopyToClipboard();
  const { current, location, weather, safestWindow } = report;

  const formattedLocalTime = new Date(report.fetchedAt).toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  function handleShareSnapshot(): void {
    const summary =
      `${location.name} Live Air Quality: US AQI ${current.usAqi} (${current.label}) | ` +
      `PM2.5: ${current.pm25} µg/m³ | PM10: ${current.pm10} µg/m³ | ` +
      `${weather.temperatureC}°C ${weather.conditionLabel}, Wind ${weather.windSpeedKmh} km/h. ` +
      `Safest 2h window: ${safestWindow.startLabel}–${safestWindow.endLabel} (via AirShield AI)`;
    void copy(summary);
  }

  return (
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
          {liveEnabled ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
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
          title={copied ? 'Copied!' : 'Copy live AQI snapshot'}
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
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
  );
}
