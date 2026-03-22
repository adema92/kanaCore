/**
 * Overrides for stroke-order SVG when KanjiVG shape does not match app list typography.
 * Keys: single hiragana character. Values: full SVG markup.
 * The styles (stroke color, width, number color) are injected by StrokeOrderSvg.vue.
 */
export const HIRAGANA_STROKE_OVERRIDES = {
  /**
   * Gothic り: two strokes at same top level.
   * Stroke 1: short left element — goes down ~half the height, hooks leftward at the bottom.
   * Stroke 2: longer right element — mostly vertical with a very slight outward bow, ends with small leftward curve.
   * Proportions traced from the Gothic/UI glyph used in the grid cells.
   */
  り: `<svg xmlns="http://www.w3.org/2000/svg" width="109" height="109" viewBox="0 0 109 109">
<g id="kvg:StrokePaths_0308a">
  <path id="kvg:0308a-s1" fill="none"
    d="M 40 24 C 40 34 39 42 38 50 C 37 55 34 58 28 59 C 23 59 19 57 18 54" />
  <path id="kvg:0308a-s2" fill="none"
    d="M 64 22 C 65 32 66 46 65 60 C 64 70 61 80 58 85 C 55 90 51 91 49 89" />
</g>
<g id="kvg:StrokeNumbers_0308a">
  <text transform="translate(20 24)">1</text>
  <text transform="translate(60 22)">2</text>
</g>
</svg>`,
}
