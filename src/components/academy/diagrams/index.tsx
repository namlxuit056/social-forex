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
};
