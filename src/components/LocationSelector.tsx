import { useEffect, useId, useState } from 'react';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import { PRESET_CITIES } from '../../shared/constants.js';
import type { CityLocation } from '../../shared/types.js';
import { searchCitiesApi } from '../lib/apiClient.js';

interface LocationSelectorProps {
  selectedCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
  onLocateMe: () => void;
}

export function LocationSelector({
  selectedCity,
  onSelectCity,
  onLocateMe,
}: LocationSelectorProps) {
  const inputId = useId();
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityLocation[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchCitiesApi(trimmed, controller.signal);
        setResults(data.cities);
      } catch {
        // Ignore aborted or transient search errors
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <section className="card location-bar" aria-label="Select city or location">
      <div className="search-row">
        <div className="search-input-wrap">
          <label htmlFor={inputId} className="sr-only">
            Search any city worldwide for live air quality
          </label>
          <input
            id={inputId}
            type="search"
            role="combobox"
            className="input"
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              if (next.trim().length < 2) {
                setResults([]);
              }
            }}
            placeholder="Search any city (e.g., Delhi, Lahore, Beijing, Salt Lake City, London)..."
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={results.length > 0}
          />
          {results.length > 0 && (
            <ul id={listboxId} className="search-dropdown" role="listbox" aria-label="Matching cities">
              {results.map((city) => (
                <li key={`${city.name}-${city.latitude}-${city.longitude}`}>
                  <button
                    type="button"
                    className="search-option"
                    onClick={() => {
                      onSelectCity(city);
                      setQuery('');
                      setResults([]);
                    }}
                  >
                    <span>
                      <strong>{city.name}</strong>
                      {city.admin1 ? `, ${city.admin1}` : ''}
                    </span>
                    <span className="search-option-country">{city.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          className="btn"
          onClick={onLocateMe}
          aria-label="Use my current browser location"
        >
          <LocateFixed size={16} aria-hidden="true" />
          Use My Location
        </button>
      </div>

      {searching && (
        <p className="card-subtitle" aria-live="polite">
          <Search size={13} aria-hidden="true" /> Searching cities...
        </p>
      )}

      <div className="chip-row" role="group" aria-label="Winter smog hotspot preset cities">
        <span className="quick-cities-label">
          <MapPin size={13} aria-hidden="true" className="inline-icon" /> Quick cities:
        </span>
        {PRESET_CITIES.map((city) => {
          const isSelected =
            selectedCity.name === city.name && selectedCity.country === city.country;
          return (
            <button
              key={city.name}
              type="button"
              className="chip"
              aria-pressed={isSelected}
              onClick={() => onSelectCity(city)}
            >
              {city.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
