import { useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  HeartPulse,
  Home,
  Leaf,
  Printer,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import type { ActionPlanResponse, RecommendationCategory } from '../../shared/types.js';

interface ActionPlanViewProps {
  plan: ActionPlanResponse | null;
  loading: boolean;
}

const CATEGORY_META: Record<
  RecommendationCategory,
  { label: string; icon: typeof Leaf }
> = {
  low_emission_routine: { label: 'Low-Emission Routine', icon: Clock },
  indoor_air_hack: { label: 'Indoor Air Hack', icon: Home },
  sustainable_alternative: { label: 'Sustainable Swap', icon: Leaf },
  community_action: { label: 'Community Action', icon: Users },
};

const EFFORT_LABELS = {
  quick_win: 'Quick Win',
  daily_habit: 'Daily Habit',
  lifestyle_shift: 'High-Impact Shift',
} as const;

export function ActionPlanView({ plan, loading }: ActionPlanViewProps) {
  const [filter, setFilter] = useState<'all' | RecommendationCategory>('all');
  const [copied, setCopied] = useState(false);

  if (loading && !plan) {
    return (
      <section className="card" aria-busy="true" aria-live="polite">
        <h2 className="card-title">
          <Sparkles size={19} aria-hidden="true" />
          Crafting your personalized smog &amp; low-emission action plan...
        </h2>
        <p className="card-subtitle">
          Evaluating live PM2.5, inversion timing, household sensitivities, and community emissions.
        </p>
      </section>
    );
  }

  if (!plan) {
    return null;
  }

  const filteredRecs =
    filter === 'all'
      ? plan.recommendations
      : plan.recommendations.filter((item) => item.category === filter);

  async function handleCopyTemplate(): Promise<void> {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(plan.communityMessageTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="card" aria-labelledby="action-plan-heading" aria-live="polite">
      <div className="card-header">
        <div>
          <h2 id="action-plan-heading" className="card-title">
            <Sparkles size={20} aria-hidden="true" />
            {plan.headline}
          </h2>
          <p className="card-subtitle">
            Engine:{' '}
            <strong>
              {plan.engine === 'gemini-genai'
                ? `Gemini GenAI (${plan.modelUsed})`
                : 'AirShield Local Domain Engine'}
            </strong>
            {plan.cached ? ' · Served from smart cache' : ''}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-sm no-print"
          onClick={() => window.print()}
          aria-label="Print action plan"
        >
          <Printer size={14} aria-hidden="true" />
          Print Brief
        </button>
      </div>

      <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>{plan.winterSmogBriefing}</p>

      {plan.urgentAlerts.length > 0 && (
        <div className="alert-banner" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800 }}>
            <AlertCircle size={17} aria-hidden="true" />
            Priority Air Advisories
          </div>
          <ul>
            {plan.urgentAlerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      <div
        className="chip-row no-print"
        role="group"
        aria-label="Filter recommendations by category"
        style={{ marginBottom: '1rem' }}
      >
        <button
          type="button"
          className="chip"
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All ({plan.recommendations.length})
        </button>
        {(Object.keys(CATEGORY_META) as RecommendationCategory[]).map((cat) => {
          const count = plan.recommendations.filter((r) => r.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              className="chip"
              aria-pressed={filter === cat}
              onClick={() => setFilter(cat)}
            >
              {CATEGORY_META[cat].label} ({count})
            </button>
          );
        })}
      </div>

      <div className="rec-grid">
        {filteredRecs.map((rec) => {
          const meta = CATEGORY_META[rec.category];
          const Icon = meta.icon;
          return (
            <article key={rec.id} className="rec-card">
              <div className="tag-row">
                <span className="tag tag-brand">
                  <Icon size={12} aria-hidden="true" />
                  {meta.label}
                </span>
                <span className="tag">{EFFORT_LABELS[rec.effort]}</span>
                <span className="tag">{rec.estimatedCost}</span>
              </div>

              <div>
                <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.02rem' }}>{rec.title}</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  {rec.summary}
                </p>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <strong>Best timing:</strong> {rec.bestTimeWindow}
              </div>

              <ol className="steps-list">
                {rec.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <div className="impact-panel" aria-label={`Direct impact for ${rec.title}`}>
                <div className="impact-kpis">
                  <span className="impact-kpi">
                    <HeartPulse size={12} aria-hidden="true" style={{ verticalAlign: 'middle' }} />{' '}
                    -{rec.impact.pm25ExposureReductionPct}% PM2.5 Exposure
                  </span>
                  {rec.impact.weeklyCo2SavedKg > 0 && (
                    <span className="impact-kpi">
                      -{rec.impact.weeklyCo2SavedKg} kg CO₂/wk
                    </span>
                  )}
                  {rec.impact.weeklyPm25AvoidedGrams > 0 && (
                    <span className="impact-kpi">
                      -{rec.impact.weeklyPm25AvoidedGrams} g PM2.5/wk
                    </span>
                  )}
                </div>

                <p className="impact-copy">
                  <strong>Health impact:</strong> {rec.impact.personalHealthExplanation}
                </p>
                <p className="impact-copy">
                  <strong>Community impact:</strong> {rec.impact.communityScaleExplanation}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="community-brief-box">
        <div className="card-header" style={{ marginBottom: '0.35rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Share2 size={16} aria-hidden="true" />
            Shareable Neighborhood / School Smog Alert
          </h3>
          <button
            type="button"
            className="btn btn-sm no-print"
            onClick={handleCopyTemplate}
          >
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            {copied ? 'Copied!' : 'Copy Message'}
          </button>
        </div>
        <pre className="community-brief-pre">{plan.communityMessageTemplate}</pre>
      </div>

      <p className="disclaimer-note">{plan.safetyDisclaimer}</p>
    </section>
  );
}
