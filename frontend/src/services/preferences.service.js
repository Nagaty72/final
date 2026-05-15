import { api } from './api';

const DEFAULT_PREFS = {
  preferred_theme: 'dark',
  preferred_language: 'en'
};

export async function getPreferences() {
  console.log('[DEBUG] Fetching preferences...');
  try {
    const res = await api.get('/api/v1/users/preferences');
    
    // The backend returns { success: true, data: { theme, language } }
    // We map it to the preferred_* naming requested for the frontend
    const prefs = {
      preferred_theme: res?.data?.theme || DEFAULT_PREFS.preferred_theme,
      preferred_language: res?.data?.language || DEFAULT_PREFS.preferred_language
    };

    console.log('[DEBUG] Fetched preferences success:', prefs);
    // Cache in localStorage
    localStorage.setItem('ha_prefs', JSON.stringify(prefs));
    return prefs;
  } catch (error) {
    const is401 = error.message?.includes('401') || error.response?.status === 401;
    console.error(`[DEBUG] Failed to fetch preferences (401: ${is401}):`, error);

    // Fallback 1: LocalStorage
    const cached = localStorage.getItem('ha_prefs');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        console.log('[DEBUG] Fallback to cached preferences:', parsed);
        return parsed;
      } catch (e) {
        console.error('[DEBUG] Failed to parse cached preferences:', e);
      }
    }

    // Fallback 2: Default values
    console.log('[DEBUG] Fallback to default preferences:', DEFAULT_PREFS);
    return DEFAULT_PREFS;
  }
}

export async function updatePreferences({ theme, language }) {
  console.log('[DEBUG] Updating preferences:', { theme, language });
  try {
    const body = {};
    if (theme) body.theme = theme;
    if (language) body.language = language;

    if (Object.keys(body).length === 0) return null;

    const res = await api.patch('/api/v1/users/preferences', body);
    
    const updatedPrefs = {
      preferred_theme: res?.data?.theme || theme,
      preferred_language: res?.data?.language || language
    };

    console.log('[DEBUG] Update preferences success:', updatedPrefs);
    localStorage.setItem('ha_prefs', JSON.stringify(updatedPrefs));
    return updatedPrefs;
  } catch (error) {
    console.error('[DEBUG] Failed to update preferences (saving locally anyway):', error);
    
    // Even if API fails, save to local storage so the UI remains consistent
    const current = JSON.parse(localStorage.getItem('ha_prefs') || JSON.stringify(DEFAULT_PREFS));
    const merged = {
      ...current,
      ...(theme && { preferred_theme: theme }),
      ...(language && { preferred_language: language })
    };
    localStorage.setItem('ha_prefs', JSON.stringify(merged));
    return merged;
  }
}

