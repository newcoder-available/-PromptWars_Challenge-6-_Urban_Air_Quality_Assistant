import { useState } from 'react';
import { Table as TableIcon } from 'lucide-react';
import { classifyAqi } from '../../shared/constants.js';
import type { HourlyAirPoint, SafeOutdoorWindow } from '../../shared/types.js';

interface ForecastChartProps {
  cityName: string;
  hourlyForecast: HourlyAirPoint[];
  safestWindow: SafeOutdoorWindow;
}

/**
 * Pure-SVG 24-hour PM2.5 dispersion bar chart paired with an expandable
 * screen-reader and keyboard accessible HTML data table.
 */
export function ForecastChart({
  cityName,
  hourlyForecast,
  safestWindow,
}: ForecastChartProps) {
  const [showTable, setShowTable] = useState(false);
  const maxPm25 = Math.max(60, ...hourlyForecast.map((h) => h.pm25));
  const whoY = 152 - Math.min(1, 15 / maxPm25) * 124;

  return (
    <div className="chart-wrap">
      <div className="card-header card-header-compact">
        <div>
          <h3 className="section-subheading">24-Hour PM2.5 &amp; Smog Dispersion Forecast</h3>
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
          24-hour PM2.5 air pollution forecast for {cityName}
        </title>
        <desc id="forecast-chart-desc">
          Bar chart showing hourly PM2.5 in micrograms per cubic meter over the next 24 hours.
          Lowest 2-hour window is {safestWindow.startLabel} to {safestWindow.endLabel} with average
          PM2.5 of {safestWindow.avgPm25} micrograms per cubic meter.
        </desc>

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

        {hourlyForecast.map((point, idx) => {
          const barWidth = 22;
          const gap = 6;
          const x = 36 + idx * (barWidth + gap);
          const barHeight = Math.max(6, (point.pm25 / maxPm25) * 124);
          const y = 152 - barHeight;
          const pointBand = classifyAqi(point.usAqi);

          return (
            <g key={point.time}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={`var(--aqi-${pointBand.severity}-bar)`}
              >
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
        <div className="table-scroll">
          <table className="data-table">
            <caption className="sr-only">
              24-hour hourly air quality forecast for {cityName}
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
  );
}
