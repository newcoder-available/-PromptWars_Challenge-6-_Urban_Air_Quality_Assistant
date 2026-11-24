import { Sparkles, Users } from 'lucide-react';
import type {
  BudgetTier,
  CommuteMode,
  CommunityRole,
  CookingFuel,
  HomeType,
  HouseholdProfile,
  VulnerableGroup,
} from '../../shared/types.js';

interface HouseholdProfileFormProps {
  profile: HouseholdProfile;
  focusNote: string;
  generating: boolean;
  onChangeProfile: (next: HouseholdProfile) => void;
  onChangeFocusNote: (note: string) => void;
  onGeneratePlan: () => void;
}

const VULNERABLE_OPTIONS: Array<{ value: VulnerableGroup; label: string }> = [
  { value: 'infants', label: 'Infants (0–2 yrs)' },
  { value: 'children', label: 'School Children' },
  { value: 'elderly', label: 'Seniors (65+)' },
  { value: 'asthma', label: 'Asthma / COPD' },
  { value: 'pregnant', label: 'Pregnant Member' },
  { value: 'outdoor_workers', label: 'Outdoor Worker' },
];

export function HouseholdProfileForm({
  profile,
  focusNote,
  generating,
  onChangeProfile,
  onChangeFocusNote,
  onGeneratePlan,
}: HouseholdProfileFormProps) {
  function toggleVulnerableGroup(group: VulnerableGroup): void {
    const exists = profile.vulnerableGroups.includes(group);
    const nextGroups = exists
      ? profile.vulnerableGroups.filter((g) => g !== group)
      : [...profile.vulnerableGroups, group];
    onChangeProfile({ ...profile, vulnerableGroups: nextGroups });
  }

  return (
    <section className="card" aria-labelledby="profile-heading">
      <div className="card-header">
        <div>
          <h2 id="profile-heading" className="card-title">
            <Users size={20} aria-hidden="true" />
            Household &amp; Lifestyle Profile
          </h2>
          <p className="card-subtitle">
            Tailor routines, indoor air hacks, and low-emission swaps to your real setup.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGeneratePlan();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="household-size" className="field-label">
              Household Size
            </label>
            <input
              id="household-size"
              type="number"
              className="input"
              min={1}
              max={20}
              value={profile.householdSize}
              onChange={(e) =>
                onChangeProfile({
                  ...profile,
                  householdSize: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                })
              }
            />
          </div>

          <div className="field-group">
            <label htmlFor="community-role" className="field-label">
              Your Role
            </label>
            <select
              id="community-role"
              className="select"
              value={profile.communityRole}
              onChange={(e) =>
                onChangeProfile({
                  ...profile,
                  communityRole: e.target.value as CommunityRole,
                })
              }
            >
              <option value="family">Family Household</option>
              <option value="school_pta">School / PTA Parent</option>
              <option value="neighborhood_rwa">Neighborhood / RWA Leader</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="home-type" className="field-label">
              Home Type
            </label>
            <select
              id="home-type"
              className="select"
              value={profile.homeType}
              onChange={(e) =>
                onChangeProfile({ ...profile, homeType: e.target.value as HomeType })
              }
            >
              <option value="apartment">Apartment / Flat</option>
              <option value="independent_house">Independent House</option>
              <option value="shared_housing">Shared / Multi-family Home</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="cooking-fuel" className="field-label">
              Primary Cooking Fuel
            </label>
            <select
              id="cooking-fuel"
              className="select"
              value={profile.cookingFuel}
              onChange={(e) =>
                onChangeProfile({
                  ...profile,
                  cookingFuel: e.target.value as CookingFuel,
                })
              }
            >
              <option value="gas">Gas Stove (LPG / PNG)</option>
              <option value="induction_electric">Induction / Electric</option>
              <option value="biomass_solid">Biomass / Solid Fuel</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="commute-mode" className="field-label">
              Main Commute Mode
            </label>
            <select
              id="commute-mode"
              className="select"
              value={profile.commuteMode}
              onChange={(e) =>
                onChangeProfile({
                  ...profile,
                  commuteMode: e.target.value as CommuteMode,
                })
              }
            >
              <option value="car_petrol_diesel">Petrol / Diesel Car</option>
              <option value="two_wheeler">Motorbike / Scooter</option>
              <option value="car_ev_hybrid">EV / Hybrid Car</option>
              <option value="public_transit">Metro / Bus Transit</option>
              <option value="walk_cycle">Walking / Cycling</option>
              <option value="remote">Work From Home</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="commute-km" className="field-label">
              Daily Round-Trip (km)
            </label>
            <input
              id="commute-km"
              type="number"
              className="input"
              min={0}
              max={250}
              value={profile.dailyCommuteKm}
              onChange={(e) =>
                onChangeProfile({
                  ...profile,
                  dailyCommuteKm: Math.max(0, Math.min(250, Number(e.target.value) || 0)),
                })
              }
            />
          </div>

          <div className="field-group">
            <label htmlFor="budget-tier" className="field-label">
              Budget Preference
            </label>
            <select
              id="budget-tier"
              className="select"
              value={profile.budgetTier}
              onChange={(e) =>
                onChangeProfile({
                  ...profile,
                  budgetTier: e.target.value as BudgetTier,
                })
              }
            >
              <option value="low_cost">Low-Cost / DIY Priority</option>
              <option value="moderate">Moderate Budget</option>
              <option value="flexible">Flexible (Upgrades OK)</option>
            </select>
          </div>

          <div className="field-group" style={{ justifyContent: 'flex-end' }}>
            <label className="checkbox-pill">
              <input
                type="checkbox"
                checked={profile.hasHepaPurifier}
                onChange={(e) =>
                  onChangeProfile({ ...profile, hasHepaPurifier: e.target.checked })
                }
              />
              We already own a HEPA purifier
            </label>
          </div>
        </div>

        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="field-label">Sensitive Household Members</legend>
          <div className="checkbox-grid">
            {VULNERABLE_OPTIONS.map((opt) => (
              <label key={opt.value} className="checkbox-pill">
                <input
                  type="checkbox"
                  checked={profile.vulnerableGroups.includes(opt.value)}
                  onChange={() => toggleVulnerableGroup(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field-group">
          <label htmlFor="focus-note" className="field-label">
            Optional Daily Focus (max 240 chars)
          </label>
          <input
            id="focus-note"
            type="text"
            className="input"
            maxLength={240}
            value={focusNote}
            onChange={(e) => onChangeFocusNote(e.target.value)}
            placeholder="e.g., School soccer at 4 PM, drafting RWA smog notice, baby nursery..."
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={generating}
          style={{ padding: '0.72rem 1rem' }}
        >
          <Sparkles size={17} aria-hidden="true" />
          {generating ? 'Generating Tailored Action Plan...' : 'Generate Personalized AI Plan'}
        </button>
      </form>
    </section>
  );
}
