import { useEffect, useState } from 'react';
import type { AirQualityReport, CityLocation } from '../../shared/types.js';

/**
 * Subscribes to `/api/air-quality/stream` via Server-Sent Events when `enabled` is true,
 * and maintains a 1-second elapsed timer since the last fresh report arrived.
 */
export function useLiveAirQualityStream(params: {
  city: CityLocation;
  enabled: boolean;
  onReport: (report: AirQualityReport) => void;
}) {
  const { city, enabled, onReport } = params;
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceSync((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') {
      return;
    }

    const query = new URLSearchParams({
      lat: String(city.latitude),
      lon: String(city.longitude),
      name: city.name,
      country: city.country,
    });
    const stream = new EventSource(`/api/air-quality/stream?${query.toString()}`);

    const handleAirQuality = (event: MessageEvent<string>) => {
      try {
        const liveReport = JSON.parse(event.data) as AirQualityReport;
        onReport(liveReport);
        setSecondsSinceSync(0);
      } catch {
        // Ignore malformed SSE event frames
      }
    };

    stream.addEventListener('air-quality', handleAirQuality as EventListener);
    return () => {
      stream.removeEventListener('air-quality', handleAirQuality as EventListener);
      stream.close();
    };
  }, [city, enabled, onReport]);

  return {
    secondsSinceSync,
    resetSyncClock: () => setSecondsSinceSync(0),
  };
}
