import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Cloud,
  CloudFog,
  CloudRain,
  Droplets,
  Heart,
  LocateFixed,
  Pause,
  Play,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sun,
  Table as TableIcon,
  Trophy,
  Wind,
} from 'lucide-react';
import { classifyAqi } from '../../shared/constants.js';
import type { AirQualityReport, WeatherConditions } from '../../shared/types.js';
import { AqiMascotSvg, CitySkylineSvg } from './AqiMascotSvg.js';
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

const SCALE_SEGMENTS = [
  { label: 'Good', tick: '0', color: '#22c55e' },
  { label: 'Moderate', tick: '50', color: '#eab308' },
  { label: 'Poor', tick: '100', color: '#f97316' },
  { label: 'Unhealthy', tick: '150', color: '#ef4444' },
  { label: 'Severe', tick: '200', color: '#a855f7' },
  { label: 'Hazardous', tick: '301+', color: '#9f1239' },
] as const;

function computeScalePercent(usAqi: number): number {
  const clamped = Math.max(0, Math.min(360, usAqi));
  if (clamped <= 50) return (clamped / 50) * 16.66;
  if (clamped <= 100) return 16.66 + ((clamped - 50) / 50) * 16.66;
  if (clamped <= 150) return 33.33 + ((clamped - 100) / 50) * 16.66;
  if (clamped <= 200) return 50 + ((clamped - 150) / 50) * 16.66;
  if (clamped <= 300) return 66.66 + ((clamped - 200) / 100) * 16.66;
  return Math.min(98, 83.33 + ((clamped - 300) / 60) * 15);
}

function WeatherGlyph({ icon }: { icon: WeatherConditions['conditionIcon'] }) {
  switch (icon) {
    case 'clear':
      return <Sun size={30} aria-hidden="true" />;
    case 'rain':
      return <CloudRain size={30} aria-hidden="true" />;
    case 'cloudy':
      return <Cloud size={30} aria-hidden="true" />;
    case 'fog':
    case 'haze':
    default:
      return <CloudFog size={30} aria-hidden="true" />;
  }
}

function formatOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
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
  const [showTable, setShowTable] = useState(false);
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

  const {
    current,
    location,
    weather,
    nearbyStations,
    globalRankEstimate,
    safestWindow,
    inversionRisk,
    hourlyForecast,
  } = report;
  const band = classifyAqi(current.usAqi);
  const maxPm25 = Math.max(60, ...hourlyForecast.map((h) => h.pm25));
  const markerLeftPct = computeScalePercent(current.usAqi);

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
      {/* Reference-style Live Header Strip */}
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
            aria-label={isFavorite ? `Remove ${location.name} from saved cities` : `Save ${location.name} to favorites`}
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
            {sharedCopied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
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

      {/* Main Showcase Grid: Atmospheric Hero Banner + Hyperlocal AQI Map */}
      <div className="showcase-grid">
        <div className="showcase-left-col">
          <div
            className={`aqi-atmospheric-banner banner-${current.severity}`}
            role="region"
            aria-label={`Live AQI summary for ${location.name}`}
          >
            <CitySkylineSvg />

            <div className="banner-grid">
              {/* Column 1: Giant Live AQI + Status + PM2.5/PM10 + Spectrum Scale */}
              <div className="banner-aqi-col" aria-live="polite">
                <div className="banner-aqi-top">
                  <div>
                    <div className="banner-live-kicker">
                      <span className="banner-kicker-dot" aria-hidden="true" />
                      Live AQI
                    </div>
                    <div className="banner-aqi-row">
                      <span className="banner-aqi-giant">{current.usAqi}</span>
                      <span className="banner-aqi-unit">AQI (US)</span>
                    </div>
                  </div>

                  <div className="banner-status-wrap">
                    <span className="banner-status-caption">Air Quality is</span>
                    <span className="banner-status-glass">{band.shortLabel}</span>
                  </div>
                </div>

                <div className="banner-pm-row">
                  <span>
                    PM2.5 : <strong>{current.pm25} µg/m³</strong>
                  </span>
                  <span>
                    PM10 : <strong>{current.pm10} µg/m³</strong>
                  </span>
                  <span className="banner-who-chip">
                    {current.whoPm25Multiple}× WHO 24h limit
                  </span>
                </div>

                {/* 6-segment AQI Spectrum Scale Bar */}
                <div
                  className="aqi-spectrum"
                  role="img"
                  aria-label={`AQI scale indicator at ${current.usAqi} (${band.label})`}
                >
                  <div className="aqi-spectrum-labels">
                    {SCALE_SEGMENTS.map((seg) => (
                      <span key={seg.label}>{seg.label}</span>
                    ))}
                  </div>
                  <div className="aqi-spectrum-bar">
                    {SCALE_SEGMENTS.map((seg) => (
                      <span
                        key={seg.label}
                        className="aqi-spectrum-seg"
                        style={{ backgroundColor: seg.color }}
                      />
                    ))}
                    <span
                      className="aqi-spectrum-dot"
                      style={{ left: `${markerLeftPct}%` }}
                    />
                  </div>
                  <div className="aqi-spectrum-ticks">
                    {SCALE_SEGMENTS.map((seg) => (
                      <span key={seg.tick}>{seg.tick}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column 2: Dynamic Character Mascot */}
              <div className="banner-mascot-col">
                <AqiMascotSvg severity={current.severity} />
              </div>

              {/* Column 3: Frosted Glass Live Weather & Dispersion Panel */}
              <div className="banner-weather-glass">
                <div className="weather-top-row">
                  <div className="weather-icon-temp">
                    <WeatherGlyph icon={weather.conditionIcon} />
                    <span className="weather-temp">{weather.temperatureC} °C</span>
                  </div>
                  <span className="weather-condition">{weather.conditionLabel}</span>
                </div>

                <div className="weather-metrics-row">
                  <div className="weather-mini">
                    <span className="weather-mini-label">
                      <Droplets size={13} aria-hidden="true" /> Humidity
                    </span>
                    <strong>{weather.humidityPct} %</strong>
                  </div>
                  <div className="weather-mini">
                    <span className="weather-mini-label">
                      <Wind size={13} aria-hidden="true" /> Wind Speed
                    </span>
                    <strong>{weather.windSpeedKmh} km/h</strong>
                  </div>
                  <div className="weather-mini">
                    <span className="weather-mini-label">
                      <Sun size={13} aria-hidden="true" /> UV Index
                    </span>
                    <strong>{weather.uvIndex}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Global Rank & Dispersion Standing Bar (matches reference footer ribbon) */}
          <div className="rank-ribbon" role="status">
            <div className="rank-pill">
              <Trophy size={14} aria-hidden="true" />
              <span>Rank</span>
              <strong>{formatOrdinal(globalRankEstimate.rank)}</strong>
            </div>
            <p className="rank-text">{globalRankEstimate.percentileNote}</p>
          </div>
        </div>

        {/* Right Side: Interactive Hyperlocal AQI Station Map */}
        <HyperlocalAqiMap cityName={location.name} stations={nearbyStations} />
      </div>

      {/* Detailed Pollutants, Safest Window, Inversion Risk & 24h Dispersion Chart */}
      <div className="card" style={{ marginTop: '1.15rem' }}>
        <div className="pollutant-grid" role="list" aria-label="Detailed pollutant concentrations" style={{ marginTop: 0 }}>
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

        <div className="chart-wrap">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>
                24-Hour PM2.5 &amp; Smog Dispersion Forecast
              </h3>
              <p className="card-subtitle">
                Plan school commutes, errands, and indoor cross-ventilation around lower-bar windows.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm no-print"
              aria-expanded={showTable}
              onClick={() => setShowTable((prev) => !prev)}
            >
              <TableIcon size={14} aria-hidden="true" />
              {showTable ? 'Hide Data Table' : 'Accessible Data Table'}
            </button>
          </div>

          <svg
            className="chart-svg"
            viewBox="0 0 720 190"
            role="img"
            aria-labelledby="forecast-chart-title forecast-chart-desc"
          >
            <title id="forecast-chart-title">
              24-hour PM2.5 air pollution forecast for {location.name}
            </title>
            <desc id="forecast-chart-desc">
              Bar chart showing hourly PM2.5 in micrograms per cubic meter over the next 24 hours.
              Lowest 2-hour window is {safestWindow.startLabel} to {safestWindow.endLabel} with
              average PM2.5 of {safestWindow.avgPm25} micrograms per cubic meter.
            </desc>

            {(() => {
              const whoY = 152 - Math.min(1, 15 / maxPm25) * 124;
              return (
                <g>
                  <line
                    x1="34"
                    y1={whoY}
                    x2="708"
                    y2={whoY}
                    stroke="var(--brand)"
                    strokeDasharray="4 4"
                    strokeWidth="1.2"
                  />
                  <text
                    x="706"
                    y={Math.max(14, whoY - 4)}
                    textAnchor="end"
                    fill="var(--brand)"
                    fontSize="10"
                    fontWeight="700"
                  >
                    WHO 24h Guideline (15 µg/m³)
                  </text>
                </g>
              );
            })()}

            {hourlyForecast.map((point, idx) => {
              const barWidth = 22;
              const gap = 6;
              const x = 36 + idx * (barWidth + gap);
              const barHeight = Math.max(6, (point.pm25 / maxPm25) * 124);
              const y = 152 - barHeight;
              const pointBand = classifyAqi(point.usAqi);
              const fillVar = `var(--aqi-${pointBand.severity}-bar)`;

              return (
                <g key={point.time}>
                  <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" fill={fillVar}>
                    <title>
                      {`${point.hourLabel}: PM2.5 ${point.pm25} µg/m³, US AQI ${point.usAqi} (${pointBand.shortLabel})`}
                    </title>
                  </rect>
                  {idx % 3 === 0 && (
                    <text
                      x={x + barWidth / 2}
                      y="172"
                      textAnchor="middle"
                      fill="var(--text-muted)"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {point.hourLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {showTable && (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <caption className="sr-only">
                  24-hour hourly air quality forecast for {location.name}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">US AQI</th>
                    <th scope="col">PM2.5 (µg/m³)</th>
                    <th scope="col">PM10 (µg/m³)</th>
                    <th scope="col">NO₂ (µg/m³)</th>
                    <th scope="col">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {hourlyForecast.map((pt) => {
                    const ptBand = classifyAqi(pt.usAqi);
                    return (
                      <tr key={pt.time}>
                        <td>{pt.hourLabel}</td>
                        <td>{pt.usAqi}</td>
                        <td>{pt.pm25}</td>
                        <td>{pt.pm10}</td>
                        <td>{pt.no2}</td>
                        <td>{ptBand.shortLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
