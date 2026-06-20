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
  // Raw UI filter values (used by FilterBar)
  uiCity:      '',
  uiDisease:   [],
  uiGender:    '',
  uiSeverity:  '',
  uiStatus:    '',
  uiHospital:  '',
  uiTimeRange: '6m',

  // Applied filter values (used by chart widgets)
  city:      '',
  disease:   [], 
  gender:    '',
  severity:  '', 
  status:    '',
  hospital:  '',
  timeRange: '6m',   // default: last 6 months

  // Pending flag — true while debounce is in flight
  filtersChanging: false,

  /**
   * setFilter — updates a single filter key.
   */
  setFilter: (key, value) => {
    set({ [key]: value, filtersChanging: true });

    debounce('filters', () => {
      const state = get();
      set({
        city:      state.uiCity,
        disease:   state.uiDisease,
        gender:    state.uiGender,
        severity:  state.uiSeverity,
        status:    state.uiStatus,
        hospital:  state.uiHospital,
        timeRange: state.uiTimeRange,
        filtersChanging: false,
      });
      console.log("Store Hospital", get().hospital);
    }, 600); // 600ms debounce before triggering fetches
  },

  /** Reset all filters to default state */
  resetFilters: () => {
    set({
      uiCity: '', uiDisease: [], uiGender: '', uiSeverity: '', uiStatus: '', uiHospital: '', uiTimeRange: '6m',
      city: '', disease: [], gender: '', severity: '', status: '', hospital: '', timeRange: '6m',
      filtersChanging: false,
    });
  },

  /**
   * getApiFilters — returns the clean filter object to pass to API calls.
   * Strips empty strings so api.get() doesn't send empty params.
   */
  getApiFilters: () => {
    const { city, disease, gender, severity, status, hospital, timeRange } = get();
    return {
      city:      city      || undefined,
      disease:   disease.length > 0 ? disease.join(',') : undefined,
      gender:    gender    || undefined,
      severity:  severity  || undefined,
      status:    status    || undefined,
      hospital:  hospital  || undefined,
      timeRange: timeRange || undefined,
    };
  },
}));


