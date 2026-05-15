import { getSupabase } from '../config/supabase.js';

/**
 * Get user preferences (theme, language)
 */
export const getPreferences = async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('preferred_theme, preferred_language')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'User preferences not found' });
    }

    return res.json({
      success: true,
      data: {
        theme: data.preferred_theme || 'dark',
        language: data.preferred_language || 'en',
      }
    });
  } catch (err) {
    console.error('Get preferences error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
  }
};

/**
 * Update user preferences (theme, language)
 */
export const updatePreferences = async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { theme, language } = req.body;
    const updatePayload = {};

    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      updatePayload.preferred_theme = theme;
    }

    if (language && ['en', 'ar'].includes(language)) {
      updatePayload.preferred_language = language;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', req.user.id)
      .select('preferred_theme, preferred_language')
      .single();

    if (error) {
      console.error('Update preferences DB error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update preferences' });
    }

    return res.json({
      success: true,
      data: {
        theme: data.preferred_theme || 'dark',
        language: data.preferred_language || 'en',
      }
    });
  } catch (err) {
    console.error('Update preferences error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
};
