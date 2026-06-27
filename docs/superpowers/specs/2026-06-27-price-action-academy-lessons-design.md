# Price Action Academy Lessons with SVG Illustrations

**Date:** 2026-06-27  
**Status:** Approved

## Goal

Add 4 new intermediate/advanced price action lessons to the Academy, each with inline SVG diagrams that illustrate concepts visually. The diagrams are rendered directly in the lesson body using a custom `[diagram:name]` marker syntax.

## New Lessons

| Slug | Level | SVG Diagrams |
|---|---|---|
| `price-action-pin-bar` | intermediate | `pin-bar-bullish`, `pin-bar-bearish` |
| `price-action-engulfing` | intermediate | `engulfing-bullish`, `engulfing-bearish` |
| `price-action-inside-bar` | intermediate | `inside-bar-setup`, `inside-bar-breakout` |
| `price-action-bos-choch-fvg` | advanced | `bos-uptrend`, `choch-bearish`, `fvg-bullish` |

Each lesson has bilingual content (vi + en) and one quiz question.

## Architecture

### 1. SVG Diagram Components

**File:** `src/components/academy/diagrams/index.tsx`

- Named React functional components for each diagram, each returning an `<svg>` element
- Diagrams are simple, clean candlestick/price-action schematics (no real chart data)
- Components exported individually and via a registry object:
  ```ts
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
  ```
- All diagrams use Tailwind-compatible stroke/fill colors (currentColor or explicit hex matching dark theme)
- Each SVG has `viewBox`, `width="100%"`, `role="img"`, `aria-label` for accessibility

### 2. Body Renderer Extension

**File:** `src/app/[locale]/academy/[slug]/page.tsx`

Add a new case to the line-by-line renderer:
```ts
if (line.startsWith("[diagram:") && line.endsWith("]")) {
  const name = line.slice(9, -1); // extract name
  const DiagramComponent = diagramRegistry[name];
  if (!DiagramComponent) return null;
  return (
    <div key={i} className="my-6 rounded-lg border border-border bg-card/50 p-4">
      <DiagramComponent />
    </div>
  );
}
```

The `diagramRegistry` import is added at the top of the page file.

### 3. Lesson Content

**File:** `src/lib/content/academy.ts`

4 new `lesson()` entries appended to `localizedLessons`. Body strings use `[diagram:name]` markers on their own lines, placed directly after the heading they illustrate. Example:

```
## Bullish pin bar

[diagram:pin-bar-bullish]

A bullish pin bar has a long lower wick...
```

### 4. Quiz Questions

**File:** `src/lib/content/academy-quiz.ts`

4 new entries in `academyQuiz`, one per lesson slug. Questions test visual recognition and context application.

## SVG Diagram Specifications

Each diagram is a minimal schematic (~300×200px viewBox) using:
- Dark-compatible colors: candle bodies in `#22c55e` (green up), `#ef4444` (red down), levels/zones in `#6b7280`/`#374151`
- Thin white/gray zone bands for support/resistance
- Arrow indicators where relevant (entry direction, stop zone)
- Text labels in the diagram (small, 10–12px) using `fill="currentColor"`

**Diagrams needed (9 total):**

1. `pin-bar-bullish` — Long lower wick candle at support zone, arrow pointing up
2. `pin-bar-bearish` — Long upper wick candle at resistance zone, arrow pointing down
3. `engulfing-bullish` — Small red candle followed by larger green candle that fully covers it
4. `engulfing-bearish` — Small green candle followed by larger red candle that fully covers it
5. `inside-bar-setup` — Mother bar + inside bar inside it, compression label
6. `inside-bar-breakout` — Inside bar then breakout candle above/below mother bar
7. `bos-uptrend` — Series of HH+HL then a break above previous HH with "BOS" label
8. `choch-bearish` — Uptrend then a lower low breaking the HL, "CHoCH" label
9. `fvg-bullish` — 3-candle sequence with gap between candle 1 high and candle 3 low, "FVG" zone shaded

## Files Changed

| File | Change |
|---|---|
| `src/components/academy/diagrams/index.tsx` | **New** — 9 SVG components + registry |
| `src/app/[locale]/academy/[slug]/page.tsx` | Add `[diagram:...]` case to body renderer |
| `src/lib/content/academy.ts` | 4 new lesson entries |
| `src/lib/content/academy-quiz.ts` | 4 new quiz questions |

No database changes. No new routes. No nav changes needed (academy is an existing route).

## Out of Scope

- Interactive/animated diagrams
- User-uploadable images
- Exercises with graded drawing tools
- Chart-img API integration
