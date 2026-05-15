import { api } from './api';

export async function getPreferences() {
  try {
    const res = await api.get('/api/v1/users/preferences');
    return res?.data || null;
  } catch (error) {
    console.error('Failed to fetch preferences:', error);
    return null;
  }
}

export async function updatePreferences({ theme, language }) {
  try {
    const body = {};
    if (theme) body.theme = theme;
    if (language) body.language = language;

    if (Object.keys(body).length === 0) return null;

    const res = await api.patch('/api/v1/users/preferences', body);
    return res?.data || null;
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return null;
  }
}

