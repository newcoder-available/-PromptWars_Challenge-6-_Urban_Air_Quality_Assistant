import { Cloud, CloudFog, CloudRain, Droplets, Sun, Trophy, Wind } from 'lucide-react';
import { classifyAqi } from '../../shared/constants.js';
import type { AirQualityReport, WeatherConditions } from '../../shared/types.js';
import { AqiMascotSvg, CitySkylineSvg } from './AqiMascotSvg.js';

interface AtmosphericHeroBannerProps {
  report: AirQualityReport;
}

const SCALE_SEGMENTS = [
  { label: 'Good', tick: '0', className: 'seg-good' },
  { label: 'Moderate', tick: '50', className: 'seg-moderate' },
  { label: 'Poor', tick: '100', className: 'seg-poor' },
  { label: 'Unhealthy', tick: '150', className: 'seg-unhealthy' },
  { label: 'Severe', tick: '200', className: 'seg-severe' },
  { label: 'Hazardous', tick: '301+', className: 'seg-hazardous' },
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

/**
 * Severity-adaptive atmospheric hero showcase with live AQI reading, 6-segment
 * spectrum scale, reactive mascot, frosted weather glass panel, and global rank ribbon.
 */
export function AtmosphericHeroBanner({ report }: AtmosphericHeroBannerProps) {
  const { current, location, weather, globalRankEstimate } = report;
  const band = classifyAqi(current.usAqi);
  const markerLeftPct = computeScalePercent(current.usAqi);

  return (
    <div className="showcase-left-col">
      <div
        className={`aqi-atmospheric-banner banner-${current.severity}`}
        role="region"
        aria-label={`Live AQI summary for ${location.name}`}
      >
        <CitySkylineSvg />

        <div className="banner-grid">
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
              <span className="banner-who-chip">{current.whoPm25Multiple}× WHO 24h limit</span>
            </div>

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
                  <span key={seg.label} className={`aqi-spectrum-seg ${seg.className}`} />
                ))}
                <span className="aqi-spectrum-dot" style={{ left: `${markerLeftPct}%` }} />
              </div>
              <div className="aqi-spectrum-ticks">
                {SCALE_SEGMENTS.map((seg) => (
                  <span key={seg.tick}>{seg.tick}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="banner-mascot-col">
            <AqiMascotSvg severity={current.severity} />
          </div>

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

      <div className="rank-ribbon" role="status">
        <div className="rank-pill">
          <Trophy size={14} aria-hidden="true" />
          <span>Rank</span>
          <strong>{formatOrdinal(globalRankEstimate.rank)}</strong>
        </div>
        <p className="rank-text">{globalRankEstimate.percentileNote}</p>
      </div>
    </div>
  );
}
