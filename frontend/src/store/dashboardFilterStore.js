/**
 * Zustand global store for dashboard filters.
 *
 * Single source of truth for: city, disease (array), gender, severity, timeRange.
 * 
 * All chart components subscribe with shallow-equality selectors to prevent
 * unnecessary re-renders when unrelated filter slices change.
 */
import { create } from 'zustand';

// ── Debounce helper ──────────────────────────────────────────────────────────
const timers = {};
function debounce(key, fn, delay = 300) {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(fn, delay);
}

// ── Store ────────────────────────────────────────────────────────────────────
export const useDashboardFilterStore = create((set, get) => ({
  // Raw filter values
  city:      '',
  disease:   [], // Array of selected disease names
  gender:    '',
  severity:  '', // Integer string '1'-'5' or empty
  timeRange: '1y',   // default: last year

  // Pending flag — true while debounce is in flight
  filtersChanging: false,

  /**
   * setFilter — updates a single filter key.
   */
  setFilter: (key, value) => {
    set({ [key]: value, filtersChanging: true });

    debounce('filters', () => {
      set({ filtersChanging: false });
    }, 300);
  },

  /** Reset all filters to default state */
  resetFilters: () => {
    set({
      city: '', disease: [], gender: '', severity: '',
      timeRange: '1y', filtersChanging: false,
    });
  },

  /**
   * getApiFilters — returns the clean filter object to pass to API calls.
   * Strips empty strings so api.get() doesn't send empty params.
   */
  getApiFilters: () => {
    const { city, disease, gender, severity, timeRange } = get();
    return {
      city:      city      || undefined,
      disease:   disease.length > 0 ? disease.join(',') : undefined,
      gender:    gender    || undefined,
      severity:  severity  || undefined,
      timeRange: timeRange || undefined,
    };
  },
}));


