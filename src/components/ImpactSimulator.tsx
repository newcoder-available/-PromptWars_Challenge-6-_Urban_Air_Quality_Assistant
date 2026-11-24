import { useEffect, useState } from 'react';
import { Calculator, Leaf, Shield, Trees, Users } from 'lucide-react';
import { PLEDGE_ACTIONS } from '../../shared/constants.js';
import type { ImpactSimulationResult } from '../../shared/types.js';
import { simulateImpactApi } from '../lib/apiClient.js';

interface ImpactSimulatorProps {
  baselinePm25: number;
  householdSize: number;
  cityName: string;
}

const DEFAULT_SELECTED = [
  'corsi-rosenthal-diy',
  'smart-ventilation-window',
  'transit-carpool-swap',
  'zero-burn-anti-idling',
];

export function ImpactSimulator({
  baselinePm25,
  householdSize,
  cityName,
}: ImpactSimulatorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SELECTED);
  const [communityHouseholds, setCommunityHouseholds] = useState(100);
  const [result, setResult] = useState<ImpactSimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        setError(null);
        const sim = await simulateImpactApi({
          selectedActionIds: selectedIds,
          baselinePm25: Math.max(1, baselinePm25),
          householdSize,
          communityHouseholds,
        });
        if (active) setResult(sim);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to run simulation');
        }
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedIds, baselinePm25, householdSize, communityHouseholds]);

  function toggleAction(id: string): void {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <section className="card" aria-labelledby="simulator-heading">
      <div className="card-header">
        <div>
          <h2 id="simulator-heading" className="card-title">
            <Calculator size={20} aria-hidden="true" />
            Direct Choice &amp; Community Impact Simulator
          </h2>
          <p className="card-subtitle">
            Toggle daily routines, IAQ hacks, and sustainable swaps to quantify exact lung
            protection and neighborhood-wide pollution reduction in {cityName} (baseline PM2.5:{' '}
            {baselinePm25} µg/m³).
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div
        className="card"
        style={{ background: 'var(--bg-elevated)', marginBottom: '1.25rem' }}
      >
        <label htmlFor="community-scale-slider" className="field-label">
          <Users size={15} aria-hidden="true" style={{ verticalAlign: 'text-bottom' }} /> Community
          Multiplier: <strong>{communityHouseholds.toLocaleString()} participating households</strong>{' '}
          in your neighborhood or school network
        </label>
        <input
          id="community-scale-slider"
          type="range"
          min={1}
          max={1000}
          step={10}
          value={communityHouseholds}
          onChange={(e) => setCommunityHouseholds(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--brand)' }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>1 Family</span>
          <span>100 Apartment Block</span>
          <span>500 School Network</span>
          <span>1,000 Ward Coalition</span>
        </div>
      </div>

      {result && (
        <div className="grid-3" style={{ marginBottom: '1.25rem' }} aria-live="polite">
          <div className="stat-card">
            <div className="metric-label">
              <Shield size={13} aria-hidden="true" style={{ verticalAlign: 'text-bottom' }} />{' '}
              Household PM2.5 Cut
            </div>
            <div className="stat-big">-{result.combinedPm25ExposureReductionPct}%</div>
            <p className="card-subtitle" style={{ margin: 0 }}>
              Est. indoor PM2.5 drops to <strong>{result.estimatedIndoorPm25After} µg/m³</strong>{' '}
              (~{result.avoidedCigarettesPerMonth} fewer cigarette-eq/mo across {householdSize}{' '}
              members).
            </p>
          </div>

          <div className="stat-card">
            <div className="metric-label">
              <Leaf size={13} aria-hidden="true" style={{ verticalAlign: 'text-bottom' }} />{' '}
              Community Emissions Avoided
            </div>
            <div className="stat-big">
              {result.communityMonthlyCo2SavedKg.toLocaleString()} kg CO₂
            </div>
            <p className="card-subtitle" style={{ margin: 0 }}>
              Plus <strong>{result.communityMonthlyPm25AvoidedKg} kg</strong> of local PM2.5
              prevented/month ({result.householdMonthlyCo2SavedKg} kg CO₂ per family).
            </p>
          </div>

          <div className="stat-card">
            <div className="metric-label">
              <Trees size={13} aria-hidden="true" style={{ verticalAlign: 'text-bottom' }} /> Urban
              Equivalent &amp; Savings
            </div>
            <div className="stat-big">
              {result.equivalentTreesPlanted.toLocaleString()} trees
            </div>
            <p className="card-subtitle" style={{ margin: 0 }}>
              Monthly CO₂ absorption parity · Est. family budget impact:{' '}
              <strong>
                {result.estimatedMonthlySavingsUsd >= 0
                  ? `Saves $${result.estimatedMonthlySavingsUsd}/mo`
                  : `Costs $${Math.abs(result.estimatedMonthlySavingsUsd)}/mo`}
              </strong>
            </p>
          </div>
        </div>
      )}

      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
        Select Habits &amp; Low-Emission Alternatives ({selectedIds.length} active)
      </h3>

      <div className="grid-2">
        {PLEDGE_ACTIONS.map((action) => {
          const checked = selectedIds.includes(action.id);
          const checkboxId = `pledge-${action.id}`;
          return (
            <div
              key={action.id}
              className="pledge-card"
              data-selected={checked}
            >
              <input
                id={checkboxId}
                type="checkbox"
                checked={checked}
                onChange={() => toggleAction(action.id)}
                style={{ marginTop: '0.25rem' }}
              />
              <div>
                <label
                  htmlFor={checkboxId}
                  style={{ fontWeight: 700, fontSize: '0.94rem', cursor: 'pointer', display: 'block' }}
                >
                  {action.title}
                </label>
                <p
                  style={{
                    margin: '0.25rem 0 0.4rem',
                    fontSize: '0.84rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {action.description}
                </p>
                <div className="tag-row" style={{ marginBottom: '0.35rem' }}>
                  <span className="tag tag-brand">
                    -{action.pm25ExposureReductionPct}% PM2.5 exposure
                  </span>
                  {action.monthlyCo2SavedKg > 0 && (
                    <span className="tag">-{action.monthlyCo2SavedKg} kg CO₂/mo</span>
                  )}
                  <span className="tag">
                    -{action.monthlyPm25AvoidedGrams} g PM2.5/mo
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <strong>Why it works:</strong> {action.whyItWorks}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
