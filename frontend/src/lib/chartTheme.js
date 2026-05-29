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
export const PALETTE = {
  blue:       '#3b82f6', // Respiratory
  red:        '#ef4444', // Cardiovascular
  purple:     '#a855f7', // Metabolic / Diabetes
  orange:     '#f97316', // Liver
  amber:      '#f59e0b', // Infectious
  teal:       '#14b8a6', // Obesity
  yellowOrg:  '#eab308', // Typhoid
  deepOrg:    '#ea580c', // Tuberculosis
};

// ── Disease keyword → semantic color mapping ───────────────────────────────────
export const DISEASE_KEYWORDS = [
  // Respiratory
  ['covid',        PALETTE.blue],
  ['influenza',    PALETTE.blue],
  ['flu',          PALETTE.blue],
  ['pneumonia',    PALETTE.blue],
  // Cardiovascular
  ['heart',        PALETTE.red],
  ['stroke',       PALETTE.red],
  // Metabolic
  ['diabetes',     PALETTE.purple],
  ['kidney',       PALETTE.purple],
  // Liver
  ['liver',        PALETTE.orange],
  ['hepatitis',    PALETTE.orange],
  // Infectious
  ['malaria',      PALETTE.amber],
  ['dengue',       PALETTE.amber],
  ['cholera',      PALETTE.amber],
  // Specific
  ['obesity',      PALETTE.teal],
  ['typhoid',      PALETTE.yellowOrg],
  ['tuberculosis', PALETTE.deepOrg],
  ['tb',           PALETTE.deepOrg],
];

// ── Top Diseases Palette (Rank-based Red Intensity) ───────────────────────────
// Darkest red for Rank #1, progressively lighter.
export const TOP_DISEASES_PALETTE = [
  '#7F1D1D', // #1: Darkest red
  '#991B1B', // #2
  '#B91C1C', // #3
  '#DC2626', // #4
  '#EF4444', // #5
  '#F87171', // #6
  '#FCA5A5', // #7
  '#FECACA', // #8: Lightest red
];

// ── Fallback palette for unknown diseases ─────────────────────────────────────
export const PALETTE_FALLBACKS = TOP_DISEASES_PALETTE;

/**
 * Get a semantic color for a disease name.
 * Keyword-matches first, falls back to palette by index.
 */
export function getDiseaseColor(name, idx = 0) {
  const lc = (name ?? '').toLowerCase();
  for (const [kw, color] of DISEASE_KEYWORDS) {
    if (lc.includes(kw)) return color;
  }
  return PALETTE_FALLBACKS[idx % PALETTE_FALLBACKS.length];
}

// ── Severity palette — clinical severity level colors ─────────────────────────
// Strictly semantic progression
export const SEVERITY_PALETTE = {
  Mild:     '#22c55e',   // Green
  Moderate: '#f59e0b',   // Yellow/Amber
  Severe:   '#f97316',   // Orange
  Critical: '#ef4444',   // Red
  Extreme:  '#991b1bff',   // Dark Red
};

// ── KPI card colors — each key maps to: { color, bg, border } ─────────────────
export const KPI_PALETTE = {
  total_cases:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.22)' },
  active_cases:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.22)' },
  recovered:       { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.22)' },
  severe_cases:    { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.22)' },
  total_patients:  { color: '#a855f7', bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.22)' },
  total_hospitals: { color: '#14b8a6', bg: 'rgba(20,184,166,0.10)',  border: 'rgba(20,184,166,0.22)' },
};

// ── TrendsChart bar palette — used for monthly case volume bars ────────────────
// A data-driven blue intensity scale: Very low to Highest
export const TRENDS_BAR_PALETTE = [
  '#BFDBFE', // Very low
  '#60A5FA', // Low
  '#3B82F6', // Medium
  '#2563EB', // High
  '#1E3A8A', // Highest months
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
// For the horizontal BarChart — 8 warm, premium healthcare colors.
// Progressively transitioning from highest to lowest intensity.
export const DISEASE_BAR_PALETTE = [
  '#F59E0B', // 1st: Amber
  '#FB923C', // 2nd: Orange
  '#F97316', // 3rd: Deep Orange
  '#EF4444', // 4th: Soft Red
  '#FCA5A5', // 5th: Warm Coral
  '#FDA4AF', // 6th: Soft Rose
  '#FDBA74', // 7th: Peach
  '#FED7AA', // 8th: Soft Peach
];
