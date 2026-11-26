import { useState } from 'react';
import { MapPin, Maximize2, Minimize2, Navigation } from 'lucide-react';
import type { NearbyStationReading } from '../../shared/types.js';

interface HyperlocalAqiMapProps {
  cityName: string;
  stations: NearbyStationReading[];
}

const ZONE_LABELS: Record<NearbyStationReading['zoneType'], string> = {
  residential: 'Residential Block',
  traffic: 'Traffic Corridor',
  park: 'Green / Park Zone',
  industrial: 'Industrial Ring',
  school_zone: 'School Corridor',
};

/**
 * Interactive pure-SVG hyperlocal station map showing neighborhood micro-environments
 * and highlighting the cleanest nearby zone.
 */
export function HyperlocalAqiMap({ cityName, stations }: HyperlocalAqiMapProps) {
  const [selectedId, setSelectedId] = useState<string>(stations[0]?.id ?? 'central');
  const [expanded, setExpanded] = useState(false);

  const selectedStation =
    stations.find((s) => s.id === selectedId) ?? stations[0];

  const cleanest = stations.reduce<NearbyStationReading | undefined>(
    (best, st) => (!best || st.usAqi < best.usAqi ? st : best),
    undefined,
  );

  return (
    <aside
      className={`aqi-map-card ${expanded ? 'aqi-map-expanded' : ''}`}
      aria-label={`Hyperlocal AQI station map for ${cityName}`}
    >
      {/* Stylized vector urban road/river grid backdrop */}
      <svg
        viewBox="0 0 240 280"
        preserveAspectRatio="xMidYMid slice"
        className="aqi-map-grid-svg"
        aria-hidden="true"
      >
        {/* Subtle river & parks */}
        <path
          d="M-10 215 Q65 180 128 210 T250 188 L250 232 Q150 250 95 230 T-10 250 Z"
          fill="rgba(56, 189, 248, 0.14)"
        />
        <ellipse cx="52" cy="184" rx="34" ry="22" fill="rgba(52, 211, 153, 0.14)" />
        {/* Urban arterial roads */}
        <g stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" fill="none">
          <path d="M0 70 L240 96" />
          <path d="M0 154 L240 132" />
          <path d="M62 0 L84 280" />
          <path d="M164 0 L142 280" />
          <circle cx="122" cy="138" r="68" strokeDasharray="4 4" />
        </g>
      </svg>

      {/* Top frosted AQI Map pill */}
      <div className="aqi-map-top">
        <div className="aqi-map-badge">
          <span className="aqi-map-logo">AQI</span>
          <span>Map</span>
          <button
            type="button"
            className="aqi-map-expand-btn"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? 'Collapse station map view' : 'Expand station map view'}
            aria-expanded={expanded}
          >
            {expanded ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Clickable color-coded AQI station bubbles */}
      <div className="aqi-map-pins" role="group" aria-label="Nearby monitoring zones">
        {stations.map((station) => {
          const isActive = station.id === selectedStation?.id;
          return (
            <button
              key={station.id}
              type="button"
              className={`station-bubble station-${station.severity} ${isActive ? 'active' : ''}`}
              style={{ left: `${station.mapX}%`, top: `${station.mapY}%` }}
              onClick={() => setSelectedId(station.id)}
              aria-pressed={isActive}
              aria-label={`${station.name}, ${ZONE_LABELS[station.zoneType]}, US AQI ${station.usAqi}, PM2.5 ${station.pm25}`}
              title={`${station.name} · AQI ${station.usAqi}`}
            >
              {station.usAqi}
            </button>
          );
        })}
      </div>

      {/* Bottom selected station readout + city pin */}
      <div className="aqi-map-footer">
        {selectedStation && (
          <div className="aqi-map-selected" aria-live="polite">
            <div className="aqi-map-selected-title">
              <strong>{selectedStation.name}</strong>
              <span>{selectedStation.distanceKm} km</span>
            </div>
            <div className="aqi-map-selected-meta">
              <span>{ZONE_LABELS[selectedStation.zoneType]}</span>
              <span>PM2.5: {selectedStation.pm25} µg/m³</span>
            </div>
            {cleanest && cleanest.id !== selectedStation.id && (
              <div className="aqi-map-tip">
                <Navigation size={11} aria-hidden="true" /> Cleanest nearby:{' '}
                <strong>{cleanest.name}</strong> (AQI {cleanest.usAqi})
              </div>
            )}
          </div>
        )}

        <div className="aqi-map-city-tag">
          <MapPin size={13} aria-hidden="true" />
          <span>{cityName}</span>
        </div>
      </div>
    </aside>
  );
}
