export function MarketDuelAnimation() {
  const ticker = [
    { pair: "EUR/USD", price: "1.0823", change: "▲ +0.12%", bull: true },
    { pair: "USD/JPY", price: "149.82", change: "▼ −0.24%", bull: false },
    { pair: "GBP/USD", price: "1.2641", change: "▲ +0.08%", bull: true },
    { pair: "AUD/USD", price: "0.6534", change: "▼ −0.15%", bull: false },
    { pair: "USD/CHF", price: "0.9012", change: "▲ +0.06%", bull: true },
    { pair: "USD/CAD", price: "1.3621", change: "▼ −0.18%", bull: false },
    { pair: "NZD/USD", price: "0.6012", change: "▲ +0.10%", bull: true },
    { pair: "EUR/GBP", price: "0.8562", change: "▲ +0.04%", bull: true },
  ];

  const tickerItems = (
    <>
      {ticker.map((t, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className={t.bull ? "text-emerald-300/75" : "text-red-300/75"}>{t.pair}</span>
          <span className={`font-semibold ${t.bull ? "text-emerald-400" : "text-red-400"}`}>{t.price}</span>
          <span className={`${t.bull ? "text-emerald-400/65" : "text-red-400/65"}`}>{t.change}</span>
          {i < ticker.length - 1 && <span className="mx-2 text-white/15">·</span>}
        </span>
      ))}
    </>
  );

  return (
    <div className="profile-market-scene pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_80%_at_14%_55%,rgba(16,185,129,0.26),transparent),radial-gradient(ellipse_45%_75%_at_86%_50%,rgba(239,68,68,0.2),transparent)]" />

      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 900 180"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pmBullGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="pmBearGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="pmLineGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="pmAreaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <filter id="pmGlow">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="pmGlowStrong">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid */}
        <g opacity="0.1" stroke="currentColor" strokeWidth="0.5">
          <line x1="0" y1="45" x2="900" y2="45" />
          <line x1="0" y1="90" x2="900" y2="90" />
          <line x1="0" y1="135" x2="900" y2="135" />
          <line x1="150" y1="0" x2="150" y2="180" />
          <line x1="300" y1="0" x2="300" y2="180" />
          <line x1="450" y1="0" x2="450" y2="180" />
          <line x1="600" y1="0" x2="600" y2="180" />
          <line x1="750" y1="0" x2="750" y2="180" />
        </g>

        {/* Area fill under price line */}
        <path
          className="profile-market-area"
          d="M130 132 C190 112 250 90 310 72 C370 54 430 42 490 32 C550 22 610 16 670 12 C710 9 750 7 790 6 L790 155 L130 155 Z"
          fill="url(#pmAreaGrad)"
        />

        {/* Price line — draws itself on load */}
        <path
          className="profile-market-line"
          d="M130 132 C190 112 250 90 310 72 C370 54 430 42 490 32 C550 22 610 16 670 12 C710 9 750 7 790 6"
          fill="none"
          stroke="url(#pmLineGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#pmGlow)"
        />

        {/* Candlesticks */}
        <g className="profile-market-candles">
          <line x1="185" y1="96" x2="185" y2="140" stroke="#34d399" strokeWidth="2" />
          <rect x="177" y="106" width="16" height="24" rx="2" fill="#34d399" opacity="0.82" />

          <line x1="235" y1="80" x2="235" y2="124" stroke="#f87171" strokeWidth="2" />
          <rect x="227" y="86" width="16" height="28" rx="2" fill="#f87171" opacity="0.78" />

          <line x1="285" y1="64" x2="285" y2="108" stroke="#34d399" strokeWidth="2" />
          <rect x="277" y="72" width="16" height="26" rx="2" fill="#34d399" opacity="0.85" />

          <line x1="335" y1="50" x2="335" y2="92" stroke="#34d399" strokeWidth="2" />
          <rect x="327" y="56" width="16" height="26" rx="2" fill="#34d399" opacity="0.85" />

          <line x1="385" y1="38" x2="385" y2="80" stroke="#f87171" strokeWidth="2" />
          <rect x="377" y="44" width="16" height="26" rx="2" fill="#f87171" opacity="0.78" />

          <line x1="435" y1="26" x2="435" y2="66" stroke="#34d399" strokeWidth="2" />
          <rect x="427" y="32" width="16" height="24" rx="2" fill="#34d399" opacity="0.88" />

          <line x1="485" y1="18" x2="485" y2="56" stroke="#34d399" strokeWidth="2" />
          <rect x="477" y="24" width="16" height="22" rx="2" fill="#34d399" opacity="0.9" />

          <line x1="535" y1="12" x2="535" y2="50" stroke="#f87171" strokeWidth="2" />
          <rect x="527" y="16" width="16" height="24" rx="2" fill="#f87171" opacity="0.78" />

          <line x1="585" y1="8" x2="585" y2="44" stroke="#34d399" strokeWidth="2" />
          <rect x="577" y="12" width="16" height="22" rx="2" fill="#34d399" opacity="0.9" />

          <line x1="635" y1="6" x2="635" y2="38" stroke="#34d399" strokeWidth="2" />
          <rect x="627" y="9" width="16" height="20" rx="2" fill="#34d399" opacity="0.92" />

          <line x1="685" y1="4" x2="685" y2="32" stroke="#34d399" strokeWidth="2" />
          <rect x="677" y="7" width="16" height="18" rx="2" fill="#34d399" opacity="0.94" />

          <line x1="735" y1="3" x2="735" y2="26" stroke="#34d399" strokeWidth="2" />
          <rect x="727" y="5" width="16" height="16" rx="2" fill="#34d399" opacity="0.96" />
        </g>

        {/* Live price pulse rings */}
        <circle className="profile-market-pulse-2" cx="790" cy="6" r="18" fill="#34d399" opacity="0.1" />
        <circle className="profile-market-pulse" cx="790" cy="6" r="10" fill="#34d399" opacity="0.25" />
        <circle cx="790" cy="6" r="5" fill="#34d399" filter="url(#pmGlowStrong)" />

        {/* Bull — upward arrow with horns */}
        <g className="profile-market-bull">
          <circle cx="72" cy="106" r="38" fill="#34d399" opacity="0.06" />
          <path
            d="M72 150 L72 74 M54 92 L72 74 L90 92"
            stroke="url(#pmBullGrad)"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#pmGlowStrong)"
          />
          <path d="M50 104 C35 88 33 70 48 62" stroke="#6ee7b7" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M94 104 C109 88 111 70 96 62" stroke="#6ee7b7" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </g>

        {/* Bear — downward arrow with ears */}
        <g className="profile-market-bear">
          <circle cx="828" cy="96" r="38" fill="#ef4444" opacity="0.06" />
          <path
            d="M828 50 L828 130 M810 112 L828 130 L846 112"
            stroke="url(#pmBearGrad)"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#pmGlowStrong)"
          />
          <circle cx="813" cy="42" r="11" fill="none" stroke="#fca5a5" strokeWidth="4" />
          <circle cx="843" cy="42" r="11" fill="none" stroke="#fca5a5" strokeWidth="4" />
          <circle cx="813" cy="42" r="5.5" fill="#f87171" opacity="0.5" />
          <circle cx="843" cy="42" r="5.5" fill="#f87171" opacity="0.5" />
        </g>
      </svg>

      {/* Scrolling forex ticker */}
      <div className="profile-ticker absolute bottom-0 left-0 right-0 h-5 overflow-hidden border-t border-white/8 bg-black/18">
        <div className="profile-ticker-track flex h-full items-center whitespace-nowrap">
          <div className="profile-ticker-content flex shrink-0 items-center gap-1 px-4 font-mono text-[9px]">
            {tickerItems}
          </div>
          <div className="profile-ticker-content flex shrink-0 items-center gap-1 px-4 font-mono text-[9px]" aria-hidden="true">
            {tickerItems}
          </div>
        </div>
      </div>
    </div>
  );
}
