import { diagramRegistry } from "@/components/academy/diagrams";

function patternKeyForSlug(slug: string): string {
  const s = slug.toLowerCase();

  // Doji variants — check specific before generic
  if (s.includes("gravestone")) return "gravestone-resistance";
  if (s.includes("dragonfly")) return "dragonfly-support";
  if (s.includes("long-legged") || s.includes("long_legged")) return "long-legged-doji";
  if (s.includes("doji")) return "doji-standard";

  // Hammer family
  if (s.includes("inverted") && s.includes("hammer")) return "inverted-hammer";
  if (s.includes("hammer")) return "hammer";
  if (s.includes("shooting") && s.includes("star")) return "shooting-star";
  if (s.includes("hanging") && s.includes("man")) return "hanging-man";

  // Engulfing
  if (s.includes("engulfing") && (s.includes("bull") || s.includes("bullish")))
    return "engulfing-bullish";
  if (s.includes("engulfing") && (s.includes("bear") || s.includes("bearish")))
    return "engulfing-bearish";
  if (s.includes("engulfing")) return "engulfing-bullish";

  // Multi-candle patterns
  if (s.includes("morning") && s.includes("star")) return "morning-star";
  if (s.includes("evening") && s.includes("star")) return "evening-star";
  if (s.includes("three") && (s.includes("white") || s.includes("soldier")))
    return "three-white-soldiers";
  if (s.includes("three") && (s.includes("black") || s.includes("crow")))
    return "three-black-crows";

  // Marubozu
  if (s.includes("marubozu") && (s.includes("bear") || s.includes("bearish")))
    return "marubozu-bearish";
  if (s.includes("marubozu")) return "marubozu-bullish";

  // Tweezer
  if (s.includes("tweezer") && (s.includes("bottom") || s.includes("bull")))
    return "tweezer-bottom";
  if (s.includes("tweezer") && (s.includes("top") || s.includes("bear")))
    return "tweezer-top";
  if (s.includes("tweezer")) return "tweezer-bottom";

  // Pin bar
  if (s.includes("pin") && (s.includes("bear") || s.includes("bearish"))) return "pin-bar-bearish";
  if (s.includes("pin")) return "pin-bar-bullish";

  // Smart money concepts
  if (s.includes("fvg") || (s.includes("fair") && s.includes("value"))) {
    return s.includes("bear") ? "fvg-bearish" : "fvg-bullish";
  }
  if (s.includes("bos") || (s.includes("break") && s.includes("structure")))
    return "bos-uptrend";
  if (s.includes("choch") || (s.includes("change") && s.includes("character"))) {
    return s.includes("bull") ? "choch-bullish" : "choch-bearish";
  }
  if (s.includes("inside")) return "inside-bar-setup";

  return "generic-chart";
}

export function PatternDiagram({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const key = patternKeyForSlug(slug);
  const Diagram = diagramRegistry[key] ?? diagramRegistry["generic-chart"];
  return (
    <div className={className}>
      <Diagram />
    </div>
  );
}
