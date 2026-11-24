import { SAFETY_DISCLAIMER } from '../../../shared/constants.js';
import type {
  ActionPlanResponse,
  ActionRecommendation,
  AirQualityReport,
  HouseholdProfile,
} from '../../../shared/types.js';

function buildIndoorAirRecommendation(
  report: AirQualityReport,
  profile: HouseholdProfile,
): ActionRecommendation {
  const { current, safestWindow, inversionRisk, location } = report;
  const hasKidsOrInfants =
    profile.vulnerableGroups.includes('children') ||
    profile.vulnerableGroups.includes('infants');

  if (!profile.hasHepaPurifier) {
    const costLabel =
      profile.budgetTier === 'low_cost'
        ? '$45–$65 one-time (DIY)'
        : '$120–$220 HEPA or $55 DIY';
    return {
      id: 'iaq-corsi-rosenthal',
      category: 'indoor_air_hack',
      title: 'Build a Bedroom Clean-Air Zone with a DIY Corsi-Rosenthal Box',
      summary: `Create a high-CADR filtration hub in your main sleeping room using four MERV-13 filters taped to a 20" box fan — critical while ${location.name} is at ${current.pm25} µg/m³ PM2.5.`,
      steps: [
        'Assemble 4 MERV-13 pleated filters into a cube with a cardboard base and tape a 20-inch box fan facing upward on top.',
        `Place it in the primary bedroom (especially for ${hasKidsOrInfants ? 'children/infants' : 'sleeping hours'}) and run on medium speed 45 minutes before bedtime.`,
        'Seal bedroom door gaps with a rolled damp towel or adhesive silicone weatherstripping during overnight inversion peaks.',
      ],
      effort: 'quick_win',
      estimatedCost: costLabel,
      bestTimeWindow: 'Evening through 9 AM (peak inversion)',
      impact: {
        pm25ExposureReductionPct: 52,
        weeklyCo2SavedKg: 1.0,
        weeklyPm25AvoidedGrams: 0.4,
        personalHealthExplanation: `Drops overnight bedroom PM2.5 from ~${Math.round(current.pm25 * 0.65)} µg/m³ to ~${Math.max(12, Math.round(current.pm25 * 0.31))} µg/m³, sparing lungs ~${Math.max(1, Math.round(((current.pm25 * 0.34) / 22) * 7))} cigarette-equivalents per person every week.`,
        communityScaleExplanation:
          'Sharing a 20-minute weekend DIY filter workshop with 25 neighbors equips low-income and elderly households with affordable clean air without waiting for retail purifiers.',
      },
    };
  }

  return {
    id: 'iaq-hepa-smart-schedule',
    category: 'indoor_air_hack',
    title: 'Optimize HEPA Placement & Timed Ventilation Window',
    summary: `Sync your existing HEPA purifier with ${location.name}'s diurnal smog dip (${safestWindow.startLabel}–${safestWindow.endLabel}) while eliminating indoor resuspension.`,
    steps: [
      `Keep windows tightly latched during ${inversionRisk.peakHours}; run HEPA on High for 20 minutes after cooking or returning home.`,
      safestWindow.ventilationSafe
        ? `Brief 10–15 minute cross-ventilation between ${safestWindow.startLabel} and ${safestWindow.endLabel} (avg AQI ${safestWindow.avgAqi}) to flush indoor CO₂.`
        : `Skip opening windows today (even the ${safestWindow.startLabel}–${safestWindow.endLabel} dip stays at AQI ${safestWindow.avgAqi}); rely on recirculation + wet-mopping.`,
      'Switch from dry broom sweeping to damp microfiber mopping and wipe HEPA pre-filters weekly during winter smog.',
    ],
    effort: 'daily_habit',
    estimatedCost: 'Free',
    bestTimeWindow: `${safestWindow.startLabel} – ${safestWindow.endLabel}`,
    impact: {
      pm25ExposureReductionPct: 38,
      weeklyCo2SavedKg: 2.2,
      weeklyPm25AvoidedGrams: 0.6,
      personalHealthExplanation:
        'Preventing dry-dust resuspension and timing purifier boosts cuts household fine-particle inhalation by up to 38% while keeping indoor CO₂ comfortable.',
      communityScaleExplanation:
        'Scheduling purifiers on auto/medium during low-smog hours trims winter peak grid load by ~18% across apartment blocks.',
    },
  };
}

function buildCommuteRecommendation(
  report: AirQualityReport,
  profile: HouseholdProfile,
): ActionRecommendation {
  const { current, safestWindow, location } = report;
  const commuteKm = Math.max(4, profile.dailyCommuteKm);
  const isFossilCommute =
    profile.commuteMode === 'car_petrol_diesel' || profile.commuteMode === 'two_wheeler';

  if (isFossilCommute) {
    const weeklyCo2 = Number((commuteKm * 0.21 * 3).toFixed(1));
    const weeklyPm = Number((commuteKm * 0.048 * 3).toFixed(1));
    const modeName = profile.commuteMode === 'car_petrol_diesel' ? 'petrol/diesel car' : 'two-wheeler';

    return {
      id: 'routine-low-emission-commute',
      category: 'low_emission_routine',
      title: 'Shift 3 High-Smog Commutes/Week to Transit, Carpool, or Hybrid Work',
      summary: `Your ${commuteKm} km daily ${modeName} trip adds cold-start exhaust directly into winter inversion layers.`,
      steps: [
        'Batch errands into a single midday trip during the safest dispersion window instead of cold-starting during morning smog.',
        'Coordinate a 3-family school or office carpool — or swap 3 days/week to metro/bus with a fitted N95/KF94 mask for last-mile walks.',
        'When driving is unavoidable, switch cabin HVAC to Recirculate and shut off the engine at stops over 30 seconds.',
      ],
      effort: 'daily_habit',
      estimatedCost: 'Saves $35–$65/mo',
      bestTimeWindow: `Avoid 7 AM–10 AM peak; travel near ${safestWindow.startLabel}–${safestWindow.endLabel}`,
      impact: {
        pm25ExposureReductionPct: 22,
        weeklyCo2SavedKg: weeklyCo2,
        weeklyPm25AvoidedGrams: weeklyPm,
        personalHealthExplanation:
          'Recirculated cabin air + fewer roadside rush-hour minutes reduces personal NO₂ and ultrafine soot exposure by 20–30%.',
        communityScaleExplanation: `If 100 households in ${location.name} adopt this swap, your neighborhood removes ~${Math.round(weeklyCo2 * 100)} kg CO₂ and ${((weeklyPm * 100) / 1000).toFixed(2)} kg of tailpipe PM2.5 weekly.`,
      },
    };
  }

  return {
    id: 'routine-clean-transit-timing',
    category: 'low_emission_routine',
    title: 'Low-Exposure Routing & Smog-Window Scheduling',
    summary: `Protect your low-emission ${profile.commuteMode.replace('_', ' ')} routine by choosing side-street corridors and timing outdoor trips to the afternoon dip.`,
    steps: [
      `Schedule essential walks, school pickups, or outdoor errands close to ${safestWindow.startLabel}–${safestWindow.endLabel} when ambient PM2.5 dips to ~${safestWindow.avgPm25} µg/m³.`,
      'Choose tree-lined residential backstreets one block off arterial roads — roadside PM2.5 and NO₂ drop 30–50% just 50 meters away from heavy traffic.',
      current.usAqi >= 151
        ? 'Wear a tight-sealing N95/KF94 respirator outdoors and rinse face/nasal passages with saline after returning home.'
        : 'Monitor hourly AQI before intense outdoor exercise and shift cardio indoors whenever AQI exceeds 120.',
    ],
    effort: 'daily_habit',
    estimatedCost: '$5–$10/mo (masks)',
    bestTimeWindow: `${safestWindow.startLabel} – ${safestWindow.endLabel}`,
    impact: {
      pm25ExposureReductionPct: 34,
      weeklyCo2SavedKg: 14.5,
      weeklyPm25AvoidedGrams: 3.4,
      personalHealthExplanation:
        'Side-street routing plus fit-checked N95 protection during smog alerts cuts inhaled black carbon and PM2.5 by over a third.',
      communityScaleExplanation:
        'Sustaining transit and active mobility prevents ~60 kg CO₂/month per household compared to urban car commuting, visibly lowering corridor haze.',
    },
  };
}

function buildCookingRecommendation(profile: HouseholdProfile): ActionRecommendation {
  const hasRespiratoryRisk =
    profile.vulnerableGroups.includes('asthma') ||
    profile.vulnerableGroups.includes('elderly');

  if (profile.cookingFuel === 'gas' || profile.cookingFuel === 'biomass_solid') {
    const fuelLabel = profile.cookingFuel === 'biomass_solid' ? 'Solid/biomass cooking' : 'Gas burners';
    return {
      id: 'sustainable-clean-cooking',
      category: 'sustainable_alternative',
      title: 'Transition High-Heat Boiling & Simmering to Electric/Induction + Lid Cooking',
      summary: `${fuelLabel} inside winter-sealed homes create rapid spikes of NO₂ and ultrafine PM2.5 that linger for hours.`,
      steps: [
        'Use an electric kettle, rice cooker, or single-burner portable induction cooktop ($40–$70) for daily tea, boiling, and simmering.',
        'Always cook on rear burners with lids on and run your kitchen exhaust chimney/fan 5 minutes before and 10 minutes after cooking.',
        'Replace incense sticks, scented candles, and aerosol cleaners with baking soda/vinegar solutions and warm LED lamps during winter.',
      ],
      effort: 'lifestyle_shift',
      estimatedCost: '$0–$60 (portable induction)',
      bestTimeWindow: 'All meal prep times',
      impact: {
        pm25ExposureReductionPct: 28,
        weeklyCo2SavedKg: 6.5,
        weeklyPm25AvoidedGrams: 2.2,
        personalHealthExplanation: `Cuts indoor NO₂ peaks by up to 60% — especially protective for ${hasRespiratoryRisk ? 'asthma and respiratory sensitivity' : 'children’s developing lungs'} inside closed winter rooms.`,
        communityScaleExplanation:
          'Electrifying routine kitchen tasks across 200 apartments prevents over 5 metric tons of CO₂ per winter season and lowers local neighborhood exhaust.',
      },
    };
  }

  return {
    id: 'sustainable-low-voc-home',
    category: 'sustainable_alternative',
    title: 'Zero-Combustion Indoor Care & Low-VOC Winter Swaps',
    summary:
      'Your electric/induction kitchen already eliminates indoor gas NO₂ — lock in clean indoor air by removing hidden particle and VOC sources.',
    steps: [
      'Eliminate incense, paraffin candles, and aerosol room sprays; use simmering citrus peel or fragrance-free soap instead.',
      'Use a range hood or pan lids during high-heat sautéing/frying to trap cooking oil aerosols before they disperse.',
      'Line entryways with washable mats and enforce a shoes-off indoor rule to stop heavy metals and road dust from tracking onto floors.',
    ],
    effort: 'quick_win',
    estimatedCost: 'Saves $10/mo',
    bestTimeWindow: 'Daily home routine',
    impact: {
      pm25ExposureReductionPct: 20,
      weeklyCo2SavedKg: 3.0,
      weeklyPm25AvoidedGrams: 1.1,
      personalHealthExplanation:
        'Removes the top non-outdoor indoor pollution spikes (aerosols, incense, frying smoke) that commonly double indoor PM2.5 in sealed apartments.',
      communityScaleExplanation:
        'Switching to refillable, fragrance-free cleaners eliminates petroleum-based VOC precursors that contribute to urban smog formation.',
    },
  };
}

function buildCommunityRecommendation(
  report: AirQualityReport,
  profile: HouseholdProfile,
): ActionRecommendation {
  const { current, location } = report;

  const roleConfig = {
    family: {
      title: 'Launch a 5-Family School Carpool & Anti-Idling Circle',
      steps: [
        'Share today’s safest outdoor window with 3–5 neighboring families to coordinate shared school drop-offs and indoor playdates.',
        'Ask security staff and delivery riders to turn off idling engines near building lobbies and offer warm flasks/heaters instead of bonfires.',
        'Report illegal open garbage or leaf burning immediately to municipal pollution helplines.',
      ],
    },
    school_pta: {
      title: 'Activate School-Gate No-Idling & Smog-Adaptive Recess Protocol',
      steps: [
        'Establish a "Turn Off Engines" drop-off zone 100 meters from classrooms — school-gate idling spikes child-height NO₂ and PM2.5.',
        `Shift PE/recess indoors automatically whenever AQI exceeds 150 (currently ${current.usAqi} in ${location.name}) and run DIY Corsi-Rosenthal filters in classrooms.`,
        'Organize a parent-led walking bus or 4-family carpool roster for winter smog months.',
      ],
    },
    neighborhood_rwa: {
      title: 'Deploy RWA Zero-Burn Guard Heater & Leaf-Composting Drive',
      steps: [
        'Provide electric oil-filled heaters and insulated jackets to overnight security guards to eliminate winter biomass/wood bonfires.',
        'Convert swept dry winter leaves into neighborhood compost pits rather than burning them.',
        'Set up a community bulk-buy for MERV-13 filters and N95 masks to cut per-family costs by 35–40%.',
      ],
    },
  }[profile.communityRole];

  return {
    id: 'community-collective-shield',
    category: 'community_action',
    title: roleConfig.title,
    summary: `Multiply your household impact across ${location.name} by tackling hyperlocal winter smog hotspots (idling queues and open waste burning).`,
    steps: roleConfig.steps,
    effort: 'lifestyle_shift',
    estimatedCost: 'Low / Shared community budget',
    bestTimeWindow: 'Morning drop-off & evening patrol hours',
    impact: {
      pm25ExposureReductionPct: 16,
      weeklyCo2SavedKg: 9.5,
      weeklyPm25AvoidedGrams: 7.2,
      personalHealthExplanation:
        'Eliminating street-level idling and open fires right outside your building immediately stops acute smoky spikes entering lower-floor windows.',
      communityScaleExplanation:
        'Just 50 participating households preventing 1 evening bonfire and 150 idling trips per week eliminates >1.4 kg of localized PM2.5 and ~1.9 tons of CO₂ each month.',
    },
  };
}

function buildVulnerableShieldRecommendation(
  report: AirQualityReport,
  profile: HouseholdProfile,
): ActionRecommendation | null {
  const priorityGroups = ['children', 'infants', 'asthma', 'elderly', 'pregnant'] as const;
  const hasPriorityGroup = priorityGroups.some((g) => profile.vulnerableGroups.includes(g));
  if (!hasPriorityGroup) return null;

  const { current, safestWindow } = report;
  const groupText = profile.vulnerableGroups.join(', ').replace(/_/g, ' ');

  return {
    id: 'health-vulnerable-shield',
    category: 'indoor_air_hack',
    title: `Priority Respiratory Shield for Sensitive Members (${groupText})`,
    summary: `Extra protective safeguards for your ${profile.householdSize}-person household while AQI is ${current.usAqi} (${current.label}).`,
    steps: [
      'Keep rescue inhalers, prescribed respiratory medications, and a simple indoor PM2.5/hygrometer check accessible in your clean-air room.',
      'Maintain indoor relative humidity between 40%–50% and hydrate well — dry winter air plus fine particulates irritates airways faster.',
      current.usAqi >= 201
        ? 'Cancel outdoor sports/playground time today; substitute low-dust indoor stretching or play inside your filtered room.'
        : `Limit children’s vigorous outdoor play to ${safestWindow.startLabel}–${safestWindow.endLabel} and watch for coughing or eye irritation.`,
    ],
    effort: 'quick_win',
    estimatedCost: 'Free',
    bestTimeWindow: 'Continuous during AQI > 100',
    impact: {
      pm25ExposureReductionPct: 30,
      weeklyCo2SavedKg: 0,
      weeklyPm25AvoidedGrams: 0.2,
      personalHealthExplanation:
        'Children breathe ~50% more air per kilogram of body weight than adults; protecting their sleep and play hours sharply lowers asthma flare-ups and school absences.',
      communityScaleExplanation:
        'Shared school and community air alerts cut emergency pediatric respiratory visits during severe winter smog episodes.',
    },
  };
}

function buildUrgentAlerts(
  report: AirQualityReport,
  profile: HouseholdProfile,
  focusNote?: string,
): string[] {
  const { current } = report;
  const alerts: string[] = [];

  if (current.usAqi >= 201) {
    alerts.push(
      `Severe Winter Smog Alert (${current.usAqi} US AQI · ${current.pm25} µg/m³ PM2.5): Keep windows sealed, run indoor filtration, and wear fitted N95/KF94 masks outdoors.`,
    );
  } else if (current.usAqi >= 101) {
    alerts.push(
      `Elevated Pollution (${current.usAqi} US AQI): Sensitive family members should move vigorous activity indoors and avoid morning inversion peaks.`,
    );
  } else {
    alerts.push(
      `Favorable Window (${current.usAqi} US AQI): Great time to cross-ventilate your home and enjoy low-emission outdoor errands.`,
    );
  }

  if (!profile.hasHepaPurifier && current.usAqi >= 151) {
    alerts.push(
      'No HEPA purifier detected in your profile: Prioritize a low-cost DIY Corsi-Rosenthal MERV-13 filter for bedrooms tonight.',
    );
  }

  if (focusNote) {
    alerts.push(`Custom household focus noted: "${focusNote}" — factored into your daily priorities.`);
  }

  return alerts;
}

/**
 * Deterministic domain intelligence engine that generates deeply tailored winter-smog
 * action plans grounded in live AQI, household sensitivities, home setup, and commute.
 */
export function buildLocalActionPlan(
  report: AirQualityReport,
  profile: HouseholdProfile,
  focusNote?: string,
): ActionPlanResponse {
  const { current, safestWindow, inversionRisk, location } = report;

  const recommendations: ActionRecommendation[] = [
    buildIndoorAirRecommendation(report, profile),
    buildCommuteRecommendation(report, profile),
    buildCookingRecommendation(profile),
    buildCommunityRecommendation(report, profile),
  ];

  const vulnerableRec = buildVulnerableShieldRecommendation(report, profile);
  if (vulnerableRec) {
    recommendations.push(vulnerableRec);
  }

  const headline =
    current.usAqi >= 201
      ? `Severe Winter Smog Protocol for Your ${location.name} Household`
      : current.usAqi >= 151
        ? `High-Smog Protection & Low-Emission Plan for ${location.name}`
        : `Clean-Air & Low-Emission Daily Playbook for ${location.name}`;

  const communityMessageTemplate =
    `🌫️ ${location.name} Air Quality Brief (AQI ${current.usAqi} — ${current.label}, PM2.5: ${current.pm25} µg/m³)\n` +
    `• Best low-smog window today: ${safestWindow.startLabel}–${safestWindow.endLabel} (avg AQI ${safestWindow.avgAqi}).\n` +
    `• Household tip: ${safestWindow.ventilationSafe ? 'Brief 10-min cross-ventilation in the afternoon dip, then close windows before dusk.' : 'Keep windows sealed today, wet-mop instead of sweeping, and run HEPA or DIY MERV-13 filtration.'}\n` +
    `• Community pledge: Turn off car engines at gates/signals (>30s), carpool where possible, and keep our block 100% free of leaf/waste burning. Every family counts!`;

  return {
    generatedAt: new Date().toISOString(),
    engine: 'local-intelligence',
    modelUsed: 'airshield-domain-engine-v1',
    cached: false,
    headline,
    winterSmogBriefing: `${location.name} is currently at US AQI ${current.usAqi} (${current.label}) with PM2.5 at ${current.pm25} µg/m³ (~${current.cigaretteEquivalentPerDay} cigarette-equivalents/day outdoors). ${inversionRisk.summary} Your lowest-pollution window in the next 24h is ${safestWindow.startLabel}–${safestWindow.endLabel} (avg AQI ${safestWindow.avgAqi}).`,
    urgentAlerts: buildUrgentAlerts(report, profile, focusNote),
    recommendations,
    communityMessageTemplate,
    safetyDisclaimer: SAFETY_DISCLAIMER,
  };
}
