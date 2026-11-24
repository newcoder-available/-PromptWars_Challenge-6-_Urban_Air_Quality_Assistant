import type { AqiSeverity } from '../../shared/types.js';

interface AqiMascotSvgProps {
  severity: AqiSeverity;
}

/**
 * Expressive vector character that reacts dynamically to air quality severity:
 * - Good: smiling & breathing fresh air with green leaf accents
 * - Moderate: calm expression with light scarf
 * - Sensitive / Unhealthy: wearing a fitted N95 respirator in haze
 * - Very Unhealthy / Hazardous: N95 respirator + protective air-shield halo
 */
export function AqiMascotSvg({ severity }: AqiMascotSvgProps) {
  const needsMask =
    severity === 'sensitive' ||
    severity === 'unhealthy' ||
    severity === 'very_unhealthy' ||
    severity === 'hazardous';
  const isSevere = severity === 'very_unhealthy' || severity === 'hazardous';
  const isGood = severity === 'good';

  const shirtFill =
    severity === 'good'
      ? '#10b981'
      : severity === 'moderate'
        ? '#eab308'
        : severity === 'sensitive'
          ? '#f97316'
          : severity === 'unhealthy'
            ? '#ec4899'
            : '#a855f7';

  return (
    <svg
      viewBox="0 0 130 165"
      className="hero-mascot-svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Subtle aura / smog cloud puffs */}
      {isGood ? (
        <g opacity="0.85">
          <circle cx="24" cy="36" r="5" fill="#6ee7b7" />
          <circle cx="108" cy="28" r="4" fill="#a7f3d0" />
          <path
            d="M98 54 C104 44, 118 46, 114 58 C108 62, 99 60, 98 54 Z"
            fill="#34d399"
          />
        </g>
      ) : (
        <g opacity={isSevere ? '0.65' : '0.45'}>
          <ellipse cx="22" cy="40" rx="14" ry="7" fill="#ffffff" />
          <ellipse cx="106" cy="48" rx="16" ry="8" fill="#ffffff" />
          {isSevere && <ellipse cx="96" cy="24" rx="12" ry="6" fill="#f9a8d4" />}
        </g>
      )}

      {/* Protective shield ring in severe/hazardous conditions */}
      {isSevere && (
        <circle
          cx="65"
          cy="86"
          r="54"
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="2.5"
          strokeDasharray="6 5"
        />
      )}

      {/* Ground shadow */}
      <ellipse cx="65" cy="156" rx="30" ry="6" fill="rgba(0,0,0,0.28)" />

      {/* Legs */}
      <rect x="52" y="128" width="9" height="24" rx="4" fill="#1e293b" />
      <rect x="69" y="128" width="9" height="24" rx="4" fill="#1e293b" />

      {/* Body / Tunic */}
      <path
        d="M44 92 C44 82, 86 82, 86 92 L90 132 C90 136, 40 136, 40 132 Z"
        fill={shirtFill}
        stroke="#0f172a"
        strokeWidth="2.2"
      />
      {/* Jacket collar detail */}
      <path d="M58 86 L65 104 L72 86" fill="none" stroke="#0f172a" strokeWidth="1.8" />

      {/* Arms */}
      <path
        d="M44 95 L32 118 C30 122, 36 125, 39 121 L49 104"
        fill={shirtFill}
        stroke="#0f172a"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M86 95 L98 118 C100 122, 94 125, 91 121 L81 104"
        fill={shirtFill}
        stroke="#0f172a"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Hands */}
      <circle cx="34" cy="121" r="5" fill="#f5c09a" stroke="#0f172a" strokeWidth="1.8" />
      <circle cx="96" cy="121" r="5" fill="#f5c09a" stroke="#0f172a" strokeWidth="1.8" />

      {/* Neck */}
      <rect x="59" y="76" width="12" height="12" rx="4" fill="#f5c09a" />

      {/* Head */}
      <circle cx="65" cy="54" r="27" fill="#f7c8a4" stroke="#0f172a" strokeWidth="2.4" />

      {/* Hair */}
      <path
        d="M38 50 C36 26, 56 18, 72 22 C86 24, 94 34, 92 50 C86 38, 78 36, 70 38 C60 40, 48 34, 38 50 Z"
        fill="#3b1f14"
        stroke="#0f172a"
        strokeWidth="2"
      />
      {/* Hair tuft */}
      <path d="M62 21 Q68 12 75 20" fill="none" stroke="#3b1f14" strokeWidth="3.5" strokeLinecap="round" />

      {/* Ears */}
      <circle cx="38" cy="56" r="5" fill="#f5c09a" stroke="#0f172a" strokeWidth="1.8" />
      <circle cx="92" cy="56" r="5" fill="#f5c09a" stroke="#0f172a" strokeWidth="1.8" />

      {/* Eyes & Brows */}
      {needsMask ? (
        <g>
          {/* Worried / squinting eyes */}
          <path d="M49 45 Q55 42 60 46" fill="none" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M70 46 Q75 42 81 45" fill="none" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M50 53 Q55 50 60 53" fill="none" stroke="#0f172a" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M70 53 Q75 50 80 53" fill="none" stroke="#0f172a" strokeWidth="2.3" strokeLinecap="round" />
          {/* Sweat drop in unhealthy+ */}
          <path
            d="M84 41 Q88 47 84 50 Q80 47 84 41 Z"
            fill="#bae6fd"
            stroke="#0284c7"
            strokeWidth="1.2"
          />
        </g>
      ) : (
        <g>
          {/* Bright happy eyes */}
          <circle cx="55" cy="52" r="3" fill="#0f172a" />
          <circle cx="75" cy="52" r="3" fill="#0f172a" />
          <circle cx="56" cy="51" r="1" fill="#ffffff" />
          <circle cx="76" cy="51" r="1" fill="#ffffff" />
          {/* Rosy cheeks */}
          <ellipse cx="47" cy="60" rx="4.5" ry="2.5" fill="rgba(244,63,94,0.35)" />
          <ellipse cx="83" cy="60" rx="4.5" ry="2.5" fill="rgba(244,63,94,0.35)" />
        </g>
      )}

      {/* Fitted N95 Respirator OR Smile */}
      {needsMask ? (
        <g>
          {/* Mask ear loops */}
          <path d="M39 58 L50 63" stroke="#e2e8f0" strokeWidth="2" />
          <path d="M91 58 L80 63" stroke="#e2e8f0" strokeWidth="2" />
          <path d="M40 62 L50 71" stroke="#e2e8f0" strokeWidth="2" />
          <path d="M90 62 L80 71" stroke="#e2e8f0" strokeWidth="2" />
          {/* N95 body */}
          <path
            d="M49 60 Q65 56 81 60 L79 75 Q65 81 51 75 Z"
            fill="#f8fafc"
            stroke="#334155"
            strokeWidth="2"
          />
          <line x1="55" y1="65" x2="75" y2="65" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="56" y1="70" x2="74" y2="70" stroke="#cbd5e1" strokeWidth="1.5" />
        </g>
      ) : (
        <path
          d={isGood ? 'M55 64 Q65 74 75 64' : 'M57 66 Q65 70 73 66'}
          fill="none"
          stroke="#7c2d12"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/**
 * Subtle decorative urban skyline silhouette layered inside the atmospheric hero banner.
 */
export function CitySkylineSvg() {
  return (
    <svg
      viewBox="0 0 900 130"
      preserveAspectRatio="none"
      className="hero-skyline-svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M0 130 L0 95 L28 95 L28 74 L48 74 L48 56 L66 56 L66 86 L95 86 L95 45 L112 36 L128 45 L128 90 L165 90 L165 62 L182 62 L182 28 L194 28 L194 62 L212 62 L212 92 L245 92 L245 68 Q275 35 305 68 L305 92 L340 92 L340 48 L368 48 L368 88 L405 88 L405 34 L430 34 L430 56 L448 56 L448 88 L492 88 Q528 52 564 88 L600 88 L600 42 L624 42 L624 72 L650 72 L650 22 L666 22 L666 72 L702 72 L702 52 L738 52 L738 86 L775 86 L775 60 L812 60 L812 88 L852 88 L852 50 L880 50 L880 94 L900 94 L900 130 Z"
        fill="currentColor"
      />
    </svg>
  );
}
