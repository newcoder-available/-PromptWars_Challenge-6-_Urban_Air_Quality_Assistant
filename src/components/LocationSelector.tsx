import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import { PRESET_CITIES } from '../../shared/constants.js';
import type { CityLocation } from '../../shared/types.js';
import { searchCitiesApi } from '../lib/apiClient.js';

interface LocationSelectorProps {
  selectedCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
  onLocateMe: () => void;
}

/**
 * Global city selector featuring a keyboard-accessible WAI-ARIA combobox
 * (`ArrowDown`/`ArrowUp`/`Enter`/`Escape`), browser geolocation trigger, and hotspot presets.
 */
export function LocationSelector({
  selectedCity,
  onSelectCity,
  onLocateMe,
}: LocationSelectorProps) {
  const inputId = useId();
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityLocation[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const data = await searchCitiesApi(trimmed, controller.signal);
        setResults(data.cities);
        setActiveIndex(data.cities.length > 0 ? 0 : -1);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setSearchError('City search temporarily unavailable — choose a quick city below.');
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function commitSelection(city: CityLocation): void {
    onSelectCity(city);
    setQuery('');
    setResults([]);
    setActiveIndex(-1);
    setSearchError(null);
  }

  function handleComboboxKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const chosen = results[activeIndex];
      if (chosen) commitSelection(chosen);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setResults([]);
      setActiveIndex(-1);
    }
  }

  const activeOptionId =
    activeIndex >= 0 && results[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined;

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
                setActiveIndex(-1);
                setSearchError(null);
              }
            }}
            onKeyDown={handleComboboxKeyDown}
            placeholder="Search any city (e.g., Delhi, Lahore, Beijing, Salt Lake City, London)..."
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={results.length > 0}
            aria-activedescendant={activeOptionId}
          />
          {results.length > 0 && (
            <ul id={listboxId} className="search-dropdown" role="listbox" aria-label="Matching cities">
              {results.map((city, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <li
                    key={`${city.name}-${city.latitude}-${city.longitude}`}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    aria-selected={isActive}
                    className={`search-option ${isActive ? 'search-option-active' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commitSelection(city);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <span>
                      <strong>{city.name}</strong>
                      {city.admin1 ? `, ${city.admin1}` : ''}
                    </span>
                    <span className="search-option-country">{city.country}</span>
                  </li>
                );
              })}
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
        <p className="card-subtitle" role="status" aria-live="polite">
          <Search size={13} aria-hidden="true" /> Searching cities...
        </p>
      )}
      {searchError && (
        <p className="card-subtitle" role="status" aria-live="polite">
          {searchError}
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
