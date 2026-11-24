import { PLEDGE_ACTIONS } from '../../shared/constants.js';
import type { ImpactSimulationResult } from '../../shared/types.js';

/**
 * Berkeley Earth rule-of-thumb: ~22 µg/m³ of 24-hour ambient PM2.5
 * corresponds roughly to the mortality risk of 1 cigarette per day.
 */
export function pm25ToCigaretteEquivalentPerDay(pm25: number): number {
  const safePm25 = Math.max(0, pm25);
  return Number((safePm25 / 22).toFixed(1));
}

/**
 * Calculates combined personal health exposure reduction and community-scale
 * emissions impact for a selected set of household & community actions.
 *
 * Uses multiplicative independent abatement for PM2.5 exposure reduction
 * (`1 - Π(1 - r_i)`) capped at 88% so combined reductions stay physically realistic.
 */
export function simulatePledgeImpact(params: {
  selectedActionIds: string[];
  baselinePm25: number;
  householdSize: number;
  communityHouseholds: number;
}): ImpactSimulationResult {
  const uniqueIds = new Set(params.selectedActionIds);
  const selected = PLEDGE_ACTIONS.filter((item) => uniqueIds.has(item.id));

  let remainingExposureFactor = 1;
  let monthlyCo2SavedKg = 0;
  let monthlyPm25AvoidedGrams = 0;
  let monthlyCostDeltaUsd = 0;

  for (const action of selected) {
    const fraction = Math.min(0.75, Math.max(0, action.pm25ExposureReductionPct / 100));
    remainingExposureFactor *= 1 - fraction;
    monthlyCo2SavedKg += action.monthlyCo2SavedKg;
    monthlyPm25AvoidedGrams += action.monthlyPm25AvoidedGrams;
    monthlyCostDeltaUsd += action.monthlyCostDeltaUsd;
  }

  const combinedReductionPct = Math.min(
    88,
    Math.round((1 - remainingExposureFactor) * 100),
  );

  // Typical indoor infiltration baseline during winter smog without active mitigation (~65% of ambient)
  const unmitigatedIndoorPm25 = Math.max(5, params.baselinePm25 * 0.65);
  const estimatedIndoorPm25After = Number(
    Math.max(4, unmitigatedIndoorPm25 * (1 - combinedReductionPct / 100)).toFixed(1),
  );

  const pm25SavedPerPerson = Math.max(0, unmitigatedIndoorPm25 - estimatedIndoorPm25After);
  const avoidedCigarettesPerMonth = Number(
    ((pm25SavedPerPerson / 22) * 30 * params.householdSize).toFixed(0),
  );

  const communityHouseholds = Math.max(1, params.communityHouseholds);
  const communityMonthlyCo2SavedKg = Number(
    (monthlyCo2SavedKg * communityHouseholds).toFixed(1),
  );
  const communityMonthlyPm25AvoidedKg = Number(
    ((monthlyPm25AvoidedGrams * communityHouseholds) / 1000).toFixed(2),
  );

  // One mature urban tree absorbs ~1.8 kg CO2 per month (~21.6 kg/yr)
  const equivalentTreesPlanted = Math.round(communityMonthlyCo2SavedKg / 1.8);

  // Negative cost delta represents net savings
  const estimatedMonthlySavingsUsd = Math.round(-monthlyCostDeltaUsd);

  return {
    selectedCount: selected.length,
    combinedPm25ExposureReductionPct: combinedReductionPct,
    estimatedIndoorPm25After,
    avoidedCigarettesPerMonth,
    householdMonthlyCo2SavedKg: Number(monthlyCo2SavedKg.toFixed(1)),
    householdMonthlyPm25AvoidedGrams: Number(monthlyPm25AvoidedGrams.toFixed(1)),
    communityHouseholds,
    communityMonthlyCo2SavedKg,
    communityMonthlyPm25AvoidedKg,
    equivalentTreesPlanted,
    estimatedMonthlySavingsUsd,
  };
}
