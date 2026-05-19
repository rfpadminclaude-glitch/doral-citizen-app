'use client';

/**
 * SkylineIllustration — minimalist Doral skyline silhouette.
 *
 * Pure SVG, no images. Uses CSS variables so it adapts to the active theme.
 * Sized to sit above the chat empty-state welcome message.
 */
export function SkylineIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 80"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="City of Doral skyline"
      className={className}
    >
      <defs>
        <linearGradient id="skyline-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.16" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="skyline-stroke" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="60%" stopColor="hsl(var(--secondary))" />
          <stop offset="100%" stopColor="hsl(var(--gold))" />
        </linearGradient>
      </defs>

      {/* Soft sun / glow — pulses slowly */}
      <circle cx="260" cy="20" r="10" fill="hsl(var(--gold))" className="origin-center animate-pulse-soft" style={{ transformBox: 'fill-box', transformOrigin: '260px 20px' }} opacity="0.18" />
      <circle cx="260" cy="20" r="6" fill="hsl(var(--gold))" opacity="0.32" />

      {/* Filled silhouette underneath */}
      <path
        fill="url(#skyline-fill)"
        d="M0,80 L0,58
           L18,58 L18,40 L36,40 L36,52 L52,52
           L52,30 L70,30 L70,46 L86,46 L86,38 L100,38
           L100,22 L118,22 L118,42 L130,42 L130,32 L148,32
           L148,48 L168,48 L168,28 L188,28 L188,44 L206,44
           L206,36 L222,36 L222,52 L240,52 L240,42 L256,42
           L256,30 L274,30 L274,46 L290,46 L290,54 L308,54
           L308,46 L320,46 L320,80 Z"
      />

      {/* Outline of the silhouette */}
      <path
        fill="none"
        stroke="url(#skyline-stroke)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.85"
        d="M0,58
           L18,58 L18,40 L36,40 L36,52 L52,52
           L52,30 L70,30 L70,46 L86,46 L86,38 L100,38
           L100,22 L118,22 L118,42 L130,42 L130,32 L148,32
           L148,48 L168,48 L168,28 L188,28 L188,44 L206,44
           L206,36 L222,36 L222,52 L240,52 L240,42 L256,42
           L256,30 L274,30 L274,46 L290,46 L290,54 L308,54
           L308,46 L320,46"
      />

      {/* Subtle windows — twinkle on a staggered loop */}
      <g fill="hsl(var(--primary))">
        <rect x="22" y="46" width="2" height="2" className="animate-twinkle" style={{ animationDelay: '0ms' }} />
        <rect x="28" y="46" width="2" height="2" opacity="0.32" />
        <rect x="58" y="36" width="2" height="2" opacity="0.32" />
        <rect x="64" y="36" width="2" height="2" className="animate-twinkle" style={{ animationDelay: '600ms' }} />
        <rect x="106" y="28" width="2" height="2" className="animate-twinkle" style={{ animationDelay: '1200ms' }} />
        <rect x="112" y="28" width="2" height="2" opacity="0.32" />
        <rect x="174" y="34" width="2" height="2" opacity="0.32" />
        <rect x="180" y="34" width="2" height="2" className="animate-twinkle" style={{ animationDelay: '1800ms' }} />
        <rect x="244" y="48" width="2" height="2" className="animate-twinkle" style={{ animationDelay: '2400ms' }} />
        <rect x="250" y="48" width="2" height="2" opacity="0.32" />
        <rect x="278" y="38" width="2" height="2" opacity="0.32" />
        <rect x="284" y="38" width="2" height="2" className="animate-twinkle" style={{ animationDelay: '900ms' }} />
      </g>

      {/* Ground line */}
      <line
        x1="0"
        x2="320"
        y1="68"
        y2="68"
        stroke="hsl(var(--border))"
        strokeWidth="0.5"
        strokeDasharray="2 3"
      />
    </svg>
  );
}
