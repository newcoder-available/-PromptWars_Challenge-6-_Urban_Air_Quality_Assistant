import { useState } from 'react';
import { AlertCircle, Check, Copy, Printer, Share2, Sparkles } from 'lucide-react';
import type { ActionPlanResponse, RecommendationCategory } from '../../shared/types.js';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard.js';
import { CATEGORY_META, RecommendationCard } from './RecommendationCard.js';

interface ActionPlanViewProps {
  plan: ActionPlanResponse | null;
  loading: boolean;
}

/**
 * Displays the personalized GenAI winter-smog action plan with category filtering,
 * priority air advisories, direct-impact cards, and a copyable/printable community brief.
 */
export function ActionPlanView({ plan, loading }: ActionPlanViewProps) {
  const [filter, setFilter] = useState<'all' | RecommendationCategory>('all');
  const { copied, copy } = useCopyToClipboard();

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

  return (
    <section className="card" aria-labelledby="action-plan-heading" aria-busy={loading}>
      <p className="sr-only" role="status" aria-live="polite">
        {loading
          ? 'Updating personalized action plan...'
          : `${plan.headline}. Showing ${filteredRecs.length} recommendations.`}
      </p>

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

      <p className="briefing-lead">{plan.winterSmogBriefing}</p>

      {plan.urgentAlerts.length > 0 && (
        <div className="alert-banner" role="alert">
          <div className="alert-banner-title">
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
        className="chip-row chip-row-spaced no-print"
        role="group"
        aria-label="Filter recommendations by category"
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
        {filteredRecs.map((rec) => (
          <RecommendationCard key={rec.id} recommendation={rec} />
        ))}
      </div>

      <div className="community-brief-box">
        <div className="card-header card-header-tight">
          <h3 className="community-brief-heading">
            <Share2 size={16} aria-hidden="true" />
            Shareable Neighborhood / School Smog Alert
          </h3>
          <button
            type="button"
            className="btn btn-sm no-print"
            onClick={() => {
              void copy(plan.communityMessageTemplate);
            }}
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
