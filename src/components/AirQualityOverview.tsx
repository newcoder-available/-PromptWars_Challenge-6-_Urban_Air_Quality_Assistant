import { AlertTriangle, Clock, CloudFog, ShieldCheck } from 'lucide-react';
import type { AirQualityReport } from '../../shared/types.js';
import { AtmosphericHeroBanner } from './AtmosphericHeroBanner.js';
import { ForecastChart } from './ForecastChart.js';
import { HyperlocalAqiMap } from './HyperlocalAqiMap.js';
import { LiveStatusHeader } from './LiveStatusHeader.js';

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

/**
 * Primary live air quality showcase composing the live status header, atmospheric hero banner,
 * hyperlocal station map, pollutant telemetry tiles, safest-window/inversion callouts, and 24h forecast chart.
 */
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

  const { current, location, nearbyStations, safestWindow, inversionRisk, hourlyForecast } = report;
  const pollutantTiles = [
    { label: 'PM2.5 Fine', value: `${current.pm25} µg/m³` },
    { label: 'PM10 Coarse', value: `${current.pm10} µg/m³` },
    { label: 'NO₂ Traffic', value: `${current.no2} µg/m³` },
    { label: 'Ozone (O₃)', value: `${current.ozone} µg/m³` },
    { label: 'CO', value: `${current.co} µg/m³` },
    { label: 'Outdoor Parity', value: `~${current.cigaretteEquivalentPerDay} cig/day` },
  ];

  return (
    <section className="atmospheric-section" aria-labelledby="aqi-overview-heading">
      <LiveStatusHeader
        report={report}
        loading={loading}
        liveEnabled={liveEnabled}
        secondsSinceSync={secondsSinceSync}
        isFavorite={isFavorite}
        onToggleLive={onToggleLive}
        onRefresh={onRefresh}
        onLocateMe={onLocateMe}
        onToggleFavorite={onToggleFavorite}
      />

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
          {pollutantTiles.map((tile) => (
            <div key={tile.label} className="metric-tile" role="listitem">
              <div className="metric-label">{tile.label}</div>
              <div className="metric-value">{tile.value}</div>
            </div>
          ))}
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
