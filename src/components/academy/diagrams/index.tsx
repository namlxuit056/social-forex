import React from "react";

type CandleProps = {
  cx: number;
  wickTop: number;
  bodyTop: number;
  bodyBottom: number;
  wickBottom: number;
  green: boolean;
};

function Candle({ cx, wickTop, bodyTop, bodyBottom, wickBottom, green }: CandleProps) {
  const half = 7;
  return (
    <g>
      {wickTop < bodyTop && (
        <line x1={cx} y1={wickTop} x2={cx} y2={bodyTop} stroke="#6b7280" strokeWidth="1.5" />
      )}
      <rect
        x={cx - half}
        y={bodyTop}
        width={half * 2}
        height={Math.max(2, bodyBottom - bodyTop)}
        fill={green ? "#22c55e" : "#ef4444"}
        rx={1}
      />
      {wickBottom > bodyBottom && (
        <line x1={cx} y1={bodyBottom} x2={cx} y2={wickBottom} stroke="#6b7280" strokeWidth="1.5" />
      )}
    </g>
  );
}

const FONT = { fontFamily: "system-ui, sans-serif" } as const;
const BOX = { viewBox: "0 0 360 200", width: "100%" } as const;

export function PinBarBullish() {
  return (
    <svg {...BOX} role="img" aria-label="Bullish pin bar at support zone">
      <rect x="0" y="148" width="360" height="48" fill="#22c55e" fillOpacity="0.12" />
      <line x1="0" y1="148" x2="310" y2="148" stroke="#22c55e" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="144" fill="#22c55e" fontSize="9" {...FONT}>Support Zone</text>
      <Candle cx={42} wickTop={28} bodyTop={40} bodyBottom={65} wickBottom={76} green={false} />
      <Candle cx={87} wickTop={50} bodyTop={62} bodyBottom={88} wickBottom={100} green={false} />
      <Candle cx={132} wickTop={76} bodyTop={88} bodyBottom={114} wickBottom={126} green={false} />
      {/* Pin bar: small body 140-151, short upper wick 133-140, long lower wick 151-177 */}
      <Candle cx={185} wickTop={133} bodyTop={140} bodyBottom={151} wickBottom={177} green={true} />
      <Candle cx={238} wickTop={110} bodyTop={118} bodyBottom={164} wickBottom={168} green={true} />
      <line x1="254" y1="145" x2="199" y2="145" stroke="#9ca3af" strokeWidth="0.8" />
      <text x="256" y="148" fill="#d1d5db" fontSize="9" {...FONT}>Small Body</text>
      <line x1="254" y1="167" x2="199" y2="166" stroke="#9ca3af" strokeWidth="0.8" />
      <text x="256" y="170" fill="#d1d5db" fontSize="9" {...FONT}>Long Wick ↓</text>
      <line x1="185" y1="127" x2="185" y2="107" stroke="#22c55e" strokeWidth="2" />
      <polygon points="185,100 179,110 191,110" fill="#22c55e" />
    </svg>
  );
}

export function PinBarBearish() {
  return (
    <svg {...BOX} role="img" aria-label="Bearish pin bar at resistance zone">
      <rect x="0" y="5" width="360" height="48" fill="#ef4444" fillOpacity="0.12" />
      <line x1="0" y1="53" x2="310" y2="53" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="68" fill="#ef4444" fontSize="9" {...FONT}>Resistance Zone</text>
      <Candle cx={42} wickTop={62} bodyTop={75} bodyBottom={105} wickBottom={122} green={true} />
      <Candle cx={87} wickTop={38} bodyTop={52} bodyBottom={82} wickBottom={100} green={true} />
      <Candle cx={132} wickTop={18} bodyTop={32} bodyBottom={58} wickBottom={74} green={true} />
      {/* Pin bar: long upper wick 18-42, small body 42-53, short lower wick 53-64 */}
      <Candle cx={185} wickTop={18} bodyTop={42} bodyBottom={53} wickBottom={64} green={false} />
      <Candle cx={238} wickTop={28} bodyTop={35} bodyBottom={83} wickBottom={90} green={false} />
      <line x1="254" y1="47" x2="199" y2="47" stroke="#9ca3af" strokeWidth="0.8" />
      <text x="256" y="50" fill="#d1d5db" fontSize="9" {...FONT}>Small Body</text>
      <line x1="254" y1="27" x2="199" y2="28" stroke="#9ca3af" strokeWidth="0.8" />
      <text x="256" y="30" fill="#d1d5db" fontSize="9" {...FONT}>Long Wick ↑</text>
      <line x1="185" y1="72" x2="185" y2="92" stroke="#ef4444" strokeWidth="2" />
      <polygon points="185,99 179,89 191,89" fill="#ef4444" />
    </svg>
  );
}

export function EngulfingBullish() {
  return (
    <svg {...BOX} role="img" aria-label="Bullish engulfing pattern at support">
      <rect x="0" y="150" width="360" height="46" fill="#22c55e" fillOpacity="0.12" />
      <line x1="0" y1="150" x2="310" y2="150" stroke="#22c55e" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="146" fill="#22c55e" fontSize="9" {...FONT}>Support Zone</text>
      <Candle cx={38} wickTop={25} bodyTop={38} bodyBottom={62} wickBottom={74} green={false} />
      <Candle cx={80} wickTop={48} bodyTop={62} bodyBottom={86} wickBottom={98} green={false} />
      <Candle cx={122} wickTop={74} bodyTop={88} bodyBottom={112} wickBottom={124} green={false} />
      {/* Small red candle: body 135-157 */}
      <Candle cx={168} wickTop={128} bodyTop={135} bodyBottom={157} wickBottom={164} green={false} />
      {/* Dashed reference lines */}
      <line x1="152" y1="135" x2="238" y2="135" stroke="#9ca3af" strokeWidth="0.8" strokeDasharray="3 2" />
      <line x1="152" y1="157" x2="238" y2="157" stroke="#9ca3af" strokeWidth="0.8" strokeDasharray="3 2" />
      {/* Large green engulfing: body 122-163, covers 135-157 */}
      <Candle cx={215} wickTop={118} bodyTop={122} bodyBottom={163} wickBottom={170} green={true} />
      <text x="240" y="136" fill="#d1d5db" fontSize="9" {...FONT}>Engulfs</text>
      <text x="240" y="149" fill="#22c55e" fontSize="10" fontWeight="bold" {...FONT}>↑ Bullish</text>
      <text x="240" y="161" fill="#d1d5db" fontSize="9" {...FONT}>prev. candle</text>
      <line x1="215" y1="112" x2="215" y2="95" stroke="#22c55e" strokeWidth="2" />
      <polygon points="215,87 209,97 221,97" fill="#22c55e" />
    </svg>
  );
}

export function EngulfingBearish() {
  return (
    <svg {...BOX} role="img" aria-label="Bearish engulfing pattern at resistance">
      <rect x="0" y="5" width="360" height="48" fill="#ef4444" fillOpacity="0.12" />
      <line x1="0" y1="53" x2="310" y2="53" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="68" fill="#ef4444" fontSize="9" {...FONT}>Resistance Zone</text>
      <Candle cx={38} wickTop={62} bodyTop={74} bodyBottom={105} wickBottom={122} green={true} />
      <Candle cx={80} wickTop={38} bodyTop={50} bodyBottom={80} wickBottom={98} green={true} />
      <Candle cx={122} wickTop={18} bodyTop={30} bodyBottom={56} wickBottom={74} green={true} />
      {/* Small green candle: body 32-52 */}
      <Candle cx={168} wickTop={26} bodyTop={32} bodyBottom={52} wickBottom={60} green={true} />
      <line x1="152" y1="32" x2="238" y2="32" stroke="#9ca3af" strokeWidth="0.8" strokeDasharray="3 2" />
      <line x1="152" y1="52" x2="238" y2="52" stroke="#9ca3af" strokeWidth="0.8" strokeDasharray="3 2" />
      {/* Large red engulfing: body 22-63, covers 32-52 */}
      <Candle cx={215} wickTop={18} bodyTop={22} bodyBottom={63} wickBottom={70} green={false} />
      <text x="240" y="34" fill="#d1d5db" fontSize="9" {...FONT}>Engulfs</text>
      <text x="240" y="47" fill="#ef4444" fontSize="10" fontWeight="bold" {...FONT}>↓ Bearish</text>
      <text x="240" y="59" fill="#d1d5db" fontSize="9" {...FONT}>prev. candle</text>
      <line x1="215" y1="78" x2="215" y2="96" stroke="#ef4444" strokeWidth="2" />
      <polygon points="215,104 209,94 221,94" fill="#ef4444" />
    </svg>
  );
}

export function InsideBarSetup() {
  return (
    <svg {...BOX} role="img" aria-label="Inside bar compression setup">
      <Candle cx={48} wickTop={58} bodyTop={72} bodyBottom={108} wickBottom={118} green={false} />
      <Candle cx={93} wickTop={42} bodyTop={57} bodyBottom={96} wickBottom={105} green={true} />
      {/* Mother bar */}
      <Candle cx={155} wickTop={38} bodyTop={52} bodyBottom={148} wickBottom={158} green={true} />
      <line x1="135" y1="38" x2="240" y2="38" stroke="#9ca3af" strokeWidth="0.8" strokeDasharray="4 3" />
      <line x1="135" y1="158" x2="240" y2="158" stroke="#9ca3af" strokeWidth="0.8" strokeDasharray="4 3" />
      {/* Inside bar: range 68-142, fully within 38-158 */}
      <Candle cx={210} wickTop={68} bodyTop={78} bodyBottom={132} wickBottom={142} green={false} />
      {/* Bracket */}
      <line x1="234" y1="38" x2="248" y2="38" stroke="#6b7280" strokeWidth="1" />
      <line x1="248" y1="38" x2="248" y2="158" stroke="#6b7280" strokeWidth="1" />
      <line x1="234" y1="158" x2="248" y2="158" stroke="#6b7280" strokeWidth="1" />
      <line x1="248" y1="98" x2="256" y2="98" stroke="#6b7280" strokeWidth="1" />
      <text x="258" y="101" fill="#f59e0b" fontSize="9" {...FONT}>Compression</text>
      <text x="112" y="178" fill="#9ca3af" fontSize="9" {...FONT}>Mother Bar</text>
      <text x="186" y="178" fill="#9ca3af" fontSize="9" {...FONT}>Inside Bar</text>
    </svg>
  );
}

export function InsideBarBreakout() {
  return (
    <svg {...BOX} role="img" aria-label="Inside bar breakout">
      <Candle cx={38} wickTop={65} bodyTop={78} bodyBottom={112} wickBottom={122} green={false} />
      <Candle cx={80} wickTop={48} bodyTop={62} bodyBottom={100} wickBottom={110} green={true} />
      {/* Mother bar */}
      <Candle cx={140} wickTop={42} bodyTop={55} bodyBottom={148} wickBottom={158} green={true} />
      <line x1="120" y1="42" x2="268" y2="42" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 3" />
      <text x="270" y="45" fill="#22c55e" fontSize="9" {...FONT}>High</text>
      <line x1="120" y1="158" x2="268" y2="158" stroke="#6b7280" strokeWidth="0.8" strokeDasharray="4 3" />
      <text x="270" y="161" fill="#9ca3af" fontSize="9" {...FONT}>SL</text>
      {/* Inside bar: range 72-140, fully within 42-158 */}
      <Candle cx={193} wickTop={72} bodyTop={82} bodyBottom={130} wickBottom={140} green={true} />
      {/* Breakout candle: goes above mother bar high at y=42 */}
      <Candle cx={248} wickTop={22} bodyTop={30} bodyBottom={98} wickBottom={106} green={true} />
      <line x1="248" y1="17" x2="248" y2="5" stroke="#22c55e" strokeWidth="2" />
      <polygon points="248,0 243,8 253,8" fill="#22c55e" />
      <text x="102" y="178" fill="#9ca3af" fontSize="9" {...FONT}>Mother Bar</text>
      <text x="168" y="178" fill="#9ca3af" fontSize="9" {...FONT}>Inside Bar</text>
      <text x="222" y="178" fill="#22c55e" fontSize="10" fontWeight="bold" {...FONT}>Breakout</text>
    </svg>
  );
}

export function BOSUptrend() {
  return (
    <svg {...BOX} role="img" aria-label="Break of Structure in uptrend">
      {/* Price path */}
      <polyline
        points="20,162 75,95 118,128 180,58 228,90 290,65"
        fill="none"
        stroke="#6b7280"
        strokeWidth="1.5"
      />
      {/* HH1 level dashed line at y=95 */}
      <line x1="75" y1="95" x2="300" y2="95" stroke="#22c55e" strokeWidth="1" strokeDasharray="5 3" />
      <text x="304" y="98" fill="#22c55e" fontSize="8" {...FONT}>HH1</text>
      {/* Swing dots */}
      <circle cx={75} cy={95} r={4} fill="#22c55e" />
      <circle cx={118} cy={128} r={4} fill="#9ca3af" />
      <circle cx={180} cy={58} r={5} fill="#22c55e" />
      <circle cx={228} cy={90} r={4} fill="#9ca3af" />
      {/* BOS point: segment (118,128)→(180,58) crosses y=95 at x≈147 */}
      <circle cx={147} cy={95} r={5} fill="none" stroke="#f59e0b" strokeWidth="2" />
      <text x="150" y="85" fill="#f59e0b" fontSize="10" fontWeight="bold" {...FONT}>BOS</text>
      {/* Labels */}
      <text x="58" y="90" fill="#d1d5db" fontSize="9" {...FONT}>HH1</text>
      <text x="100" y="143" fill="#d1d5db" fontSize="9" {...FONT}>HL1</text>
      <text x="182" y="52" fill="#22c55e" fontSize="9" fontWeight="bold" {...FONT}>HH2</text>
      <text x="210" y="106" fill="#d1d5db" fontSize="9" {...FONT}>HL2</text>
      <text x="6" y="185" fill="#9ca3af" fontSize="9" {...FONT}>Uptrend: BOS confirms continuation</text>
    </svg>
  );
}

export function CHoCHBearish() {
  return (
    <svg {...BOX} role="img" aria-label="Change of Character — bearish reversal signal">
      {/* Price path: uptrend then CHoCH */}
      <polyline
        points="20,165 78,90 120,125 182,55 228,95 272,148"
        fill="none"
        stroke="#6b7280"
        strokeWidth="1.5"
      />
      {/* HL2 level dashed line at y=95 */}
      <line x1="228" y1="95" x2="310" y2="95" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 3" />
      {/* Swing dots */}
      <circle cx={78} cy={90} r={4} fill="#22c55e" />
      <circle cx={120} cy={125} r={4} fill="#9ca3af" />
      <circle cx={182} cy={55} r={5} fill="#22c55e" />
      <circle cx={228} cy={95} r={4} fill="#9ca3af" />
      {/* CHoCH marker at HL2 */}
      <circle cx={228} cy={95} r={7} fill="none" stroke="#ef4444" strokeWidth="2" />
      <text x="240" y="80" fill="#ef4444" fontSize="10" fontWeight="bold" {...FONT}>CHoCH</text>
      <line x1="242" y1="82" x2="234" y2="90" stroke="#ef4444" strokeWidth="1" />
      {/* Labels */}
      <text x="62" y="84" fill="#d1d5db" fontSize="9" {...FONT}>HH1</text>
      <text x="103" y="140" fill="#d1d5db" fontSize="9" {...FONT}>HL1</text>
      <text x="184" y="49" fill="#22c55e" fontSize="9" fontWeight="bold" {...FONT}>HH2</text>
      <text x="196" y="110" fill="#d1d5db" fontSize="9" {...FONT}>HL2 broken</text>
      <text x="255" y="163" fill="#ef4444" fontSize="9" fontWeight="bold" {...FONT}>New LL</text>
      <text x="6" y="190" fill="#9ca3af" fontSize="9" {...FONT}>Structure shifts bearish — uptrend may be ending</text>
    </svg>
  );
}

export function FVGBullish() {
  return (
    <svg {...BOX} role="img" aria-label="Bullish Fair Value Gap">
      <Candle cx={38} wickTop={82} bodyTop={95} bodyBottom={138} wickBottom={148} green={false} />
      <Candle cx={82} wickTop={65} bodyTop={78} bodyBottom={120} wickBottom={130} green={true} />
      {/* C1 (red) */}
      <Candle cx={132} wickTop={68} bodyTop={80} bodyBottom={140} wickBottom={150} green={false} />
      {/* C1 high dashed line at y=68 */}
      <line x1="112" y1="68" x2="278" y2="68" stroke="#6b7280" strokeWidth="0.8" strokeDasharray="4 3" />
      <text x="282" y="71" fill="#9ca3af" fontSize="8" {...FONT}>C1 High</text>
      {/* C2 (large bullish impulse) */}
      <Candle cx={190} wickTop={32} bodyTop={40} bodyBottom={152} wickBottom={160} green={true} />
      {/* FVG zone: y=68 to y=108 */}
      <rect x="112" y="68" width="180" height="40" fill="#22c55e" fillOpacity="0.18" />
      <text x="158" y="93" fill="#22c55e" fontSize="10" fontWeight="bold" {...FONT}>FVG Zone</text>
      {/* C3 low dashed line at y=108 */}
      <line x1="112" y1="108" x2="278" y2="108" stroke="#6b7280" strokeWidth="0.8" strokeDasharray="4 3" />
      <text x="282" y="112" fill="#9ca3af" fontSize="8" {...FONT}>C3 Low</text>
      {/* C3 (small red) */}
      <Candle cx={248} wickTop={50} bodyTop={62} bodyBottom={102} wickBottom={108} green={false} />
      {/* Fill-back arrow */}
      <path d="M265 88 Q290 88 290 108" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <polygon points="290,108 285,100 295,100" fill="#f59e0b" />
      <text x="6" y="185" fill="#9ca3af" fontSize="9" {...FONT}>C1=before, C2=impulse, C3=after — gap may fill</text>
      <text x="120" y="170" fill="#9ca3af" fontSize="9" {...FONT}>C1</text>
      <text x="178" y="178" fill="#9ca3af" fontSize="9" {...FONT}>C2 (impulse)</text>
      <text x="240" y="123" fill="#9ca3af" fontSize="9" {...FONT}>C3</text>
    </svg>
  );
}

// ─── Additional pattern diagrams for practice exercises ───────────────────────

export function DojiAtResistance() {
  return (
    <svg {...BOX} role="img" aria-label="Doji at resistance — indecision signal">
      <rect x="0" y="5" width="360" height="48" fill="#ef4444" fillOpacity="0.12" />
      <line x1="0" y1="53" x2="310" y2="53" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="68" fill="#ef4444" fontSize="9" {...FONT}>Resistance Zone</text>
      <Candle cx={38} wickTop={122} bodyTop={105} bodyBottom={78} wickBottom={60} green={true} />
      <Candle cx={82} wickTop={98} bodyTop={80} bodyBottom={55} wickBottom={38} green={true} />
      <Candle cx={130} wickTop={76} bodyTop={58} bodyBottom={33} wickBottom={18} green={true} />
      {/* Doji: open ≈ close, equal wicks, at resistance */}
      <line x1="185" y1="22" x2="185" y2="34" stroke="#6b7280" strokeWidth="1.5" />
      <rect x="178" y="34" width="14" height="4" fill="#9ca3af" rx={1} />
      <line x1="185" y1="38" x2="185" y2="52" stroke="#6b7280" strokeWidth="1.5" />
      <text x="202" y="30" fill="#d1d5db" fontSize="9" {...FONT}>Open ≈ Close</text>
      <text x="202" y="44" fill="#f59e0b" fontSize="9" fontWeight="bold" {...FONT}>Doji — Indecision</text>
      {/* Confirmation candle (red) */}
      <Candle cx={248} wickTop={28} bodyTop={35} bodyBottom={82} wickBottom={90} green={false} />
      <text x="6" y="190" fill="#9ca3af" fontSize="9" {...FONT}>Doji at resistance signals buyer exhaustion</text>
    </svg>
  );
}

export function DragonflyAtSupport() {
  return (
    <svg {...BOX} role="img" aria-label="Dragonfly doji at support — bullish reversal signal">
      <rect x="0" y="148" width="360" height="48" fill="#22c55e" fillOpacity="0.12" />
      <line x1="0" y1="148" x2="310" y2="148" stroke="#22c55e" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="144" fill="#22c55e" fontSize="9" {...FONT}>Support Zone</text>
      <Candle cx={42} wickTop={28} bodyTop={40} bodyBottom={65} wickBottom={76} green={false} />
      <Candle cx={87} wickTop={50} bodyTop={62} bodyBottom={88} wickBottom={100} green={false} />
      <Candle cx={132} wickTop={76} bodyTop={88} bodyBottom={114} wickBottom={126} green={false} />
      {/* Dragonfly: open=close at top, very long lower wick, no upper wick */}
      <rect x="178" y="136" width="14" height="3" fill="#9ca3af" rx={1} />
      <line x1="185" y1="139" x2="185" y2="178" stroke="#6b7280" strokeWidth="1.5" />
      <text x="202" y="133" fill="#f59e0b" fontSize="9" fontWeight="bold" {...FONT}>Dragonfly Doji</text>
      <text x="202" y="165" fill="#d1d5db" fontSize="9" {...FONT}>Long lower wick</text>
      <text x="202" y="177" fill="#d1d5db" fontSize="9" {...FONT}>No upper wick</text>
      <Candle cx={248} wickTop={112} bodyTop={120} bodyBottom={162} wickBottom={168} green={true} />
      <text x="6" y="196" fill="#9ca3af" fontSize="9" {...FONT}>Open = Close at top → strong bullish rejection</text>
    </svg>
  );
}

export function GravestoneAtResistance() {
  return (
    <svg {...BOX} role="img" aria-label="Gravestone doji at resistance — bearish reversal signal">
      <rect x="0" y="5" width="360" height="48" fill="#ef4444" fillOpacity="0.12" />
      <line x1="0" y1="53" x2="310" y2="53" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="68" fill="#ef4444" fontSize="9" {...FONT}>Resistance Zone</text>
      <Candle cx={42} wickTop={122} bodyTop={105} bodyBottom={78} wickBottom={60} green={true} />
      <Candle cx={87} wickTop={98} bodyTop={80} bodyBottom={55} wickBottom={38} green={true} />
      <Candle cx={132} wickTop={76} bodyTop={58} bodyBottom={33} wickBottom={18} green={true} />
      {/* Gravestone: open=close at bottom, long upper wick, no lower wick */}
      <line x1="185" y1="18" x2="185" y2="56" stroke="#6b7280" strokeWidth="1.5" />
      <rect x="178" y="56" width="14" height="3" fill="#9ca3af" rx={1} />
      <text x="202" y="25" fill="#d1d5db" fontSize="9" {...FONT}>Long upper wick</text>
      <text x="202" y="52" fill="#f59e0b" fontSize="9" fontWeight="bold" {...FONT}>Gravestone Doji</text>
      <text x="202" y="64" fill="#d1d5db" fontSize="9" {...FONT}>No lower wick</text>
      <Candle cx={248} wickTop={28} bodyTop={35} bodyBottom={82} wickBottom={90} green={false} />
      <text x="6" y="196" fill="#9ca3af" fontSize="9" {...FONT}>Open = Close at bottom → strong bearish rejection</text>
    </svg>
  );
}

export function MorningStar() {
  return (
    <svg {...BOX} role="img" aria-label="Morning Star — bullish 3-candle reversal">
      <rect x="0" y="148" width="360" height="48" fill="#22c55e" fillOpacity="0.12" />
      <line x1="0" y1="148" x2="310" y2="148" stroke="#22c55e" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="144" fill="#22c55e" fontSize="9" {...FONT}>Support Zone</text>
      <Candle cx={38} wickTop={28} bodyTop={38} bodyBottom={62} wickBottom={74} green={false} />
      <Candle cx={82} wickTop={50} bodyTop={60} bodyBottom={85} wickBottom={96} green={false} />
      {/* Candle 1: large red */}
      <Candle cx={140} wickTop={82} bodyTop={92} bodyBottom={148} wickBottom={158} green={false} />
      {/* Candle 2 (star): small body, indecision */}
      <Candle cx={190} wickTop={148} bodyTop={155} bodyBottom={163} wickBottom={170} green={false} />
      {/* Candle 3: large green closing >50% into C1 */}
      <Candle cx={242} wickTop={92} bodyTop={100} bodyBottom={162} wickBottom={170} green={true} />
      {/* 50% line of C1 body */}
      <line x1="118" y1="120" x2="270" y2="120" stroke="#22c55e" strokeWidth="0.8" strokeDasharray="3 2" />
      <text x="274" y="123" fill="#22c55e" fontSize="8" {...FONT}>50%</text>
      <text x="108" y="178" fill="#9ca3af" fontSize="9" {...FONT}>C1</text>
      <text x="178" y="185" fill="#f59e0b" fontSize="9" fontWeight="bold" {...FONT}>Star</text>
      <text x="226" y="178" fill="#22c55e" fontSize="9" fontWeight="bold" {...FONT}>C3 ↑</text>
    </svg>
  );
}

export function EveningStar() {
  return (
    <svg {...BOX} role="img" aria-label="Evening Star — bearish 3-candle reversal">
      <rect x="0" y="5" width="360" height="48" fill="#ef4444" fillOpacity="0.12" />
      <line x1="0" y1="53" x2="310" y2="53" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="68" fill="#ef4444" fontSize="9" {...FONT}>Resistance Zone</text>
      <Candle cx={38} wickTop={130} bodyTop={112} bodyBottom={86} wickBottom={68} green={true} />
      <Candle cx={82} wickTop={102} bodyTop={82} bodyBottom={57} wickBottom={40} green={true} />
      {/* C1: large green */}
      <Candle cx={140} wickTop={38} bodyTop={48} bodyBottom={102} wickBottom={112} green={true} />
      {/* C2 (star): small body near top */}
      <Candle cx={190} wickTop={28} bodyTop={36} bodyBottom={44} wickBottom={52} green={true} />
      {/* C3: large red closing >50% into C1 */}
      <Candle cx={242} wickTop={38} bodyTop={48} bodyBottom={112} wickBottom={118} green={false} />
      {/* 50% line of C1 body */}
      <line x1="118" y1="75" x2="270" y2="75" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3 2" />
      <text x="274" y="78" fill="#ef4444" fontSize="8" {...FONT}>50%</text>
      <text x="108" y="128" fill="#9ca3af" fontSize="9" {...FONT}>C1</text>
      <text x="178" y="25" fill="#f59e0b" fontSize="9" fontWeight="bold" {...FONT}>Star</text>
      <text x="222" y="130" fill="#ef4444" fontSize="9" fontWeight="bold" {...FONT}>C3 ↓</text>
    </svg>
  );
}

export function TweeterBottom() {
  return (
    <svg {...BOX} role="img" aria-label="Tweezer Bottom — same low at support">
      <rect x="0" y="148" width="360" height="48" fill="#22c55e" fillOpacity="0.12" />
      <line x1="0" y1="148" x2="310" y2="148" stroke="#22c55e" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="144" fill="#22c55e" fontSize="9" {...FONT}>Support Zone</text>
      <Candle cx={38} wickTop={28} bodyTop={40} bodyBottom={68} wickBottom={80} green={false} />
      <Candle cx={82} wickTop={50} bodyTop={62} bodyBottom={90} wickBottom={102} green={false} />
      {/* Candle 1 (red): low touches support at y=158 */}
      <Candle cx={148} wickTop={100} bodyTop={112} bodyBottom={148} wickBottom={158} green={false} />
      {/* Candle 2 (green): same low at y=158 */}
      <Candle cx={198} wickTop={100} bodyTop={113} bodyBottom={148} wickBottom={158} green={true} />
      {/* Same-low marker */}
      <line x1="128" y1="158" x2="220" y2="158" stroke="#22c55e" strokeWidth="1.5" />
      <text x="230" y="161" fill="#22c55e" fontSize="9" fontWeight="bold" {...FONT}>Same Low</text>
      <Candle cx={262} wickTop={82} bodyTop={92} bodyBottom={138} wickBottom={148} green={true} />
      <line x1="262" y1="76" x2="262" y2="60" stroke="#22c55e" strokeWidth="2" />
      <polygon points="262,53 256,63 268,63" fill="#22c55e" />
      <text x="6" y="196" fill="#9ca3af" fontSize="9" {...FONT}>Both candles reject same low = strong support defended twice</text>
    </svg>
  );
}

export function TweeterTop() {
  return (
    <svg {...BOX} role="img" aria-label="Tweezer Top — same high at resistance">
      <rect x="0" y="5" width="360" height="48" fill="#ef4444" fillOpacity="0.12" />
      <line x1="0" y1="53" x2="310" y2="53" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="68" fill="#ef4444" fontSize="9" {...FONT}>Resistance Zone</text>
      <Candle cx={38} wickTop={122} bodyTop={105} bodyBottom={78} wickBottom={60} green={true} />
      <Candle cx={82} wickTop={98} bodyTop={78} bodyBottom={52} wickBottom={36} green={true} />
      {/* Candle 1 (green): high at resistance y=42 */}
      <Candle cx={148} wickTop={42} bodyTop={54} bodyBottom={92} wickBottom={102} green={true} />
      {/* Candle 2 (red): same high at y=42 */}
      <Candle cx={198} wickTop={42} bodyTop={55} bodyBottom={92} wickBottom={102} green={false} />
      {/* Same-high marker */}
      <line x1="128" y1="42" x2="220" y2="42" stroke="#ef4444" strokeWidth="1.5" />
      <text x="230" y="45" fill="#ef4444" fontSize="9" fontWeight="bold" {...FONT}>Same High</text>
      <Candle cx={262} wickTop={38} bodyTop={48} bodyBottom={96} wickBottom={106} green={false} />
      <line x1="262" y1="114" x2="262" y2="130" stroke="#ef4444" strokeWidth="2" />
      <polygon points="262,137 256,127 268,127" fill="#ef4444" />
      <text x="6" y="196" fill="#9ca3af" fontSize="9" {...FONT}>Both candles rejected at same high = resistance defended twice</text>
    </svg>
  );
}

export function ThreeWhiteSoldiers() {
  return (
    <svg {...BOX} role="img" aria-label="Three White Soldiers — bullish continuation">
      <Candle cx={38} wickTop={115} bodyTop={125} bodyBottom={162} wickBottom={170} green={false} />
      <Candle cx={82} wickTop={105} bodyTop={115} bodyBottom={152} wickBottom={160} green={false} />
      {/* Three white soldiers: each opens within prior body, closes higher */}
      <Candle cx={145} wickTop={88} bodyTop={95} bodyBottom={148} wickBottom={154} green={true} />
      <Candle cx={198} wickTop={55} bodyTop={62} bodyBottom={115} wickBottom={120} green={true} />
      <Candle cx={253} wickTop={22} bodyTop={30} bodyBottom={82} wickBottom={88} green={true} />
      {/* Trend arrow */}
      <line x1="145" y1="82" x2="253" y2="18" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" />
      <text x="6" y="190" fill="#9ca3af" fontSize="9" {...FONT}>3 progressive green candles — each opens inside previous, closes higher</text>
      <text x="120" y="178" fill="#22c55e" fontSize="9" fontWeight="bold" {...FONT}>1</text>
      <text x="173" y="145" fill="#22c55e" fontSize="9" fontWeight="bold" {...FONT}>2</text>
      <text x="228" y="112" fill="#22c55e" fontSize="9" fontWeight="bold" {...FONT}>3</text>
    </svg>
  );
}

export function ThreeBlackCrows() {
  return (
    <svg {...BOX} role="img" aria-label="Three Black Crows — bearish continuation">
      <Candle cx={38} wickTop={38} bodyTop={48} bodyBottom={85} wickBottom={93} green={true} />
      <Candle cx={82} wickTop={42} bodyTop={52} bodyBottom={90} wickBottom={96} green={true} />
      {/* Three black crows: each opens within prior body, closes lower */}
      <Candle cx={145} wickTop={48} bodyTop={55} bodyBottom={108} wickBottom={115} green={false} />
      <Candle cx={198} wickTop={80} bodyTop={88} bodyBottom={142} wickBottom={148} green={false} />
      <Candle cx={253} wickTop={112} bodyTop={120} bodyBottom={175} wickBottom={180} green={false} />
      <line x1="145" y1="122" x2="253" y2="180" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
      <text x="6" y="195" fill="#9ca3af" fontSize="9" {...FONT}>3 progressive red candles — each opens inside previous, closes lower</text>
      <text x="120" y="125" fill="#ef4444" fontSize="9" fontWeight="bold" {...FONT}>1</text>
      <text x="173" y="158" fill="#ef4444" fontSize="9" fontWeight="bold" {...FONT}>2</text>
      <text x="228" y="190" fill="#ef4444" fontSize="9" fontWeight="bold" {...FONT}>3</text>
    </svg>
  );
}

export function PinBarInvalid() {
  return (
    <svg {...BOX} role="img" aria-label="Pin bar with no valid context — low probability setup">
      {/* No support/resistance zone — random area */}
      <text x="6" y="16" fill="#6b7280" fontSize="9" {...FONT}>No clear support or resistance zone</text>
      <Candle cx={35} wickTop={55} bodyTop={68} bodyBottom={102} wickBottom={112} green={false} />
      <Candle cx={75} wickTop={62} bodyTop={75} bodyBottom={108} wickBottom={118} green={true} />
      <Candle cx={115} wickTop={50} bodyTop={64} bodyBottom={98} wickBottom={108} green={false} />
      <Candle cx={155} wickTop={58} bodyTop={70} bodyBottom={104} wickBottom={114} green={true} />
      {/* "Pin bar" in middle of nowhere */}
      <Candle cx={200} wickTop={62} bodyTop={70} bodyBottom={82} wickBottom={118} green={true} />
      {/* Red X mark */}
      <line x1="188" y1="52" x2="212" y2="30" stroke="#ef4444" strokeWidth="2" />
      <line x1="212" y1="52" x2="188" y2="30" stroke="#ef4444" strokeWidth="2" />
      <text x="218" y="48" fill="#ef4444" fontSize="9" fontWeight="bold" {...FONT}>No zone!</text>
      <Candle cx={248} wickTop={60} bodyTop={72} bodyBottom={105} wickBottom={115} green={false} />
      <text x="6" y="185" fill="#ef4444" fontSize="9" fontWeight="bold" {...FONT}>Low probability: pin bar without a key level = weak setup</text>
    </svg>
  );
}

export function FVGBearish() {
  return (
    <svg {...BOX} role="img" aria-label="Bearish Fair Value Gap">
      <Candle cx={38} wickTop={42} bodyTop={55} bodyBottom={95} wickBottom={105} green={true} />
      <Candle cx={82} wickTop={35} bodyTop={48} bodyBottom={88} wickBottom={95} green={true} />
      {/* C1 (green) - before impulse */}
      <Candle cx={132} wickTop={42} bodyTop={55} bodyBottom={95} wickBottom={105} green={true} />
      {/* C1 low dashed line */}
      <line x1="112" y1="105" x2="278" y2="105" stroke="#6b7280" strokeWidth="0.8" strokeDasharray="4 3" />
      <text x="282" y="108" fill="#9ca3af" fontSize="8" {...FONT}>C1 Low</text>
      {/* C2 (large bearish impulse) */}
      <Candle cx={190} wickTop={42} bodyTop={52} bodyBottom={162} wickBottom={170} green={false} />
      {/* FVG zone: between C1 low (y=105) and C3 high (y=68) */}
      <rect x="112" y="68" width="180" height="37" fill="#ef4444" fillOpacity="0.18" />
      <text x="160" y="91" fill="#ef4444" fontSize="10" fontWeight="bold" {...FONT}>FVG Zone</text>
      {/* C3 high dashed line */}
      <line x1="112" y1="68" x2="278" y2="68" stroke="#6b7280" strokeWidth="0.8" strokeDasharray="4 3" />
      <text x="282" y="71" fill="#9ca3af" fontSize="8" {...FONT}>C3 High</text>
      {/* C3 (small green after impulse) */}
      <Candle cx={248} wickTop={68} bodyTop={78} bodyBottom={112} wickBottom={118} green={true} />
      <text x="120" y="122" fill="#9ca3af" fontSize="9" {...FONT}>C1</text>
      <text x="178" y="178" fill="#9ca3af" fontSize="9" {...FONT}>C2 (impulse ↓)</text>
      <text x="240" y="132" fill="#9ca3af" fontSize="9" {...FONT}>C3</text>
      <text x="6" y="195" fill="#9ca3af" fontSize="9" {...FONT}>{"C1 low > C3 high = bearish imbalance zone"}</text>
    </svg>
  );
}

export function CHoCHBullish() {
  return (
    <svg {...BOX} role="img" aria-label="CHoCH Bullish — downtrend structure shifts to upside">
      <polyline
        points="20,35 75,112 118,72 178,148 228,108 272,58"
        fill="none"
        stroke="#6b7280"
        strokeWidth="1.5"
      />
      {/* LH1 level dashed line at y=112 */}
      <line x1="75" y1="112" x2="310" y2="112" stroke="#22c55e" strokeWidth="1" strokeDasharray="5 3" />
      {/* Swing dots */}
      <circle cx={75} cy={112} r={4} fill="#ef4444" />
      <circle cx={118} cy={72} r={4} fill="#9ca3af" />
      <circle cx={178} cy={148} r={4} fill="#ef4444" />
      <circle cx={228} cy={108} r={4} fill="#9ca3af" />
      {/* CHoCH marker: segment (228,108)→(272,58) breaks above LH1 at y=112 */}
      {/* x at y=112 on segment (228,108)→(272,58): slope=(58-108)/(272-228)=-50/44, already above at 228 since 108<112 */}
      {/* Actually 108 < 112 means point (228,108) is ABOVE the line at y=112 in price terms */}
      {/* Wait: smaller y = higher price. 108 < 112 means HIGHER price. The CHoCH breaks above LH1 */}
      <circle cx={228} cy={108} r={7} fill="none" stroke="#22c55e" strokeWidth="2" />
      <text x="238" y="92" fill="#22c55e" fontSize="10" fontWeight="bold" {...FONT}>CHoCH</text>
      <line x1="240" y1="94" x2="234" y2="103" stroke="#22c55e" strokeWidth="1" />
      {/* Labels */}
      <text x="58" y="128" fill="#d1d5db" fontSize="9" {...FONT}>LH1</text>
      <text x="100" y="66" fill="#d1d5db" fontSize="9" {...FONT}>LL1</text>
      <text x="160" y="163" fill="#ef4444" fontSize="9" fontWeight="bold" {...FONT}>LH2</text>
      <text x="196" y="123" fill="#d1d5db" fontSize="9" {...FONT}>LL2 / new HL</text>
      <text x="258" y="52" fill="#22c55e" fontSize="9" fontWeight="bold" {...FONT}>New HH</text>
      <text x="6" y="190" fill="#9ca3af" fontSize="9" {...FONT}>Structure shifts bullish — downtrend may be reversing</text>
    </svg>
  );
}

export function Hammer() {
  return (
    <svg {...BOX} role="img" aria-label="Hammer — bullish reversal at support">
      <rect x="0" y="145" width="360" height="51" fill="#22c55e" fillOpacity="0.12" />
      <line x1="0" y1="145" x2="310" y2="145" stroke="#22c55e" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="141" fill="#22c55e" fontSize="9" {...FONT}>Support Zone</text>
      <Candle cx={40} wickTop={30} bodyTop={42} bodyBottom={82} wickBottom={92} green={false} />
      <Candle cx={85} wickTop={56} bodyTop={68} bodyBottom={108} wickBottom={120} green={false} />
      <Candle cx={132} wickTop={82} bodyTop={94} bodyBottom={132} wickBottom={142} green={false} />
      {/* Hammer: small body at top, long lower wick ≥2× */}
      <Candle cx={185} wickTop={83} bodyTop={85} bodyBottom={105} wickBottom={165} green={true} />
      <line x1="238" y1="95" x2="205" y2={95} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="240" y="98" fill="#d1d5db" fontSize="9" {...FONT}>Small body</text>
      <line x1="238" y1="155" x2="205" y2={155} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="240" y="158" fill="#d1d5db" fontSize="9" {...FONT}>Wick ≥ 2× body</text>
      <Candle cx={240} wickTop={55} bodyTop={65} bodyBottom={105} wickBottom={115} green={true} />
      <line x1="185" y1="74" x2="185" y2={56} stroke="#22c55e" strokeWidth="2" />
      <polygon points="185,48 179,58 191,58" fill="#22c55e" />
      <text x="6" y="196" fill="#9ca3af" fontSize="9" {...FONT}>Small body + long lower wick at support = bullish rejection</text>
    </svg>
  );
}

export function InvertedHammer() {
  return (
    <svg {...BOX} role="img" aria-label="Inverted Hammer — bullish reversal at support">
      <rect x="0" y="145" width="360" height="51" fill="#22c55e" fillOpacity="0.12" />
      <line x1="0" y1="145" x2="310" y2="145" stroke="#22c55e" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="141" fill="#22c55e" fontSize="9" {...FONT}>Support Zone</text>
      <Candle cx={40} wickTop={30} bodyTop={42} bodyBottom={82} wickBottom={92} green={false} />
      <Candle cx={85} wickTop={56} bodyTop={68} bodyBottom={108} wickBottom={120} green={false} />
      <Candle cx={132} wickTop={82} bodyTop={94} bodyBottom={132} wickBottom={142} green={false} />
      {/* Inverted Hammer: long upper wick, small body near bottom */}
      <Candle cx={185} wickTop={60} bodyTop={120} bodyBottom={140} wickBottom={142} green={true} />
      <line x1="238" y1="130" x2="205" y2={130} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="240" y="133" fill="#d1d5db" fontSize="9" {...FONT}>Small body</text>
      <line x1="238" y1="75" x2="205" y2={90} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="240" y="78" fill="#d1d5db" fontSize="9" {...FONT}>Long upper wick</text>
      <Candle cx={240} wickTop={95} bodyTop={105} bodyBottom={138} wickBottom={148} green={true} />
      <line x1="185" y1="48" x2="185" y2={30} stroke="#22c55e" strokeWidth="2" />
      <polygon points="185,22 179,32 191,32" fill="#22c55e" />
      <text x="6" y="196" fill="#9ca3af" fontSize="9" {...FONT}>Needs bullish confirmation candle to be valid</text>
    </svg>
  );
}

export function ShootingStar() {
  return (
    <svg {...BOX} role="img" aria-label="Shooting Star — bearish reversal at resistance">
      <rect x="0" y="5" width="360" height="48" fill="#ef4444" fillOpacity="0.12" />
      <line x1="0" y1="53" x2="310" y2="53" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="68" fill="#ef4444" fontSize="9" {...FONT}>Resistance Zone</text>
      <Candle cx={40} wickTop={122} bodyTop={108} bodyBottom={82} wickBottom={68} green={true} />
      <Candle cx={85} wickTop={96} bodyTop={80} bodyBottom={55} wickBottom={40} green={true} />
      <Candle cx={132} wickTop={72} bodyTop={58} bodyBottom={32} wickBottom={18} green={true} />
      {/* Shooting Star: long upper wick, small body near bottom, at resistance */}
      <Candle cx={185} wickTop={30} bodyTop={90} bodyBottom={110} wickBottom={112} green={false} />
      <line x1="238" y1="100" x2="205" y2={100} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="240" y="103" fill="#d1d5db" fontSize="9" {...FONT}>Small body</text>
      <line x1="238" y1="50" x2="205" y2={60} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="240" y="53" fill="#d1d5db" fontSize="9" {...FONT}>Long upper wick</text>
      <Candle cx={240} wickTop={58} bodyTop={66} bodyBottom={112} wickBottom={120} green={false} />
      <line x1="185" y1="122" x2="185" y2={142} stroke="#ef4444" strokeWidth="2" />
      <polygon points="185,149 179,139 191,139" fill="#ef4444" />
      <text x="6" y="196" fill="#9ca3af" fontSize="9" {...FONT}>Buyers pushed high but sellers overwhelmed — bearish rejection</text>
    </svg>
  );
}

export function HangingMan() {
  return (
    <svg {...BOX} role="img" aria-label="Hanging Man — bearish reversal at resistance">
      <rect x="0" y="5" width="360" height="48" fill="#ef4444" fillOpacity="0.12" />
      <line x1="0" y1="53" x2="310" y2="53" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 3" />
      <text x="6" y="68" fill="#ef4444" fontSize="9" {...FONT}>Resistance Zone</text>
      <Candle cx={40} wickTop={122} bodyTop={108} bodyBottom={82} wickBottom={68} green={true} />
      <Candle cx={85} wickTop={96} bodyTop={80} bodyBottom={55} wickBottom={40} green={true} />
      <Candle cx={132} wickTop={72} bodyTop={58} bodyBottom={32} wickBottom={18} green={true} />
      {/* Hanging Man: small body at top, long lower wick (same shape as hammer, bearish context) */}
      <Candle cx={185} wickTop={30} bodyTop={32} bodyBottom={52} wickBottom={112} green={false} />
      <line x1="238" y1="42" x2="205" y2={42} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="240" y="45" fill="#d1d5db" fontSize="9" {...FONT}>Small body</text>
      <line x1="238" y1="100" x2="205" y2={100} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="240" y="103" fill="#d1d5db" fontSize="9" {...FONT}>Long lower wick</text>
      <Candle cx={240} wickTop={36} bodyTop={46} bodyBottom={95} wickBottom={105} green={false} />
      <line x1="185" y1="122" x2="185" y2={142} stroke="#ef4444" strokeWidth="2" />
      <polygon points="185,149 179,139 191,139" fill="#ef4444" />
      <text x="6" y="196" fill="#9ca3af" fontSize="9" {...FONT}>Same shape as Hammer, but at resistance = bearish signal</text>
    </svg>
  );
}

export function StandardDoji() {
  return (
    <svg {...BOX} role="img" aria-label="Standard Doji — market indecision">
      <Candle cx={40} wickTop={42} bodyTop={52} bodyBottom={88} wickBottom={102} green={false} />
      <Candle cx={85} wickTop={70} bodyTop={82} bodyBottom={112} wickBottom={124} green={true} />
      <Candle cx={132} wickTop={55} bodyTop={68} bodyBottom={102} wickBottom={115} green={false} />
      {/* Standard Doji: open = close, balanced wicks */}
      <Candle cx={190} wickTop={42} bodyTop={93} bodyBottom={97} wickBottom={152} green={true} />
      <line x1="248" y1="93" x2="210" y2={95} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="250" y="89" fill="#f59e0b" fontSize="9" fontWeight="bold" {...FONT}>Open ≈ Close</text>
      <line x1="248" y1="52" x2="210" y2={55} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="250" y="55" fill="#d1d5db" fontSize="9" {...FONT}>Upper wick</text>
      <line x1="248" y1="142" x2="210" y2={145} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="250" y="145" fill="#d1d5db" fontSize="9" {...FONT}>Lower wick</text>
      <Candle cx={252} wickTop={65} bodyTop={78} bodyBottom={108} wickBottom={120} green={true} />
      <text x="6" y="185" fill="#9ca3af" fontSize="9" {...FONT}>Tiny body = buyers and sellers in perfect balance → indecision</text>
    </svg>
  );
}

export function LongLeggedDoji() {
  return (
    <svg {...BOX} role="img" aria-label="Long-legged Doji — extreme indecision">
      <Candle cx={40} wickTop={48} bodyTop={60} bodyBottom={92} wickBottom={105} green={true} />
      <Candle cx={85} wickTop={62} bodyTop={75} bodyBottom={108} wickBottom={122} green={false} />
      <Candle cx={132} wickTop={52} bodyTop={65} bodyBottom={98} wickBottom={112} green={true} />
      {/* Long-legged Doji: very long both wicks, tiny body in middle */}
      <Candle cx={190} wickTop={22} bodyTop={96} bodyBottom={100} wickBottom={172} green={true} />
      <line x1="248" y1="98" x2="210" y2={98} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="250" y="95" fill="#f59e0b" fontSize="9" fontWeight="bold" {...FONT}>Open ≈ Close</text>
      <line x1="248" y1="35" x2="210" y2={40} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="250" y="38" fill="#d1d5db" fontSize="9" {...FONT}>Long upper wick</text>
      <line x1="248" y1="158" x2="210" y2={155} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="250" y="158" fill="#d1d5db" fontSize="9" {...FONT}>Long lower wick</text>
      <Candle cx={252} wickTop={58} bodyTop={70} bodyBottom={102} wickBottom={115} green={false} />
      <text x="6" y="190" fill="#9ca3af" fontSize="9" {...FONT}>Extreme volatility, both sides tested, closed at the same level</text>
    </svg>
  );
}

export function BullishMarubozu() {
  return (
    <svg {...BOX} role="img" aria-label="Bullish Marubozu — strong buying pressure">
      <Candle cx={40} wickTop={90} bodyTop={102} bodyBottom={148} wickBottom={158} green={false} />
      <Candle cx={85} wickTop={65} bodyTop={78} bodyBottom={125} wickBottom={135} green={false} />
      <Candle cx={132} wickTop={88} bodyTop={98} bodyBottom={142} wickBottom={152} green={false} />
      {/* Bullish Marubozu: full body, no wicks */}
      <Candle cx={190} wickTop={50} bodyTop={50} bodyBottom={148} wickBottom={148} green={true} />
      <line x1="248" y1="55" x2="210" y2={55} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="250" y="58" fill="#22c55e" fontSize="9" fontWeight="bold" {...FONT}>Open = High</text>
      <text x="250" y="72" fill="#d1d5db" fontSize="9" {...FONT}>No upper wick</text>
      <line x1="248" y1="143" x2="210" y2={143} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="250" y="141" fill="#22c55e" fontSize="9" fontWeight="bold" {...FONT}>Close = Low</text>
      <text x="250" y="155" fill="#d1d5db" fontSize="9" {...FONT}>No lower wick</text>
      <Candle cx={252} wickTop={25} bodyTop={32} bodyBottom={118} wickBottom={128} green={true} />
      <line x1="190" y1="38" x2="190" y2={22} stroke="#22c55e" strokeWidth="2" />
      <polygon points="190,15 184,25 196,25" fill="#22c55e" />
      <text x="6" y="190" fill="#9ca3af" fontSize="9" {...FONT}>Buyers controlled entire session — open = high, close = low of candle</text>
    </svg>
  );
}

export function BearishMarubozu() {
  return (
    <svg {...BOX} role="img" aria-label="Bearish Marubozu — strong selling pressure">
      <Candle cx={40} wickTop={42} bodyTop={52} bodyBottom={100} wickBottom={110} green={true} />
      <Candle cx={85} wickTop={28} bodyTop={38} bodyBottom={82} wickBottom={92} green={true} />
      <Candle cx={132} wickTop={38} bodyTop={48} bodyBottom={92} wickBottom={102} green={true} />
      {/* Bearish Marubozu: full body, no wicks */}
      <Candle cx={190} wickTop={48} bodyTop={48} bodyBottom={152} wickBottom={152} green={false} />
      <line x1="248" y1="53" x2="210" y2={53} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="250" y="56" fill="#ef4444" fontSize="9" fontWeight="bold" {...FONT}>Open = High</text>
      <text x="250" y="70" fill="#d1d5db" fontSize="9" {...FONT}>No upper wick</text>
      <line x1="248" y1="147" x2="210" y2={147} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="250" y="145" fill="#ef4444" fontSize="9" fontWeight="bold" {...FONT}>Close = Low</text>
      <text x="250" y="158" fill="#d1d5db" fontSize="9" {...FONT}>No lower wick</text>
      <Candle cx={252} wickTop={48} bodyTop={55} bodyBottom={145} wickBottom={155} green={false} />
      <line x1="190" y1="164" x2="190" y2={182} stroke="#ef4444" strokeWidth="2" />
      <polygon points="190,189 184,179 196,179" fill="#ef4444" />
      <text x="6" y="196" fill="#9ca3af" fontSize="9" {...FONT}>Sellers controlled entire session — open = high, close = low of candle</text>
    </svg>
  );
}

export function HaramiCross() {
  return (
    <svg {...BOX} role="img" aria-label="Harami Cross — bearish reversal: doji inside previous bearish candle">
      {/* Context candles */}
      <Candle cx={30} wickTop={48} bodyTop={58} bodyBottom={95} wickBottom={105} green={true} />
      <Candle cx={68} wickTop={35} bodyTop={45} bodyBottom={82} wickBottom={92} green={true} />
      {/* Candle 1: large bullish candle */}
      <Candle cx={120} wickTop={28} bodyTop={38} bodyBottom={140} wickBottom={150} green={true} />
      {/* Candle 2: doji — open ≈ close, body sits inside candle 1's body */}
      <Candle cx={165} wickTop={60} bodyTop={85} bodyBottom={89} wickBottom={115} green={false} />
      {/* Dashed box showing containment */}
      <rect x="110" y="80" width="66" height="14" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 2" rx="2" />
      {/* Labels */}
      <line x1="222" y1="38" x2="140" y2={42} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="224" y="41" fill="#22c55e" fontSize="9" fontWeight="bold" {...FONT}>Large</text>
      <text x="224" y="51" fill="#22c55e" fontSize="9" {...FONT}>bullish candle</text>
      <line x1="222" y1="87" x2="185" y2={87} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="224" y="84" fill="#f59e0b" fontSize="9" fontWeight="bold" {...FONT}>Doji inside</text>
      <text x="224" y="94" fill="#f59e0b" fontSize="9" {...FONT}>Open ≈ Close</text>
      <line x1="222" y1="148" x2="140" y2={144} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="224" y="148" fill="#d1d5db" fontSize="9" {...FONT}>Candle 1 body</text>
      {/* Arrow pointing down */}
      <line x1="165" y1="122" x2="165" y2={142} stroke="#ef4444" strokeWidth="2" />
      <polygon points="165,149 159,139 171,139" fill="#ef4444" />
      <text x="6" y="185" fill="#9ca3af" fontSize="9" {...FONT}>Harami Cross: doji contained within prior candle → strong reversal signal</text>
    </svg>
  );
}

export function HaramiBullish() {
  return (
    <svg {...BOX} role="img" aria-label="Bullish Harami — small green candle inside prior large bearish candle">
      {/* Context candles */}
      <Candle cx={30} wickTop={95} bodyTop={105} bodyBottom={148} wickBottom={158} green={false} />
      <Candle cx={68} wickTop={82} bodyTop={92} bodyBottom={138} wickBottom={148} green={false} />
      {/* Candle 1: large bearish candle */}
      <Candle cx={120} wickTop={22} bodyTop={32} bodyBottom={155} wickBottom={165} green={false} />
      {/* Candle 2: small bullish inside candle 1 */}
      <Candle cx={165} wickTop={72} bodyTop={82} bodyBottom={110} wickBottom={120} green={true} />
      {/* Containment box */}
      <rect x="110" y="75" width="66" height="40" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 2" rx="2" />
      {/* Labels */}
      <line x1="222" y1="32" x2="140" y2={36} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="224" y="35" fill="#ef4444" fontSize="9" fontWeight="bold" {...FONT}>Large</text>
      <text x="224" y="45" fill="#ef4444" fontSize="9" {...FONT}>bearish candle</text>
      <line x1="222" y1="96" x2="185" y2={96} stroke="#9ca3af" strokeWidth="0.8" />
      <text x="224" y="93" fill="#22c55e" fontSize="9" fontWeight="bold" {...FONT}>Small bullish</text>
      <text x="224" y="103" fill="#22c55e" fontSize="9" {...FONT}>body inside</text>
      {/* Arrow pointing up */}
      <line x1="165" y1="126" x2="165" y2={146} stroke="#22c55e" strokeWidth="2" />
      <polygon points="165,119 159,129 171,129" fill="#22c55e" />
      <text x="6" y="185" fill="#9ca3af" fontSize="9" {...FONT}>Bullish Harami: small candle inside prior large bearish → potential reversal up</text>
    </svg>
  );
}

export function GenericCandleChart() {
  return (
    <svg {...BOX} role="img" aria-label="Candlestick price action chart">
      <Candle cx={28} wickTop={70} bodyTop={82} bodyBottom={118} wickBottom={128} green={false} />
      <Candle cx={62} wickTop={88} bodyTop={98} bodyBottom={130} wickBottom={140} green={false} />
      <Candle cx={96} wickTop={80} bodyTop={92} bodyBottom={125} wickBottom={135} green={true} />
      <Candle cx={130} wickTop={58} bodyTop={68} bodyBottom={102} wickBottom={112} green={true} />
      <Candle cx={164} wickTop={40} bodyTop={52} bodyBottom={85} wickBottom={95} green={true} />
      <Candle cx={198} wickTop={32} bodyTop={42} bodyBottom={78} wickBottom={90} green={false} />
      <Candle cx={232} wickTop={48} bodyTop={58} bodyBottom={95} wickBottom={106} green={true} />
      <Candle cx={266} wickTop={28} bodyTop={38} bodyBottom={72} wickBottom={82} green={true} />
      <Candle cx={305} wickTop={12} bodyTop={22} bodyBottom={58} wickBottom={68} green={true} />
      <text x="6" y="185" fill="#9ca3af" fontSize="9" {...FONT}>Price Action — reading candlestick patterns in context</text>
    </svg>
  );
}

export const diagramRegistry: Record<string, React.ComponentType> = {
  "pin-bar-bullish": PinBarBullish,
  "pin-bar-bearish": PinBarBearish,
  "engulfing-bullish": EngulfingBullish,
  "engulfing-bearish": EngulfingBearish,
  "inside-bar-setup": InsideBarSetup,
  "inside-bar-breakout": InsideBarBreakout,
  "bos-uptrend": BOSUptrend,
  "choch-bearish": CHoCHBearish,
  "fvg-bullish": FVGBullish,
  "doji-resistance": DojiAtResistance,
  "dragonfly-support": DragonflyAtSupport,
  "gravestone-resistance": GravestoneAtResistance,
  "morning-star": MorningStar,
  "evening-star": EveningStar,
  "tweezer-bottom": TweeterBottom,
  "tweezer-top": TweeterTop,
  "three-white-soldiers": ThreeWhiteSoldiers,
  "three-black-crows": ThreeBlackCrows,
  "pin-bar-invalid": PinBarInvalid,
  "fvg-bearish": FVGBearish,
  "choch-bullish": CHoCHBullish,
  "hammer": Hammer,
  "inverted-hammer": InvertedHammer,
  "shooting-star": ShootingStar,
  "hanging-man": HangingMan,
  "doji-standard": StandardDoji,
  "long-legged-doji": LongLeggedDoji,
  "marubozu-bullish": BullishMarubozu,
  "marubozu-bearish": BearishMarubozu,
  "harami-cross": HaramiCross,
  "harami-bullish": HaramiBullish,
  "generic-chart": GenericCandleChart,
};
