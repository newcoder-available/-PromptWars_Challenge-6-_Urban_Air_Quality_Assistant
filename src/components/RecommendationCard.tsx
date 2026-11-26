import { Clock, HeartPulse, Home, Leaf, Users } from 'lucide-react';
import type { ActionRecommendation, RecommendationCategory } from '../../shared/types.js';

export const CATEGORY_META: Record<
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

interface RecommendationCardProps {
  recommendation: ActionRecommendation;
}

/**
 * Renders a single tailored recommendation card with step-by-step instructions
 * and explicit personal health + community-scale emissions impact explanations.
 */
export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const meta = CATEGORY_META[recommendation.category];
  const Icon = meta.icon;

  return (
    <article className="rec-card">
      <div className="tag-row">
        <span className="tag tag-brand">
          <Icon size={12} aria-hidden="true" />
          {meta.label}
        </span>
        <span className="tag">{EFFORT_LABELS[recommendation.effort]}</span>
        <span className="tag">{recommendation.estimatedCost}</span>
      </div>

      <div>
        <h3 className="rec-title">{recommendation.title}</h3>
        <p className="rec-summary">{recommendation.summary}</p>
      </div>

      <div className="rec-timing">
        <strong>Best timing:</strong> {recommendation.bestTimeWindow}
      </div>

      <ol className="steps-list">
        {recommendation.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <div className="impact-panel" aria-label={`Direct impact for ${recommendation.title}`}>
        <div className="impact-kpis">
          <span className="impact-kpi">
            <HeartPulse size={12} aria-hidden="true" className="inline-icon-mid" /> -
            {recommendation.impact.pm25ExposureReductionPct}% PM2.5 Exposure
          </span>
          {recommendation.impact.weeklyCo2SavedKg > 0 && (
            <span className="impact-kpi">-{recommendation.impact.weeklyCo2SavedKg} kg CO₂/wk</span>
          )}
          {recommendation.impact.weeklyPm25AvoidedGrams > 0 && (
            <span className="impact-kpi">
              -{recommendation.impact.weeklyPm25AvoidedGrams} g PM2.5/wk
            </span>
          )}
        </div>

        <p className="impact-copy">
          <strong>Health impact:</strong> {recommendation.impact.personalHealthExplanation}
        </p>
        <p className="impact-copy">
          <strong>Community impact:</strong> {recommendation.impact.communityScaleExplanation}
        </p>
      </div>
    </article>
  );
}
