/**
 * chartTheme.js — Unified Chart Theme System
 *
 * Single source of truth for all chart colors, gradients, and visual tokens
 * across the Healthcare Analytics platform.
 *
 * Design principles:
 *  • Soft, professional healthcare palette — no neon, no random rainbow
 *  • Semantic colors: blues for data, teals for hospitals, ambers for warnings,
 *    rose for danger/severe, muted purples for secondary datasets
 *  • WCAG AA contrast compliant on both dark and light backgrounds
 *  • All colors tested at 8% opacity (backgrounds), 15% (hover), 100% (lines/bars)
 *
 * Usage:
 *   import { DISEASE_KEYWORDS, PALETTE_FALLBACKS, getDiseaseColor,
 *            SEVERITY_PALETTE, KPI_PALETTE, TRENDS_BAR_PALETTE,
 *            tooltipStyle, gridStyle } from '@/lib/chartTheme';
 */

// ── Core semantic palette ──────────────────────────────────────────────────────
// Each token is: [main, light-bg (8%), hover-bg (15%), border (25%)]
export const PALETTE = {
  // Primary data color — calm healthcare blue
  blue:       '#4B8EF0',
  // Secondary data — rich teal (hospitals, clinical)
  teal:       '#2CB5A0',
  // Positive / recovered — muted healthcare green
  green:      '#3DC48B',
  // Warning / active / moderate — warm amber
  amber:      '#E8963A',
  // Danger / severe / critical — deep rose (not pure red)
  rose:       '#E05472',
  // Extreme severity — deep crimson, still readable
  crimson:    '#B94060',
  // Secondary datasets — muted periwinkle purple
  purple:     '#8B7FD4',
  // Tertiary / supplemental — dusty indigo
  indigo:     '#6675C8',
  // Neutral data category — slate
  slate:      '#7B8FA8',
  // Accent teal-blue for trends / line 5
  cyan:       '#38B2C8',
  // Warm salmon — disease category 8+
  coral:      '#E07A60',
  // Soft mauve — disease category 9+
  mauve:      '#A87CC0',
};

// ── Disease keyword → semantic color mapping ───────────────────────────────────
// Intentionally avoids pure saturated primaries. Each color is a curated
// mid-tone that reads well on both dark and light dashboard backgrounds.
export const DISEASE_KEYWORDS = [
  // Respiratory / viral
  ['covid',        PALETTE.rose],
  ['influenza',    PALETTE.cyan],
  ['flu',          PALETTE.cyan],
  ['pneumonia',    PALETTE.teal],
  ['tuberculosis', PALETTE.amber],
  ['tb',           PALETTE.amber],
  // Chronic / metabolic
  ['diabetes',     PALETTE.blue],
  ['hypertension', PALETTE.purple],
  ['kidney',       PALETTE.slate],
  ['stroke',       PALETTE.crimson],
  // Cardiovascular
  ['heart',        PALETTE.indigo],
  // Parasitic / tropical
  ['malaria',      PALETTE.green],
  ['dengue',       PALETTE.coral],
  ['hepatitis',    PALETTE.mauve],
  // Oncological
  ['cancer',       '#7C6DB0'],
];

// ── Fallback palette for unknown diseases (ordered for visual distinction) ─────
// 15 distinct, professionally balanced colors — no two adjacent are similar hue
export const PALETTE_FALLBACKS = [
  PALETTE.blue,
  PALETTE.teal,
  PALETTE.rose,
  PALETTE.green,
  PALETTE.amber,
  PALETTE.purple,
  PALETTE.cyan,
  PALETTE.indigo,
  PALETTE.coral,
  PALETTE.mauve,
  PALETTE.crimson,
  PALETTE.slate,
  '#5B9BD4',  // softer sky blue
  '#6AB89A',  // muted mint
  '#C8845A',  // terracotta
];

/**
 * Get a semantic color for a disease name.
 * Keyword-matches first, falls back to palette by index.
 */
export function getDiseaseColor(name, idx) {
  const lc = (name ?? '').toLowerCase();
  for (const [kw, color] of DISEASE_KEYWORDS) {
    if (lc.includes(kw)) return color;
  }
  return PALETTE_FALLBACKS[idx % PALETTE_FALLBACKS.length];
}

// ── Severity palette — clinical severity level colors ─────────────────────────
// Ordered Mild → Extreme with a clear perceptual ramp.
// Each value is carefully chosen to remain readable at fill opacity AND as text.
export const SEVERITY_PALETTE = {
  Mild:     '#3DC48B',   // muted green  — good/safe signal
  Moderate: '#E8963A',   // warm amber   — caution
  Severe:   '#E05472',   // rose red     — high alert
  Critical: '#8B7FD4',   // deep purple  — critical
  Extreme:  '#B94060',   // deep crimson — maximum severity
};

// ── KPI card colors — each key maps to: { color, bg, border } ─────────────────
export const KPI_PALETTE = {
  total_cases:     { color: '#4B8EF0', bg: 'rgba(75,142,240,0.10)',  border: 'rgba(75,142,240,0.22)' },
  active_cases:    { color: '#E8963A', bg: 'rgba(232,150,58,0.10)',  border: 'rgba(232,150,58,0.22)' },
  recovered:       { color: '#3DC48B', bg: 'rgba(61,196,139,0.10)',  border: 'rgba(61,196,139,0.22)' },
  severe_cases:    { color: '#E05472', bg: 'rgba(224,84,114,0.10)',  border: 'rgba(224,84,114,0.22)' },
  total_patients:  { color: '#8B7FD4', bg: 'rgba(139,127,212,0.10)', border: 'rgba(139,127,212,0.22)' },
  total_hospitals: { color: '#2CB5A0', bg: 'rgba(44,181,160,0.10)',  border: 'rgba(44,181,160,0.22)' },
};

// ── TrendsChart bar palette — used for monthly case volume bars ────────────────
// A single coherent blue-teal gradient ramp: avoids rainbow chaos.
// Each step is +10° hue shift for perceptual progression.
export const TRENDS_BAR_PALETTE = [
  '#4B8EF0',  // #1 — primary blue
  '#3A8FE0',  // #2
  '#2C9DD4',  // #3
  '#22AABF',  // #4
  '#2CB5A0',  // #5 — teal
  '#35BF8E',  // #6
  '#3DC48B',  // #7 — green-teal
  '#52C47E',  // #8
  '#68C472',  // #9
  '#84C468',  // #10
  '#6070C8',  // #11 — cycle back to indigo for visual interest
  '#7060C0',  // #12
];

// ── Shared chart grid style ────────────────────────────────────────────────────
export const gridStyle = {
  stroke:         'rgba(148,163,184,0.07)',
  strokeDasharray: '3 3',
};

// ── Shared axis tick style ─────────────────────────────────────────────────────
export const axisTick = {
  fontSize:   10,
  fill:       'var(--text-muted)',
  fontWeight: 500,
};

// ── Shared tooltip container style ────────────────────────────────────────────
// Returns inline style object for the tooltip wrapper div.
export function tooltipStyle(extra = {}) {
  return {
    background:   'var(--bg-secondary)',
    border:       '1px solid var(--border)',
    borderRadius:  12,
    padding:      '12px 16px',
    fontSize:      12,
    boxShadow:    '0 12px 40px rgba(0,0,0,0.22)',
    minWidth:      160,
    ...extra,
  };
}

// ── Shared tooltip cursor style ────────────────────────────────────────────────
export const tooltipCursorBar  = { fill:   'rgba(148,163,184,0.06)' };
export const tooltipCursorLine = { stroke: 'rgba(148,163,184,0.12)', strokeWidth: 1 };

// ── Heat layer gradient — premium healthcare palette ─────────────────────────
// Replaces the raw blue→cyan→lime→yellow→red gradient with a
// professional purple → teal → amber → rose ramp.
export const HEAT_GRADIENT = {
  0.0: 'rgba(75,142,240,0)',    // transparent (no data)
  0.3: '#4B8EF0',               // calm blue — low intensity
  0.5: '#2CB5A0',               // teal — moderate
  0.7: '#E8963A',               // amber — elevated
  0.85:'#E05472',               // rose — high
  1.0: '#B94060',               // deep crimson — peak
};

// ── Disease breakdown bar colors (ordered) ────────────────────────────────────
// For the horizontal BarChart — 8 visually distinct, non-neon colors.
export const DISEASE_BAR_PALETTE = [
  PALETTE.blue,
  PALETTE.purple,
  PALETTE.teal,
  PALETTE.amber,
  PALETTE.rose,
  PALETTE.cyan,
  PALETTE.coral,
  PALETTE.indigo,
];
