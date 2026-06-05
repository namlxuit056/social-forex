export function FlyingDragonAnimation() {
  return (
    <div
      className="profile-dragon-scene pointer-events-none absolute right-0 top-0 hidden h-28 w-80 overflow-visible sm:block"
      aria-hidden="true"
    >
      <svg viewBox="0 0 340 140" className="size-full overflow-visible">
        <defs>
          <linearGradient id="drBodyGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <linearGradient id="drBellyGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f0fdf4" />
            <stop offset="100%" stopColor="#99f6e4" />
          </linearGradient>
          <linearGradient id="drWingGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id="drFireGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
          <filter id="drGlow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="drFireGlow">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Magic trail */}
        <path
          className="profile-dragon-trail"
          d="M8 88 C52 52 88 108 132 72 C172 38 210 86 252 54 C278 32 304 30 328 44"
          fill="none"
          stroke="#34d399"
          strokeLinecap="round"
          strokeWidth="3"
          opacity="0.35"
        />

        <g className="profile-dragon">
          {/* Wings — back (rendered first, behind body) */}
          <g className="profile-dragon-wing profile-dragon-wing-back">
            <path
              d="M138 68 C110 28 78 14 48 26 C72 46 96 62 118 72Z"
              fill="url(#drWingGrad)"
              stroke="#34d399"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
            <path d="M138 68 C116 52 100 42 76 36" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" fill="none" />
            <path d="M138 68 C124 44 108 28 88 22" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" fill="none" />
          </g>

          {/* Body */}
          <path
            d="M46 90 C78 48 118 52 148 82 C180 114 220 88 244 56 C258 34 282 30 302 48"
            fill="none"
            stroke="url(#drBodyGrad)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="24"
            filter="url(#drGlow)"
          />
          {/* Belly highlight */}
          <path
            d="M52 92 C84 60 116 62 146 88 C178 116 218 92 242 60 C254 40 278 36 296 50"
            fill="none"
            stroke="url(#drBellyGrad)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="8"
            opacity="0.85"
          />

          {/* Wings — front */}
          <g className="profile-dragon-wing">
            <path
              d="M148 82 C120 42 90 26 60 38 C84 58 108 74 130 84Z"
              fill="url(#drWingGrad)"
              stroke="#34d399"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
            <path d="M148 82 C126 66 110 56 86 50" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" fill="none" />
            <path d="M148 82 C134 58 118 42 98 36" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" fill="none" />
          </g>

          {/* Spines along back */}
          <g fill="#a7f3d0" opacity="0.8">
            <path d="M88 52 L80 32 L98 56Z" />
            <path d="M124 56 L118 34 L136 62Z" />
            <path d="M176 96 L170 74 L186 100Z" />
            <path d="M242 60 L236 38 L252 66Z" />
          </g>

          {/* Tail */}
          <path
            d="M46 90 C34 78 22 74 10 82 C24 90 36 102 40 116"
            fill="url(#drBodyGrad)"
            filter="url(#drGlow)"
          />

          {/* Head */}
          <g>
            {/* Head shape */}
            <path
              d="M296 50 C310 30 332 28 342 46 C334 56 320 64 302 62Z"
              fill="url(#drBodyGrad)"
              filter="url(#drGlow)"
            />
            {/* Brow horns */}
            <path d="M308 34 L306 10 L322 32 M326 38 L342 20 L338 46" fill="#a7f3d0" />
            {/* Snout */}
            <path d="M303 62 C294 72 284 76 272 76" fill="none" stroke="#5eead4" strokeLinecap="round" strokeWidth="5" />
            {/* Fire breath */}
            <path
              className="profile-dragon-fire"
              d="M272 76 C252 72 232 68 210 72 C190 75 175 70 162 64"
              fill="none"
              stroke="url(#drFireGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              filter="url(#drFireGlow)"
            />
            {/* Whiskers */}
            <path d="M325 56 C338 62 344 70 347 80 M325 52 C342 50 350 54 356 62" fill="none" stroke="#cffafe" strokeLinecap="round" strokeWidth="2.5" />
            {/* Eye */}
            <circle cx="324" cy="44" r="4" fill="#042f2e" />
            <circle cx="325" cy="43" r="1.5" fill="#fff" opacity="0.6" />
            {/* Nostril glow */}
            <circle cx="310" cy="54" r="2.5" fill="#fbbf24" opacity="0.6" filter="url(#drFireGlow)" />
          </g>

          {/* Claws */}
          <g stroke="#ccfbf1" strokeLinecap="round" strokeWidth="4" opacity="0.7">
            <path d="M86 58 L74 40 M86 58 L96 42 M86 58 L84 36" />
            <path d="M148 82 L138 102 M148 82 L158 106 M148 82 L150 108" />
            <path d="M220 90 L210 110 M220 90 L230 114 M220 90 L222 116" />
          </g>
        </g>
      </svg>
    </div>
  );
}

export function RunningTigerAnimation() {
  return (
    <span
      className="profile-tiger-scene pointer-events-none relative inline-flex h-12 w-24 shrink-0 items-center justify-center overflow-visible"
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 80" className="size-full overflow-visible">
        <defs>
          <linearGradient id="tigerBodyGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="55%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
          <filter id="tigerGlow">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Speed lines */}
        <g className="profile-tiger-speed" stroke="#f97316" strokeLinecap="round" opacity="0">
          <line x1="2" y1="34" x2="28" y2="34" strokeWidth="3" />
          <line x1="6" y1="42" x2="36" y2="42" strokeWidth="2" />
          <line x1="2" y1="50" x2="24" y2="50" strokeWidth="2.5" />
          <line x1="8" y1="26" x2="30" y2="26" strokeWidth="2" />
        </g>

        <g className="profile-tiger">
          {/* Body */}
          <ellipse cx="84" cy="42" rx="44" ry="20" fill="url(#tigerBodyGrad)" />
          {/* Head */}
          <circle cx="120" cy="32" r="18" fill="url(#tigerBodyGrad)" />
          {/* Ears */}
          <path d="M110 16 L104 2 L118 20" fill="#f97316" />
          <path d="M130 18 L138 4 L134 24" fill="#f97316" />
          <path d="M110 16 L107 8 L116 19" fill="#fde68a" opacity="0.6" />
          <path d="M130 18 L136 9 L133 23" fill="#fde68a" opacity="0.6" />
          {/* Tail */}
          <path d="M40 36 C28 28 18 20 14 10" fill="none" stroke="#f97316" strokeLinecap="round" strokeWidth="10" />
          <path d="M40 36 C28 28 18 20 14 10" fill="none" stroke="#fbbf24" strokeLinecap="round" strokeWidth="4" opacity="0.4" />
          {/* Legs — dynamic running pose */}
          <g stroke="#7c2d12" strokeLinecap="round" strokeWidth="8.5">
            <path d="M64 58 L52 76" className="profile-tiger-leg-fl" />
            <path d="M82 60 L94 78" className="profile-tiger-leg-fr" />
            <path d="M100 54 L116 70" className="profile-tiger-leg-rl" />
            <path d="M54 54 L36 64" className="profile-tiger-leg-rr" />
          </g>
          {/* Stripes */}
          <g stroke="#111827" strokeLinecap="round" strokeWidth="5.5" opacity="0.82">
            <path d="M68 24 L60 46" />
            <path d="M84 22 L78 46" />
            <path d="M100 24 L94 46" />
            <path d="M113 28 L106 45" />
          </g>
          {/* Belly */}
          <ellipse cx="84" cy="52" rx="28" ry="10" fill="#fff7ed" opacity="0.5" />
          {/* Face */}
          <circle cx="126" cy="30" r="3.5" fill="#111827" />
          <circle cx="127" cy="29" r="1.5" fill="#fff" opacity="0.5" />
          {/* Whiskers */}
          <path d="M129 38 C140 36 147 40 150 46 M129 42 C140 44 147 50 149 56" fill="none" stroke="#fed7aa" strokeLinecap="round" strokeWidth="3" />
          {/* Nose */}
          <ellipse cx="124" cy="36" rx="5" ry="3.5" fill="#7c2d12" />
          {/* Mouth */}
          <path d="M119 40 C122 46 128 46 130 40" fill="none" stroke="#7c2d12" strokeLinecap="round" strokeWidth="3" />
        </g>
      </svg>
    </span>
  );
}
