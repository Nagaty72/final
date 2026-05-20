'use client';

import React, { useEffect, useState, useRef } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import i18n from '../lib/i18n';
import { getPreferences, updatePreferences } from '../services/preferences.service';

function PreferenceSyncer() {
  const { i18n: i18nInstance } = useTranslation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [synced, setSynced] = useState(false);
  
  const isSyncingRef = useRef(false);
  const lastState = useRef({ theme: null, language: null });

  // 1. Initial Sync from Backend
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ha_token') : null;
    if (!token || synced || isSyncingRef.current) return;

    const ctrl = new AbortController();

    const syncPrefs = async () => {
      isSyncingRef.current = true;
      try {
        const prefs = await getPreferences();
        if (ctrl.signal.aborted) return;

        if (prefs) {
          lastState.current = { 
            theme: prefs.preferred_theme || null, 
            language: prefs.preferred_language || null 
          };
          
          if (prefs.preferred_theme && prefs.preferred_theme !== theme && prefs.preferred_theme !== 'system') {
            setTheme(prefs.preferred_theme);
          }
          if (prefs.preferred_language && prefs.preferred_language !== i18nInstance.language) {
            i18nInstance.changeLanguage(prefs.preferred_language);
          }
        }
      } catch (err) {
        console.warn('[DEBUG] LanguageProvider: Backend preference sync failed.');
      } finally {
        if (!ctrl.signal.aborted) {
          setSynced(true);
          isSyncingRef.current = false;
        }
      }
    };

    syncPrefs();
    return () => ctrl.abort();
  }, [synced, setTheme, i18nInstance, theme]);

  // 2. Save Language Changes
  useEffect(() => {
    if (!synced) return;

    const handleLanguageChange = (lng) => {
      document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;

      if (lng === lastState.current.language) return;

      if (!isSyncingRef.current) {
        lastState.current.language = lng;
        // Fire and forget without blocking rendering
        updatePreferences({ language: lng }).catch(() => {});
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

    if (theme === lastState.current.theme) return;

    const timer = setTimeout(() => {
      if (theme !== lastState.current.theme && !isSyncingRef.current) {
        lastState.current.theme = theme;
        updatePreferences({ theme }).catch(() => {});
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [synced, theme]);

  return null;
}

export function LanguageProvider({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
