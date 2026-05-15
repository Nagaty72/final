'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import i18n from '../lib/i18n';
import { getPreferences, updatePreferences } from '../services/preferences.service';

function PreferenceSyncer() {
  const { i18n: i18nInstance } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [synced, setSynced] = useState(false);
  
  // Track last known server/sent values to prevent redundant updates and loops
  const lastState = useRef({ theme: null, language: null });

  // 1. Initial Sync from Backend
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ha_token') : null;
    if (!token || synced) return;

    const syncPrefs = async () => {
      try {
        const prefs = await getPreferences();
        if (prefs) {
          // Initialize tracking ref with backend values
          lastState.current = { 
            theme: prefs.preferred_theme || null, 
            language: prefs.preferred_language || null 
          };
          
          if (prefs.preferred_theme && prefs.preferred_theme !== theme) {
            setTheme(prefs.preferred_theme);
          }
          if (prefs.preferred_language && prefs.preferred_language !== i18nInstance.language) {
            i18nInstance.changeLanguage(prefs.preferred_language);
          }
        }
      } catch (err) {
        console.warn('[DEBUG] LanguageProvider: Backend preference sync failed, relying on service fallbacks.');
      } finally {
        setSynced(true);
      }
    };

    syncPrefs();
  }, [synced, setTheme, i18nInstance, theme]);

  // 2. Save Language Changes
  useEffect(() => {
    if (!synced) return;

    const handleLanguageChange = (lng) => {
      // Apply RTL/LTR
      document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;

      // Only update backend if it actually changed from what we last synced/sent
      if (lng !== lastState.current.language) {
        lastState.current.language = lng;
        updatePreferences({ language: lng });
      }
    };

    i18nInstance.on('languageChanged', handleLanguageChange);
    return () => {
      i18nInstance.off('languageChanged', handleLanguageChange);
    };
  }, [synced, i18nInstance]);

  // 3. Save Theme Changes (Debounced)
  useEffect(() => {
    if (!synced || !theme) return;

    // Skip if theme is already what we have on record
    if (theme === lastState.current.theme) return;

    const saveTheme = async () => {
      lastState.current.theme = theme;
      await updatePreferences({ theme });
    };

    const timer = setTimeout(saveTheme, 1000); // Debounce to prevent spamming during fast toggles
    return () => clearTimeout(timer);
  }, [synced, theme]);

  return null;
}

export function LanguageProvider({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Sync document direction with language on mount
    const lang = i18n.language || 'en';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <PreferenceSyncer />
      {children}
    </I18nextProvider>
  );
}
