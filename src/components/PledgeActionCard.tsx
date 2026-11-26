import type { PledgeActionItem } from '../../shared/types.js';

interface PledgeActionCardProps {
  action: PledgeActionItem;
  checked: boolean;
  onToggle: (id: string) => void;
}

/**
 * Renders a selectable habit or sustainable swap card inside the Impact Simulator.
 */
export function PledgeActionCard({ action, checked, onToggle }: PledgeActionCardProps) {
  const checkboxId = `pledge-${action.id}`;

  return (
    <div className="pledge-card" data-selected={checked}>
      <input
        id={checkboxId}
        type="checkbox"
        className="pledge-checkbox"
        checked={checked}
        onChange={() => onToggle(action.id)}
      />
      <div>
        <label htmlFor={checkboxId} className="pledge-title">
          {action.title}
        </label>
        <p className="pledge-desc">{action.description}</p>
        <div className="tag-row tag-row-tight">
          <span className="tag tag-brand">-{action.pm25ExposureReductionPct}% PM2.5 exposure</span>
          {action.monthlyCo2SavedKg > 0 && (
            <span className="tag">-{action.monthlyCo2SavedKg} kg CO₂/mo</span>
          )}
          <span className="tag">-{action.monthlyPm25AvoidedGrams} g PM2.5/mo</span>
        </div>
        <p className="pledge-why">
          <strong>Why it works:</strong> {action.whyItWorks}
        </p>
      </div>
    </div>
  );
}
